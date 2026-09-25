import * as THREE from 'three'
import type { MinimapMapInfo, WmoDoodadSet, WmoModel, WmoPlacement } from '../types'
import { loadAdtWmoPlacements, loadGlobalWmoPlacements, loadWmoModel } from '../service'
import type { SceneAssets } from '@core/wow/SceneAssets'
import { buildWmoTemplate } from '@core/wow/wmoGeometry'
import { cullModel, type SceneModel } from './ModelCulling'
import type { InstallQueue } from './InstallQueue'
import { buildLiquidGeometry, liquidAbove, type LiquidSurfaces } from './LiquidSurfaces'
import { TileWindow, type TileCoord } from './TileWindow'
import { WmoCollider } from './WmoCollider'

/**
 * Streams WMO buildings/structures around the camera to complement
 * @wowserhq/scene's terrain, which renders neither WMOs nor water.
 *
 * Placements come from ADT tiles (outdoor world, streamed) and the WDT
 * (WMO-only maps like dungeons, loaded once). Each references a WMO whose
 * geometry (textured batches) + interior doodad sets (M2) are fetched once and
 * reused. The world transform of a placement uses @wowserhq/format's proven
 * MODF/MDDF convention so WMOs share the terrain's coordinate frame.
 *
 * A WMO that straddles tiles is listed in the MODF of every tile it overlaps —
 * the Stormwind city shell in nine of them — and the client draws it once. So
 * an ADT placement is built once, whichever tile lists it first, and the tiles
 * listing it only hold a reference to it (see `TilePlacement`).
 *
 * Textures and interior M2s come from the scene-wide `SceneAssets`, so a WMO
 * shares its decoded BLPs and model geometry with the terrain and the creature
 * spawns instead of keeping a private copy of each. The WMO's own liquid
 * (canals, fountains, instance pools) draws with the same `LiquidSurfaces` as
 * the terrain's water, as part of the template every placement clones.
 *
 * Nothing here touches the scene graph directly. Building a template, cloning
 * it per placement and adding the result are all main-thread work, and a city
 * tile holds dozens of placements — doing them as they resolve put a whole
 * tile's cost in one frame. They go through the shared `InstallQueue` instead.
 */

/** ADT tiles loaded around the camera (Chebyshev radius). WMOs are big. */
const LOAD_RADIUS = 1
/** Tiles are only freed one ring further out; see `TileWindow`. */
const KEEP_RADIUS = 2
/** Half the map extent (34133.332 / 2), used to normalize MODF positions. */
const MAP_CORNER = 34133.332 / 2

/**
 * An ADT placement, shared by every resident tile that lists it.
 *
 * Drawing one per listing drew the Stormwind shell nine times over: nine
 * times the draw calls, and nine stacked copies of every translucent surface,
 * its canals included, which read as opaque.
 */
interface TilePlacement {
  /** Null until the install queue has built it (or for good if it failed). */
  object: THREE.Object3D | null
  /** Keys of the resident tiles that list it; it goes with the last one. */
  tiles: Set<string>
}

/**
 * What makes two MODF entries the same placement. The client matches them on
 * their uniqueId; the entries it matches are copies, so they agree on
 * everything this key holds too, and two that agree on all of it would draw
 * the same pixels anyway.
 */
function placementKey(p: WmoPlacement): string {
  return JSON.stringify([p.model.toLowerCase(), p.position, p.rotation, p.doodadSet])
}

interface LoadedWmo {
  /** Batch + liquid geometry group; cloned per placement (geometry/materials shared). */
  template: THREE.Group
  doodadSets: WmoDoodadSet[]
  /** Camera collision, built the first time the camera collides near it. */
  collider: WmoCollider | null
}

/**
 * MODF/MDDF position [X,Y,Z] → world (== three) position. An ADT placement
 * counts from the map corner; the WDT's global WMO counts from the world
 * origin — the server's vmap extractor adds the half extent back to it, and
 * every WMO-only map stores [0,0,0] there, so its spawns sit around 0,0.
 */
function placementPosition(p: [number, number, number], global: boolean): THREE.Vector3 {
  const corner = global ? 0 : MAP_CORNER
  return new THREE.Vector3(corner - p[2], corner - p[0], p[1])
}

/**
 * MODF/MDDF Euler (degrees) → quaternion, replicating gl-matrix
 * `quat.fromEuler(rot.z, rot.x, rot.y + 180)` (order "zyx"), the exact
 * transform @wowserhq/format applies to placements.
 */
function placementQuaternion(rot: [number, number, number]): THREE.Quaternion {
  const half = Math.PI / 360
  const x = rot[2] * half
  const y = rot[0] * half
  const z = (rot[1] + 180) * half
  const sx = Math.sin(x)
  const cx = Math.cos(x)
  const sy = Math.sin(y)
  const cy = Math.cos(y)
  const sz = Math.sin(z)
  const cz = Math.cos(z)
  return new THREE.Quaternion(
    sx * cy * cz - cx * sy * sz,
    cx * sy * cz + sx * cy * sz,
    cx * cy * sz - sx * sy * cz,
    cx * cy * cz + sx * sy * sz,
  )
}

export class WmoManager {
  readonly root = new THREE.Group()

  readonly #assets: SceneAssets
  readonly #liquids: LiquidSurfaces
  /** Scratch list for the submerged test, refilled each call. */
  readonly #liquidScratch: THREE.Object3D[] = []
  #modelCache = new Map<string, Promise<LoadedWmo>>()
  /** Resident tiles, each with the keys of the placements it lists. */
  #tiles = new Map<string, string[]>()
  /** ADT placements by `placementKey`, each built once for all its tiles. */
  #placements = new Map<string, TilePlacement>()
  /** Placements from the WDT (WMO-only maps): loaded once, never evicted. */
  #globalObjects: THREE.Object3D[] = []
  #loading = new Set<string>()
  /** Scratch for `collide`. */
  readonly #local = new THREE.Vector3()
  readonly #inverse = new THREE.Quaternion()
  #disposed = false
  #ownedGeometries: THREE.BufferGeometry[] = []
  #ownedMaterials: THREE.Material[] = []
  readonly #map: MinimapMapInfo
  readonly #queue: InstallQueue
  readonly #window: TileWindow

  constructor(
    map: MinimapMapInfo,
    assets: SceneAssets,
    queue: InstallQueue,
    liquids: LiquidSurfaces,
  ) {
    this.#map = map
    this.#assets = assets
    this.#liquids = liquids
    this.#queue = queue
    this.#window = new TileWindow(map, LOAD_RADIUS, KEEP_RADIUS)
    this.root.name = 'wmos'
    void this.#loadGlobal()
  }

  /** Loads/unloads WMO placements for the window. */
  update(camera: TileCoord, lead: TileCoord): void {
    if (!this.#window.update(camera, lead)) return

    for (const [key, tile] of this.#window.load) {
      if (!this.#tiles.has(key) && !this.#loading.has(key)) {
        void this.#loadTile(tile.col, tile.row, key)
      }
    }

    for (const [key, ids] of this.#tiles) {
      if (!this.#window.keeps(key)) this.#releaseTile(key, ids)
    }
    // Resident but outside the camera's own ring: held in memory, kept out of
    // the frame. This covers the batch meshes; the interior M2s need hiding of
    // their own in `cull` so they also drop out of the skinning pass, which a
    // hidden ancestor does not do for them.
    for (const placement of this.#placements.values()) {
      if (placement.object) placement.object.visible = this.#shown(placement)
    }
  }

  /** Whether any of the tiles listing a placement is in the camera's ring. */
  #shown(placement: TilePlacement): boolean {
    for (const key of placement.tiles) {
      if (this.#window.shows(key)) return true
    }
    return false
  }

  /** Drops a tile, and with it every placement no other resident tile lists. */
  #releaseTile(key: string, ids: string[]): void {
    this.#tiles.delete(key)
    for (const id of ids) {
      const placement = this.#placements.get(id)
      if (!placement) continue
      placement.tiles.delete(key)
      if (placement.tiles.size > 0) continue
      this.#placements.delete(id)
      if (placement.object) {
        // Out of the skinning pass as well as out of the scene.
        this.#hideGroup(placement.object)
        this.root.remove(placement.object)
      }
    }
  }

  async #loadGlobal(): Promise<void> {
    let placements: WmoPlacement[]
    try {
      placements = await loadGlobalWmoPlacements(this.#map.name)
    } catch {
      return
    }
    if (this.#disposed || placements.length === 0) return
    await Promise.all(
      placements.map(async placement => {
        const build = await this.#prepare(placement, true)
        if (!build) return
        await this.#queue.run(() => {
          if (this.#disposed) return
          const object = build()
          this.#globalObjects.push(object)
          this.root.add(object)
        })
      }),
    )
  }

  async #loadTile(col: number, row: number, key: string): Promise<void> {
    this.#loading.add(key)
    let placements: WmoPlacement[]
    try {
      placements = await loadAdtWmoPlacements(this.#map.name, col, row)
    } catch {
      return
    } finally {
      this.#loading.delete(key)
    }
    if (this.#disposed || !this.#window.keeps(key)) return

    // Register the (possibly empty) tile up front so panning doesn't refetch.
    const ids = placements.map(placementKey)
    this.#tiles.set(key, ids)
    await Promise.all(
      placements.map(async (placement, i) => {
        const id = ids[i]
        if (id === undefined) return
        // Already listed by a neighbouring tile: share it.
        const existing = this.#placements.get(id)
        if (existing) {
          existing.tiles.add(key)
          return
        }
        const entry: TilePlacement = { object: null, tiles: new Set([key]) }
        this.#placements.set(id, entry)

        const build = await this.#prepare(placement, false)
        if (!build) return
        await this.#queue.run(() => {
          // Released with its last tile — or released and listed afresh,
          // hence the identity test — while this waited its turn. Tested
          // before `build()` so a tile the camera has left costs nothing more
          // than the fetch.
          if (this.#disposed || this.#placements.get(id) !== entry) return
          const object = build()
          object.visible = this.#shown(entry)
          entry.object = object
          this.root.add(object)
        })
      }),
    )
  }

  /**
   * Loads one placement's assets, then hands back the synchronous step that
   * builds it — clone, transform, attach the doodads — for the caller to run
   * from the install queue. Null when the WMO itself could not be loaded.
   * `global`: the placement comes from the WDT, not an ADT tile.
   */
  async #prepare(
    placement: WmoPlacement,
    global: boolean,
  ): Promise<(() => THREE.Object3D) | null> {
    let loaded: LoadedWmo
    try {
      loaded = await this.#loadModel(placement.model)
    } catch {
      return null
    }
    if (this.#disposed) return null

    // Set 0 is the always-shown default; the placement selects one more.
    const sets = new Set<number>([0, placement.doodadSet])
    const doodads = [...sets].flatMap(i => loaded.doodadSets?.[i]?.doodads ?? [])
    const models =
      doodads.length > 0
        ? await Promise.all(
            doodads.map(d => this.#assets.modelManager.get(d.m2).catch(() => null)),
          )
        : []
    if (this.#disposed) return null

    return () => {
      const group = loaded.template.clone()
      group.position.copy(placementPosition(placement.position, global))
      group.quaternion.copy(placementQuaternion(placement.rotation))
      // What `collide` finds the model's shared collider through.
      group.userData.wmo = loaded

      const placed: SceneModel[] = []
      models.forEach((model, i) => {
        const d = doodads[i]
        if (!model || !d) return
        model.position.set(d.position[0], d.position[1], d.position[2])
        model.quaternion.set(d.rotation[0], d.rotation[1], d.rotation[2], d.rotation[3])
        model.scale.setScalar(d.scale)
        group.add(model)
        placed.push(model)
      })
      // The template's liquid surfaces, cloned with it; the submerged test
      // casts against these alone rather than the whole building.
      const liquids = group.children.filter(child => child.userData.category !== undefined)
      if (liquids.length > 0) group.userData.liquids = liquids
      if (placed.length > 0) {
        // Culling walks these directly; they are buried under the batch meshes
        // and re-traversing the group every frame to find them would undo the
        // point.
        group.userData.doodads = placed
      }
      if (placed.length > 0 || liquids.length > 0) {
        // Seeding the world matrices gives the doodads a real
        // `boundingSphereWorld` before the first cull pass reads it, and the
        // liquids a real position before the first submerged test.
        group.updateMatrixWorld(true)
      }
      return group
    }
  }

  /**
   * Frustum + distance culling of the interior doodads for this frame. The
   * WMO batch meshes themselves are ordinary `THREE.Mesh`es that three culls
   * on its own; the M2 doodads are what needs handling here, and hiding one
   * also drops it from the per-frame skinning loop.
   */
  cull(frustum: THREE.Frustum, cameraPosition: THREE.Vector3): void {
    for (const object of this.#globalObjects) this.#cullGroup(object, frustum, cameraPosition)
    for (const { object } of this.#placements.values()) {
      if (!object) continue
      // A hidden placement's doodads still have to be hidden one by one: the
      // animator walks models by their own `visible` flag, so an invisible
      // ancestor would stop them drawing but not stop them being skinned.
      if (object.visible) this.#cullGroup(object, frustum, cameraPosition)
      else this.#hideGroup(object)
    }
  }

  /**
   * The category of the WMO liquid the camera is under, or null. Only the
   * placements on screen are tested: the camera is in one of them if it is
   * in any.
   */
  submergedIn(cameraPosition: THREE.Vector3): string | null {
    const surfaces = this.#liquidScratch
    surfaces.length = 0
    const collect = (placement: THREE.Object3D) => {
      const liquids = placement.userData.liquids as THREE.Object3D[] | undefined
      if (liquids) surfaces.push(...liquids)
    }
    for (const object of this.#globalObjects) collect(object)
    for (const { object } of this.#placements.values()) {
      if (object?.visible) collect(object)
    }
    return liquidAbove(cameraPosition, surfaces, false)
  }

  /**
   * Pushes a world position out of the solid geometry of the WMOs around it
   * (see `WmoCollider`); returns whether it moved. Only the placements on
   * screen are tested: a WMO the camera is in is one of them.
   */
  collide(position: THREE.Vector3, radius: number): boolean {
    let moved = false
    for (const object of this.#globalObjects) {
      moved = this.#collideWith(object, position, radius) || moved
    }
    for (const { object } of this.#placements.values()) {
      if (object?.visible) moved = this.#collideWith(object, position, radius) || moved
    }
    return moved
  }

  #collideWith(group: THREE.Object3D, position: THREE.Vector3, radius: number): boolean {
    const loaded = group.userData.wmo as LoadedWmo | undefined
    if (!loaded) return false
    loaded.collider ??= new WmoCollider(loaded.template)
    // Placements hang straight off `root`, which sits at the scene origin, and
    // carry no scale: their position and rotation are the whole transform.
    // Read from those rather than `matrixWorld`, which is stale until the
    // first render after the placement is installed.
    this.#inverse.copy(group.quaternion).invert()
    const local = this.#local.subVectors(position, group.position).applyQuaternion(this.#inverse)
    if (!loaded.collider.pushOut(local, radius)) return false
    position.copy(local.applyQuaternion(group.quaternion).add(group.position))
    return true
  }

  /** Drops a placement's interior doodads out of the draw and skinning passes. */
  #hideGroup(group: THREE.Object3D): void {
    const doodads = group.userData.doodads as SceneModel[] | undefined
    if (!doodads) return
    for (const model of doodads) model.hide()
  }

  #cullGroup(
    group: THREE.Object3D,
    frustum: THREE.Frustum,
    cameraPosition: THREE.Vector3,
  ): void {
    const doodads = group.userData.doodads as SceneModel[] | undefined
    if (!doodads) return
    for (const model of doodads) cullModel(model, frustum, cameraPosition)
  }

  /** Builds (once) a WMO's batch + liquid template and its doodad-set data. */
  #loadModel(filename: string): Promise<LoadedWmo> {
    const cached = this.#modelCache.get(filename)
    if (cached) return cached

    // Turning the batches into GPU buffers is the same kind of main-thread
    // work as the placements that clone the result, so it runs under the same
    // budget rather than all at once when the fetch lands.
    const promise = loadWmoModel(filename).then((model: WmoModel) =>
      this.#queue.run(() => {
        // Lit by the scene light the world view keeps on the zone's light, so
        // the batches share the sun, ambient and fog of the M2s they hold.
        const built = buildWmoTemplate(
          model.batches,
          this.#assets.textureManager,
          this.#assets.sceneLight,
        )
        this.#ownedGeometries.push(...built.geometries)
        this.#ownedMaterials.push(...built.materials)
        // The liquid is in WMO-local space like the batches, so it rides the
        // placement transform with them. Its materials are the shared ones:
        // only the geometry is this WMO's to free.
        for (const layer of model.liquids) {
          const material = this.#liquids.material(layer.category)
          if (layer.indices.length === 0 || !material) continue
          const geometry = buildLiquidGeometry(layer, 0, 0)
          const surface = new THREE.Mesh(geometry, material)
          surface.userData.category = layer.category
          built.group.add(surface)
          this.#ownedGeometries.push(geometry)
        }
        return { template: built.group, doodadSets: model.doodadSets, collider: null }
      }),
    )
    this.#modelCache.set(filename, promise)
    return promise
  }

  dispose(): void {
    this.#disposed = true
    for (const { object } of this.#placements.values()) {
      if (object) this.root.remove(object)
    }
    this.#placements.clear()
    this.#tiles.clear()
    for (const obj of this.#globalObjects) this.root.remove(obj)
    this.#globalObjects = []
    for (const geometry of this.#ownedGeometries) geometry.dispose()
    for (const material of this.#ownedMaterials) material.dispose()
    this.#ownedGeometries = []
    this.#ownedMaterials = []
  }
}

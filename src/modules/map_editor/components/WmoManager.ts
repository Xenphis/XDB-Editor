import * as THREE from 'three'
import type { MinimapMapInfo, WmoDoodadSet, WmoModel, WmoPlacement } from '../types'
import { loadAdtWmoPlacements, loadGlobalWmoPlacements, loadWmoModel } from '../service'
import type { SceneAssets } from '@core/wow/SceneAssets'
import { buildWmoTemplate } from '@core/wow/wmoGeometry'
import { cullModel, type SceneModel } from './ModelCulling'
import type { InstallQueue } from './InstallQueue'
import { TileWindow, type TileCoord } from './TileWindow'

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
 * Textures and interior M2s come from the scene-wide `SceneAssets`, so a WMO
 * shares its decoded BLPs and model geometry with the terrain and the creature
 * spawns instead of keeping a private copy of each.
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

interface LoadedWmo {
  /** Batch geometry group; cloned per placement (geometry/materials shared). */
  template: THREE.Group
  doodadSets: WmoDoodadSet[]
}

/** MODF/MDDF position [X,Y,Z] → world (== three) position. */
function placementPosition(p: [number, number, number]): THREE.Vector3 {
  return new THREE.Vector3(MAP_CORNER - p[2], MAP_CORNER - p[0], p[1])
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
  #modelCache = new Map<string, Promise<LoadedWmo>>()
  /** One group per tile, so residency and visibility can be toggled as a unit. */
  #tiles = new Map<string, THREE.Group>()
  /** Placements from the WDT (WMO-only maps): loaded once, never evicted. */
  #globalObjects: THREE.Object3D[] = []
  #loading = new Set<string>()
  #disposed = false
  #ownedGeometries: THREE.BufferGeometry[] = []
  #ownedMaterials: THREE.Material[] = []
  readonly #map: MinimapMapInfo
  readonly #queue: InstallQueue
  readonly #window: TileWindow

  constructor(map: MinimapMapInfo, assets: SceneAssets, queue: InstallQueue) {
    this.#map = map
    this.#assets = assets
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

    for (const [key, group] of this.#tiles) {
      if (!this.#window.keeps(key)) {
        this.root.remove(group)
        this.#tiles.delete(key)
        continue
      }
      // Resident but outside the camera's own ring: held in memory, kept out
      // of the frame. This covers the batch meshes; the interior M2s need
      // hiding of their own in `cull` so they also drop out of the skinning
      // pass, which a hidden ancestor does not do for them.
      group.visible = this.#window.shows(key)
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
        const build = await this.#prepare(placement)
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
    const group = new THREE.Group()
    group.name = `wmo-tile-${key}`
    group.visible = this.#window.shows(key)
    this.#tiles.set(key, group)
    this.root.add(group)
    await Promise.all(
      placements.map(async placement => {
        const build = await this.#prepare(placement)
        if (!build) return
        await this.#queue.run(() => {
          // Evicted — or evicted and reloaded, hence the identity test on the
          // group — while this waited its turn. Tested before `build()` so a
          // tile the camera has left costs nothing more than the fetch.
          if (this.#disposed || this.#tiles.get(key) !== group) return
          group.add(build())
        })
      }),
    )
  }

  /**
   * Loads one placement's assets, then hands back the synchronous step that
   * builds it — clone, transform, attach the doodads — for the caller to run
   * from the install queue. Null when the WMO itself could not be loaded.
   */
  async #prepare(placement: WmoPlacement): Promise<(() => THREE.Object3D) | null> {
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
      group.position.copy(placementPosition(placement.position))
      group.quaternion.copy(placementQuaternion(placement.rotation))

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
      if (placed.length > 0) {
        // Culling walks these directly; they are buried under the batch meshes
        // and re-traversing the group every frame to find them would undo the
        // point. Seeding the world matrices also gives them a real
        // `boundingSphereWorld` before the first cull pass reads it.
        group.userData.doodads = placed
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
    for (const group of this.#tiles.values()) {
      // A hidden tile's doodads still have to be hidden one by one: the
      // animator walks models by their own `visible` flag, so an invisible
      // ancestor would stop them drawing but not stop them being skinned.
      for (const placement of group.children) {
        if (group.visible) this.#cullGroup(placement, frustum, cameraPosition)
        else this.#hideGroup(placement)
      }
    }
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

  /** Builds (once) a WMO's batch-geometry template + doodad-set data. */
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
        return { template: built.group, doodadSets: model.doodadSets }
      }),
    )
    this.#modelCache.set(filename, promise)
    return promise
  }

  dispose(): void {
    this.#disposed = true
    for (const group of this.#tiles.values()) this.root.remove(group)
    this.#tiles.clear()
    for (const obj of this.#globalObjects) this.root.remove(obj)
    this.#globalObjects = []
    for (const geometry of this.#ownedGeometries) geometry.dispose()
    for (const material of this.#ownedMaterials) material.dispose()
    this.#ownedGeometries = []
    this.#ownedMaterials = []
  }
}

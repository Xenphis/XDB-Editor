import * as THREE from 'three'
import type { CreatureModelInfo, CreatureSpawnMarker, MinimapMapInfo } from '../types'
import { loadCreatureSpawnsInBounds, resolveCreatureModels, tileWorldBounds } from '../service'
import type { SceneAssets } from '@core/wow/SceneAssets'
import { applyModelSkins } from '@core/wow/modelSkins'
import { cullModel, type SceneModel } from './ModelCulling'
import type { InstallQueue } from './InstallQueue'
import { TileWindow, type TileCoord } from './TileWindow'

/**
 * Streams creature spawns from the world DB as real M2 models around the camera,
 * one ADT tile at a time (Chebyshev radius), mirroring `WmoManager`: crossing a
 * tile boundary loads the newly-wanted tiles and frees the ones that fell out of
 * range, so a continent never holds more than a few tiles' worth of spawns in
 * memory.
 *
 * The DB gives each spawn a world position (placed as-is: the scene is in WoW
 * coords) and a display id; the display id is resolved to an M2 path via the
 * client DBCs (`minimap_creature_models`) and instanced through the scene-wide
 * `SceneAssets` — literally the same ModelManager the WMO doodads use, so a
 * model appearing in both is loaded once. Model resolutions are cached across
 * tiles (keyed by display id); the ModelManager caches geometry and textures
 * across instances, so N copies of one creature share GPU buffers.
 *
 * Each placed object carries `userData.spawn` so the view can raycast-select it.
 *
 * Placing a model and adding it to the scene runs from the shared
 * `InstallQueue`: a dense tile resolves dozens of spawns at once, and adding
 * them as they landed spent the whole batch — placement, skins, and the
 * first-draw buffer upload — inside a single frame.
 */

/** ADT tiles loaded around the camera (Chebyshev radius). Models are heavy. */
const LOAD_RADIUS = 1
/** Tiles are only freed one ring further out; see `TileWindow`. */
const KEEP_RADIUS = 2

export class CreatureSpawnManager {
  readonly root = new THREE.Group()

  readonly #assets: SceneAssets
  #tiles = new Map<string, SceneModel[]>()
  #loading = new Set<string>()
  /** display id -> resolved model (null once we know it can't be resolved). */
  #models = new Map<number, CreatureModelInfo | null>()
  #disposed = false
  readonly #mapId: number
  readonly #queue: InstallQueue
  readonly #window: TileWindow
  /** Phase filter passed to the query; null streams every phase. */
  #phaseMask: number | null
  /**
   * Bumped whenever the phase changes. Tile loads capture it and abandon their
   * results if it moved while they were in flight, so rows fetched for the old
   * phase never reach the scene.
   */
  #generation = 0

  constructor(
    map: MinimapMapInfo,
    mapId: number,
    assets: SceneAssets,
    queue: InstallQueue,
    phaseMask: number | null = null,
  ) {
    this.#mapId = mapId
    this.#assets = assets
    this.#queue = queue
    this.#window = new TileWindow(map, LOAD_RADIUS, KEEP_RADIUS)
    this.#phaseMask = phaseMask
    this.root.name = 'creature-spawns'
  }

  /**
   * Switches the phase being displayed. The filter is applied by the query, so
   * everything already loaded is stale: drop it and let the next `update()`
   * refetch the ring around the camera.
   */
  setPhase(phaseMask: number | null): void {
    if (phaseMask === this.#phaseMask) return
    this.#phaseMask = phaseMask
    this.#generation += 1
    for (const objects of this.#tiles.values()) {
      for (const obj of objects) this.root.remove(obj)
    }
    this.#tiles.clear()
    // Forget the tracked window so update() rebuilds the ring from scratch
    // instead of short-circuiting on an unchanged camera position.
    this.#window.invalidate()
  }

  /** Loads/unloads spawn models for the window. */
  update(camera: TileCoord, lead: TileCoord): void {
    if (!this.#window.update(camera, lead)) return

    for (const [key, tile] of this.#window.load) {
      if (!this.#tiles.has(key) && !this.#loading.has(key)) {
        void this.#loadTile(tile.col, tile.row, key)
      }
    }

    for (const [key, objects] of this.#tiles) {
      if (!this.#window.keeps(key)) {
        for (const obj of objects) this.root.remove(obj)
        this.#tiles.delete(key)
      }
    }
  }

  async #loadTile(col: number, row: number, key: string): Promise<void> {
    const generation = this.#generation
    this.#loading.add(key)
    let spawns: CreatureSpawnMarker[]
    try {
      spawns = await loadCreatureSpawnsInBounds(
        this.#mapId,
        tileWorldBounds(col, row),
        this.#phaseMask,
      )
    } catch {
      // No DB connected, or the query failed: leave the tile unregistered so a
      // later pass can retry once a database is available.
      return
    } finally {
      this.#loading.delete(key)
    }
    if (this.#disposed || generation !== this.#generation || !this.#window.keeps(key)) return

    const objects: SceneModel[] = []
    // Register the (possibly empty) tile up front so panning doesn't refetch.
    this.#tiles.set(key, objects)

    // Resolve any unseen display ids for this tile in one batched call.
    await this.#ensureModels(spawns.map(s => s.display_id))
    if (this.#disposed || generation !== this.#generation || !this.#tiles.has(key)) return

    await Promise.all(
      spawns.map(async spawn => {
        const info = this.#models.get(spawn.display_id)
        if (!info) return
        const build = await this.#prepare(info)
        if (!build) return
        await this.#queue.run(() => {
          // Disposed, re-phased, or the tile evicted — or evicted and
          // reloaded, hence the identity test on the array — while this
          // waited its turn.
          if (this.#disposed || generation !== this.#generation) return
          if (this.#tiles.get(key) !== objects) return
          const object = build(spawn)
          object.userData.spawn = spawn
          objects.push(object)
          this.root.add(object)
        })
      }),
    )
  }

  /**
   * Loads one spawn's model, then hands back the synchronous step that places
   * it in world space — for the caller to run from the install queue.
   */
  async #prepare(
    info: CreatureModelInfo,
  ): Promise<((spawn: CreatureSpawnMarker) => SceneModel) | null> {
    let model: SceneModel
    try {
      model = await this.#assets.modelManager.get(info.model)
    } catch {
      return null
    }
    if (this.#disposed) return null

    return spawn => {
      model.position.set(spawn.position_x, spawn.position_y, spawn.position_z)
      // WoW orientation is a yaw about world +Z (radians); a facing offset can
      // be added here if models come out rotated, as WMO placements add +180.
      model.rotation.set(0, 0, spawn.orientation)
      model.scale.setScalar(info.scale * (spawn.scale || 1))
      // Seed the world matrix now: culling reads `boundingSphereWorld`, which
      // is derived from it, and the renderer would not refresh it until after
      // this frame's cull pass — leaving a model at the origin for one frame.
      model.updateMatrixWorld()
      applyModelSkins(model, info.textures, this.#assets.textureManager)
      return model
    }
  }

  /**
   * Frustum + distance culling for this frame. Must run before the shared
   * animation pass: a hidden model drops out of the per-frame skinning loop,
   * which costs far more than its draw call.
   */
  cull(frustum: THREE.Frustum, cameraPosition: THREE.Vector3): void {
    for (const [key, objects] of this.#tiles) {
      // Tiles held for prefetch or hysteresis are resident, not visible: hide
      // them outright rather than frustum-testing them. `hide()` is what drops
      // a model from the skinning pass too, so this is also where the saving
      // is — the draw call is the smaller half.
      const shown = this.#window.shows(key)
      for (const object of objects) {
        if (shown) cullModel(object, frustum, cameraPosition)
        else object.hide()
      }
    }
  }

  /** Resolves (once, batched) the display ids not yet in the model cache. */
  async #ensureModels(displayIds: number[]): Promise<void> {
    const missing = [...new Set(displayIds)].filter(id => id > 0 && !this.#models.has(id))
    if (missing.length === 0) return
    let resolved: Record<number, CreatureModelInfo>
    try {
      resolved = await resolveCreatureModels(missing)
    } catch {
      // Remember the failure so we don't refetch these every tile.
      for (const id of missing) this.#models.set(id, null)
      return
    }
    for (const id of missing) {
      this.#models.set(id, resolved[id] ?? null)
    }
  }

  dispose(): void {
    this.#disposed = true
    for (const objects of this.#tiles.values()) {
      for (const obj of objects) this.root.remove(obj)
    }
    this.#tiles.clear()
  }
}

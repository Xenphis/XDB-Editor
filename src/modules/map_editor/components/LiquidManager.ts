import * as THREE from 'three'
import type { LiquidMesh, MinimapMapInfo } from '../types'
import { loadAdtLiquids, tileWorldBounds } from '../service'
import type { InstallQueue } from './InstallQueue'
import { buildLiquidGeometry, liquidAbove, type LiquidSurfaces } from './LiquidSurfaces'
import { TileWindow, type TileCoord } from './TileWindow'

/**
 * Streams ADT liquid meshes (MH2O, or MCLQ in older tiles) around the camera
 * to complement @wowserhq/scene's terrain, which doesn't render water.
 *
 * The Rust side returns world-space geometry per liquid category; this keeps
 * one THREE.Group per loaded tile, adding tiles the `TileWindow` asks for and
 * disposing the ones it drops. Scene space == WoW space, so vertices are used
 * as-is. The materials, and their animation, are the shared `LiquidSurfaces`.
 *
 * Building the meshes is the expensive part — a tile's positions and indices
 * become GPU buffers — so it runs from the shared `InstallQueue` rather than
 * inline in the load path.
 */

/** ADT tiles loaded around the camera's tile (Chebyshev radius). */
const LOAD_RADIUS = 2
/** Tiles are only freed one ring further out; see `TileWindow`. */
const KEEP_RADIUS = 3

export class LiquidManager {
  readonly root = new THREE.Group()

  readonly #surfaces: LiquidSurfaces
  #tiles = new Map<string, THREE.Group>()
  #loading = new Set<string>()
  #disposed = false
  readonly #map: MinimapMapInfo
  readonly #queue: InstallQueue
  readonly #window: TileWindow

  constructor(map: MinimapMapInfo, queue: InstallQueue, surfaces: LiquidSurfaces) {
    this.#surfaces = surfaces
    this.#map = map
    this.#queue = queue
    this.#window = new TileWindow(map, LOAD_RADIUS, KEEP_RADIUS)
    this.root.name = 'liquids'
    // Draw water after opaque terrain so translucency blends correctly.
    this.root.renderOrder = 1
  }

  /** The liquid category the camera is inside, or null in open air. */
  submergedIn(cameraPosition: THREE.Vector3): string | null {
    if (this.#tiles.size === 0) return null
    return liquidAbove(cameraPosition, [this.root], true)
  }

  /** Loads/unloads tiles for the window (cheap unless a centre tile changed). */
  update(camera: TileCoord, lead: TileCoord): void {
    if (!this.#window.update(camera, lead)) return

    for (const [key, tile] of this.#window.load) {
      if (!this.#tiles.has(key) && !this.#loading.has(key)) {
        void this.#loadTile(tile.col, tile.row, key)
      }
    }

    for (const [key, group] of this.#tiles) {
      if (!this.#window.keeps(key)) {
        this.#disposeTile(group)
        this.#tiles.delete(key)
        continue
      }
      // Resident but outside the camera's own ring: held in memory, kept out
      // of the frame. Prefetching and hysteresis widen what we hold, and must
      // not widen what we draw.
      group.visible = this.#window.shows(key)
    }
  }

  async #loadTile(col: number, row: number, key: string): Promise<void> {
    this.#loading.add(key)
    let mesh: LiquidMesh
    try {
      mesh = await loadAdtLiquids(this.#map.name, col, row)
    } catch {
      return // tile has no ADT / failed: treated as no water
    } finally {
      this.#loading.delete(key)
    }
    // The map may have been switched/disposed, or the tile evicted, while
    // the request was in flight.
    if (this.#disposed || !this.#window.keeps(key)) return

    // Register the (still empty) group now — synchronously, so the tile is
    // never both un-loaded and un-loading — and fill it from the queue. An
    // empty group doubles as the record of a waterless tile, which is what
    // stops panning from re-requesting it.
    const group = new THREE.Group()
    group.visible = this.#window.shows(key)
    this.#tiles.set(key, group)

    await this.#queue.run(() => {
      // Evicted — or evicted and reloaded, hence the identity test — while it
      // sat in the queue.
      if (this.#disposed || this.#tiles.get(key) !== group) return
      const bounds = tileWorldBounds(col, row)
      for (const layer of mesh.layers) {
        const material = this.#surfaces.material(layer.category)
        if (layer.indices.length === 0 || !material) continue
        const geometry = buildLiquidGeometry(layer, bounds.minX, bounds.minY)
        const surface = new THREE.Mesh(geometry, material)
        // Read back by `submergedIn` off the raycast hit.
        surface.userData.category = layer.category
        group.add(surface)
      }
      if (group.children.length > 0) this.root.add(group)
    })
  }

  #disposeTile(group: THREE.Group): void {
    this.root.remove(group)
    group.traverse(obj => {
      if (obj instanceof THREE.Mesh) obj.geometry.dispose()
    })
  }

  /** Frees the tiles' geometry; the materials belong to `LiquidSurfaces`. */
  dispose(): void {
    this.#disposed = true
    for (const group of this.#tiles.values()) this.#disposeTile(group)
    this.#tiles.clear()
  }
}

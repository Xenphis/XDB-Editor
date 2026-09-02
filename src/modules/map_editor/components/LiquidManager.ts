import * as THREE from 'three'
import type { LiquidMesh, MinimapMapInfo } from '../types'
import { loadAdtLiquids } from '../service'
import type { InstallQueue } from './InstallQueue'
import { TileWindow, type TileCoord } from './TileWindow'

/**
 * Streams ADT liquid (MH2O) meshes around the camera to complement
 * @wowserhq/scene's terrain, which doesn't render water.
 *
 * The Rust side returns world-space geometry per liquid category; this keeps
 * one THREE.Group per loaded tile, adding tiles the `TileWindow` asks for and
 * disposing the ones it drops. Scene space == WoW space, so vertices are used
 * as-is.
 *
 * Building the meshes is the expensive part — a tile's positions and indices
 * become GPU buffers — so it runs from the shared `InstallQueue` rather than
 * inline in the load path.
 */

/** ADT tiles loaded around the camera's tile (Chebyshev radius). */
const LOAD_RADIUS = 2
/** Tiles are only freed one ring further out; see `TileWindow`. */
const KEEP_RADIUS = 3

/** Flat, unlit materials keyed by liquid category; water reads as translucent. */
function makeMaterials(): Record<string, THREE.Material> {
  const water = new THREE.MeshBasicMaterial({
    color: 0x2c6b9e,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const ocean = new THREE.MeshBasicMaterial({
    color: 0x1f5c86,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const magma = new THREE.MeshBasicMaterial({ color: 0xff6a1a, side: THREE.DoubleSide })
  const slime = new THREE.MeshBasicMaterial({
    color: 0x6aa832,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  return { water, ocean, magma, slime }
}

export class LiquidManager {
  readonly root = new THREE.Group()

  #materials = makeMaterials()
  #tiles = new Map<string, THREE.Group>()
  #loading = new Set<string>()
  #disposed = false
  readonly #map: MinimapMapInfo
  readonly #queue: InstallQueue
  readonly #window: TileWindow

  constructor(map: MinimapMapInfo, queue: InstallQueue) {
    this.#map = map
    this.#queue = queue
    this.#window = new TileWindow(map, LOAD_RADIUS, KEEP_RADIUS)
    this.root.name = 'liquids'
    // Draw water after opaque terrain so translucency blends correctly.
    this.root.renderOrder = 1
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
      }
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
    this.#tiles.set(key, group)

    await this.#queue.run(() => {
      // Evicted — or evicted and reloaded, hence the identity test — while it
      // sat in the queue.
      if (this.#disposed || this.#tiles.get(key) !== group) return
      for (const layer of mesh.layers) {
        if (layer.indices.length === 0) continue
        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(layer.positions, 3))
        geometry.setIndex(layer.indices)
        const material = this.#materials[layer.category] ?? this.#materials.water
        group.add(new THREE.Mesh(geometry, material))
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

  dispose(): void {
    this.#disposed = true
    for (const group of this.#tiles.values()) this.#disposeTile(group)
    this.#tiles.clear()
    for (const material of Object.values(this.#materials)) material.dispose()
  }
}

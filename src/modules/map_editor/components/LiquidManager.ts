import * as THREE from 'three'
import type { LiquidMesh, MinimapMapInfo } from '../types'
import { loadAdtLiquids, worldToTile } from '../service'

/**
 * Streams ADT liquid (MH2O) meshes around the camera to complement
 * @wowserhq/scene's terrain, which doesn't render water.
 *
 * The Rust side returns world-space geometry per liquid category; this keeps
 * one THREE.Group per loaded tile, adding tiles within a small radius of the
 * camera's tile and disposing the rest. Scene space == WoW space, so vertices
 * are used as-is.
 */

/** ADT tiles to keep loaded around the camera's tile (Chebyshev radius). */
const RADIUS = 2

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

function tileKey(col: number, row: number): string {
  return `${col},${row}`
}

export class LiquidManager {
  readonly root = new THREE.Group()

  #materials = makeMaterials()
  #tiles = new Map<string, THREE.Group>()
  #loading = new Set<string>()
  #disposed = false
  #lastCol = Number.NaN
  #lastRow = Number.NaN
  readonly #map: MinimapMapInfo

  constructor(map: MinimapMapInfo) {
    this.#map = map
    this.root.name = 'liquids'
    // Draw water after opaque terrain so translucency blends correctly.
    this.root.renderOrder = 1
  }

  /** Loads/unloads tiles for the camera position (cheap unless the tile changed). */
  update(cameraX: number, cameraY: number): void {
    const { col, row } = worldToTile({ x: cameraX, y: cameraY })
    if (col === this.#lastCol && row === this.#lastRow) return
    this.#lastCol = col
    this.#lastRow = row

    const wanted = new Set<string>()
    for (let dc = -RADIUS; dc <= RADIUS; dc++) {
      for (let dr = -RADIUS; dr <= RADIUS; dr++) {
        const c = col + dc
        const r = row + dr
        if (c < this.#map.minX || c > this.#map.maxX || r < this.#map.minY || r > this.#map.maxY) {
          continue
        }
        const key = tileKey(c, r)
        wanted.add(key)
        if (!this.#tiles.has(key) && !this.#loading.has(key)) {
          void this.#loadTile(c, r, key)
        }
      }
    }

    for (const [key, group] of this.#tiles) {
      if (!wanted.has(key)) {
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
    if (this.#disposed || !this.#isWanted(col, row)) return

    const group = new THREE.Group()
    for (const layer of mesh.layers) {
      if (layer.indices.length === 0) continue
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(layer.positions, 3))
      geometry.setIndex(layer.indices)
      const material = this.#materials[layer.category] ?? this.#materials.water
      group.add(new THREE.Mesh(geometry, material))
    }
    if (group.children.length === 0) {
      // Remember empty tiles so we don't re-request them while panning.
      this.#tiles.set(key, group)
      return
    }
    this.#tiles.set(key, group)
    this.root.add(group)
  }

  #isWanted(col: number, row: number): boolean {
    return Math.abs(col - this.#lastCol) <= RADIUS && Math.abs(row - this.#lastRow) <= RADIUS
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

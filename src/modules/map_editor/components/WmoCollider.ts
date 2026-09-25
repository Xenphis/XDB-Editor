import * as THREE from 'three'

/**
 * Camera collision against one WMO's geometry, in WMO-local space.
 *
 * The batches merge every group of the WMO by texture, so a single mesh can
 * span a whole dungeon: three's own raycast would walk all of its triangles on
 * every query. The triangles are bucketed in a uniform grid instead, and a
 * query only tests the few cells around the camera.
 *
 * Only opaque batches collide — walls, floors, ceilings. Alpha-keyed ones
 * (cobwebs, chains, foliage cards) and blended ones (light shafts, glass)
 * would stop the camera on things a player walks through, or can't even see.
 *
 * Built lazily: the bounds up front (cheap, used to skip WMOs the camera is
 * nowhere near), the grid on the first query that lands inside them. One
 * collider per WMO model, shared by all of its placements.
 */

/** Grid cell edge, in yards: about a camera sphere across. */
const CELL_SIZE = 4
/** Cell indices are offset into [0, CELL_RANGE) per axis (±16k yards). */
const CELL_RANGE = 8192
const CELL_OFFSET = CELL_RANGE / 2
/** Push-out passes per query; corners settle in two, a third covers the rest. */
const PASSES = 3

function cellIndex(value: number): number {
  const index = Math.floor(value / CELL_SIZE) + CELL_OFFSET
  return Math.min(Math.max(index, 0), CELL_RANGE - 1)
}

function cellKey(ix: number, iy: number, iz: number): number {
  return (ix * CELL_RANGE + iy) * CELL_RANGE + iz
}

/** Whether a batch mesh blocks the camera (see the class comment). */
function isSolid(object: THREE.Object3D): object is THREE.Mesh {
  if (!(object instanceof THREE.Mesh)) return false
  // Liquid surfaces are tagged with their category.
  if (object.userData.category !== undefined) return false
  const defines = (object.material as THREE.ShaderMaterial).defines ?? {}
  return !defines.ALPHA_KEY && !defines.BLENDED
}

export class WmoCollider {
  readonly #geometries: THREE.BufferGeometry[]
  readonly #bounds = new THREE.Box3()
  /** Triangle corners, 9 floats per triangle. */
  #corners: Float32Array | null = null
  #cells = new Map<number, number[]>()
  /** Last query each triangle was tested in: one spanning cells is tested once. */
  #stamps = new Uint32Array(0)
  #stamp = 0

  readonly #triangle = new THREE.Triangle()
  readonly #closest = new THREE.Vector3()
  readonly #push = new THREE.Vector3()

  /** `template` is the WMO's batch group, meshes at identity. */
  constructor(template: THREE.Object3D) {
    this.#geometries = template.children.filter(isSolid).map(mesh => mesh.geometry)
    for (const geometry of this.#geometries) {
      if (!geometry.boundingBox) geometry.computeBoundingBox()
      if (geometry.boundingBox) this.#bounds.union(geometry.boundingBox)
    }
  }

  /**
   * Moves `point` (WMO-local) out of every solid triangle closer than
   * `radius`, away from the side it is on. Returns whether it moved.
   */
  pushOut(point: THREE.Vector3, radius: number): boolean {
    if (this.#bounds.isEmpty() || this.#bounds.distanceToPoint(point) > radius) return false
    const corners = this.#build()
    const radiusSq = radius * radius
    let moved = false

    for (let pass = 0; pass < PASSES; pass++) {
      let pushed = false
      this.#stamp = (this.#stamp + 1) >>> 0 || 1
      const x0 = cellIndex(point.x - radius)
      const x1 = cellIndex(point.x + radius)
      const y0 = cellIndex(point.y - radius)
      const y1 = cellIndex(point.y + radius)
      const z0 = cellIndex(point.z - radius)
      const z1 = cellIndex(point.z + radius)
      for (let ix = x0; ix <= x1; ix++) {
        for (let iy = y0; iy <= y1; iy++) {
          for (let iz = z0; iz <= z1; iz++) {
            const cell = this.#cells.get(cellKey(ix, iy, iz))
            if (!cell) continue
            for (const tri of cell) {
              if (this.#stamps[tri] === this.#stamp) continue
              this.#stamps[tri] = this.#stamp
              const o = tri * 9
              this.#triangle.a.fromArray(corners, o)
              this.#triangle.b.fromArray(corners, o + 3)
              this.#triangle.c.fromArray(corners, o + 6)
              this.#triangle.closestPointToPoint(point, this.#closest)
              const distanceSq = this.#closest.distanceToSquared(point)
              if (distanceSq >= radiusSq) continue
              const distance = Math.sqrt(distanceSq)
              if (distance < 1e-6) {
                // Dead on the surface: no side to go back to but the face's.
                this.#triangle.getNormal(this.#push)
                point.addScaledVector(this.#push, radius)
              } else {
                this.#push.subVectors(point, this.#closest)
                point.addScaledVector(this.#push, (radius - distance) / distance)
              }
              pushed = true
            }
          }
        }
      }
      if (!pushed) break
      moved = true
    }
    return moved
  }

  /** Buckets the solid triangles into the grid, once. */
  #build(): Float32Array {
    if (this.#corners) return this.#corners

    let count = 0
    for (const geometry of this.#geometries) count += (geometry.index?.count ?? 0) / 3
    const corners = new Float32Array(count * 9)
    let tri = 0
    for (const geometry of this.#geometries) {
      const index = geometry.index
      const position = geometry.getAttribute('position')
      if (!index || !position) continue
      for (let i = 0; i < index.count; i += 3) {
        const o = tri * 9
        for (let corner = 0; corner < 3; corner++) {
          const vertex = index.getX(i + corner)
          corners[o + corner * 3] = position.getX(vertex)
          corners[o + corner * 3 + 1] = position.getY(vertex)
          corners[o + corner * 3 + 2] = position.getZ(vertex)
        }
        this.#insert(tri, corners, o)
        tri += 1
      }
    }
    this.#corners = corners
    this.#stamps = new Uint32Array(tri)
    return corners
  }

  /** Files a triangle under every cell its bounding box touches. */
  #insert(tri: number, corners: Float32Array, o: number): void {
    // Cell range of the triangle's bounding box along one axis.
    const extent = (axis: number): [number, number] => {
      const a = corners[o + axis] ?? 0
      const b = corners[o + 3 + axis] ?? 0
      const c = corners[o + 6 + axis] ?? 0
      return [cellIndex(Math.min(a, b, c)), cellIndex(Math.max(a, b, c))]
    }
    const [x0, x1] = extent(0)
    const [y0, y1] = extent(1)
    const [z0, z1] = extent(2)
    for (let ix = x0; ix <= x1; ix++) {
      for (let iy = y0; iy <= y1; iy++) {
        for (let iz = z0; iz <= z1; iz++) {
          const key = cellKey(ix, iy, iz)
          const cell = this.#cells.get(key)
          if (cell) cell.push(tri)
          else this.#cells.set(key, [tri])
        }
      }
    }
  }
}

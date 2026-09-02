import type { MinimapMapInfo } from '../types'

/** An ADT cell index, as `worldToTile` returns it. */
export interface TileCoord {
  col: number
  row: number
}

/** Map key for one ADT cell. */
export function tileKey(col: number, row: number): string {
  return `${col},${row}`
}

/**
 * Which ADT tiles a streaming layer should hold, given where the camera is and
 * where it is heading.
 *
 * Every layer (liquids, WMOs, creature spawns) used to run the same square
 * ring around the camera's own tile, loading on entry and freeing on exit.
 * That has two costs this replaces:
 *
 *  - **Loading starts too late.** A tile is only requested once the camera is
 *    already standing on its neighbour, so the fetch, the parse and the build
 *    all happen while the thing is already in view. The window therefore takes
 *    a second centre — a *lead* tile, extrapolated from camera velocity — and
 *    loads the ring around both. Flying forward, the tiles ahead are requested
 *    roughly a second before they are needed; standing still, the lead
 *    collapses onto the camera and the window is exactly what it always was.
 *
 *  - **Freeing is immediate.** Loading and freeing at the same radius means a
 *    camera sitting on a tile boundary refetches a whole ring every time it
 *    drifts across, and stepping back over it refetches the other one. So the
 *    keep radius is one wider than the load radius: a tile that falls out of
 *    the load ring stays in memory until the camera has genuinely moved on.
 *    The cost is the extra ring's worth of tiles held (25 rather than 9 at
 *    radius 1), which is why the two radii are per layer rather than global.
 */
export class TileWindow {
  readonly #map: MinimapMapInfo
  readonly #loadRadius: number
  readonly #keepRadius: number
  #load = new Map<string, TileCoord>()
  #keep = new Set<string>()
  /** Centres the current sets were built from; '' forces a recompute. */
  #signature = ''

  constructor(map: MinimapMapInfo, loadRadius: number, keepRadius = loadRadius + 1) {
    this.#map = map
    this.#loadRadius = loadRadius
    this.#keepRadius = Math.max(keepRadius, loadRadius)
  }

  /** Tiles that should be loading or loaded now, keyed by `tileKey`. */
  get load(): ReadonlyMap<string, TileCoord> {
    return this.#load
  }

  /**
   * Whether a tile may stay in memory. Also the test for "is this load still
   * relevant" after an await: a tile outside the keep band was evicted (or
   * never wanted) and its results should be dropped.
   */
  keeps(key: string): boolean {
    return this.#keep.has(key)
  }

  /**
   * Recomputes the window. Returns false — leaving the sets untouched — when
   * neither centre has changed, which is the common case: the caller can then
   * skip its whole diff.
   */
  update(camera: TileCoord, lead: TileCoord): boolean {
    const signature = `${camera.col},${camera.row},${lead.col},${lead.row}`
    if (signature === this.#signature) return false
    this.#signature = signature

    const load = new Map<string, TileCoord>()
    const collect = (key: string, col: number, row: number) => load.set(key, { col, row })
    this.#fill(camera, this.#loadRadius, collect)
    this.#fill(lead, this.#loadRadius, collect)
    // Everything being loaded must also be keepable, or the same pass that
    // requests a prefetched tile would evict it again the moment it lands.
    const keep = new Set(load.keys())
    this.#fill(camera, this.#keepRadius, key => keep.add(key))

    this.#load = load
    this.#keep = keep
    return true
  }

  /**
   * Forces the next `update` to recompute even from an unchanged position —
   * for when the layer dropped its tiles for a reason of its own (a phase
   * change) and needs the window handed to it again.
   */
  invalidate(): void {
    this.#signature = ''
  }

  /** Visits every in-bounds tile of a square ring around `centre`. */
  #fill(
    centre: TileCoord,
    radius: number,
    visit: (key: string, col: number, row: number) => void,
  ): void {
    for (let dc = -radius; dc <= radius; dc++) {
      for (let dr = -radius; dr <= radius; dr++) {
        const col = centre.col + dc
        const row = centre.row + dr
        if (
          col < this.#map.minX ||
          col > this.#map.maxX ||
          row < this.#map.minY ||
          row > this.#map.maxY
        ) {
          continue
        }
        visit(tileKey(col, row), col, row)
      }
    }
  }
}

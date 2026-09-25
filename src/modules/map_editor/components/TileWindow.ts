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
 *    loads the ring around both.
 *
 *  - **Freeing is immediate.** Loading and freeing at the same radius means a
 *    camera sitting on a tile boundary refetches a whole ring every time it
 *    drifts across, and stepping back over it refetches the other one. So the
 *    keep radius is one wider than the load radius.
 *
 * Both of those widen what is *resident*, and the first version of this class
 * let that widen what is *drawn* too — which cost draw calls, measurably, since
 * the prefetched ring sits exactly where the camera is looking. So the window
 * reports three nested sets rather than two, and residency no longer implies
 * visibility:
 *
 *      show  ⊆  load  ⊆  keep
 *
 *  - `show` — the ring around the camera alone. Exactly the set the old
 *    radius-only code displayed, so this costs no draw call it did not
 *    already cost.
 *  - `load` — `show` plus the ring around the lead tile. Fetched and built
 *    ahead of time, but held back until the camera's own ring reaches it, so
 *    prefetching buys away the loading hitch without adding anything to the
 *    frame.
 *  - `keep` — `load` plus one wider ring around the camera. Retained against
 *    boundary jitter, drawn by nobody.
 */
export class TileWindow {
  readonly #map: MinimapMapInfo
  readonly #loadRadius: number
  readonly #keepRadius: number
  #show = new Set<string>()
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
   * Whether a loaded tile should be visible this frame. Everything outside it
   * is held in memory but kept out of the scene — see the class comment.
   */
  shows(key: string): boolean {
    return this.#show.has(key)
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
    // The camera's own ring first: it is both what we draw and the start of
    // what we load.
    const show = new Set<string>()
    this.#fill(camera, this.#loadRadius, (key, col, row) => {
      show.add(key)
      collect(key, col, row)
    })
    this.#fill(lead, this.#loadRadius, collect)
    // Everything being loaded must also be keepable, or the same pass that
    // requests a prefetched tile would evict it again the moment it lands.
    const keep = new Set(load.keys())
    this.#fill(camera, this.#keepRadius, key => keep.add(key))

    this.#show = show
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

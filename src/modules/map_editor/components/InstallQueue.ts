/**
 * A frame-budgeted queue for the work that has to land on the render thread.
 *
 * Streaming a tile is asynchronous almost all the way through — the Tauri
 * call, the JSON decode, the BLP worker — but never at the end: building a
 * BufferGeometry, cloning a WMO template and adding the result to the scene
 * all run on the main thread, and three uploads the buffers on the first frame
 * the object is drawn. Doing that for a whole tile at once, which is what
 * `Promise.all` over its placements amounted to, put every placement's cost in
 * a single frame — so crossing a tile boundary cost a visible hitch, the one
 * the `peak` figure in the scene HUD was reporting.
 *
 * The managers therefore no longer touch the scene graph from their load
 * paths. They hand the last step here, and the render loop drains it under a
 * millisecond budget, spreading a dense tile over as many frames as it needs.
 * Models appear a few frames later than they used to; nothing else changes.
 *
 * This is the web-shaped version of what a native client does with a second GL
 * context and a fence: WebGL has one context on one thread, so the only lever
 * left is *when* the work runs.
 */
export class InstallQueue {
  /** Queued tasks, drained from `#head` forward. */
  #tasks: Array<() => void> = []
  /**
   * Index of the next task to run. `shift()` is O(n) on the long queues a
   * dense tile produces, so the head walks forward instead and the array is
   * compacted once it has fallen far enough behind.
   */
  #head = 0

  /**
   * Tasks still waiting. Reported by the scene HUD so a hitch can be told
   * apart from a backlog; it gates nothing.
   */
  get pending(): number {
    return this.#tasks.length - this.#head
  }

  /**
   * Queues `task` and resolves with its result once it has run.
   *
   * Anything still queued when the scene is torn down never runs (see
   * `clear`), so its promise never settles and whatever awaited it simply
   * stops there — which is what we want: the continuation would only have gone
   * on to touch a scene that no longer exists.
   */
  run<T>(task: () => T): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.#tasks.push(() => {
        try {
          resolve(task())
        } catch (error) {
          reject(error)
        }
      })
    })
  }

  /**
   * Runs queued tasks until `budgetMs` is spent. Always runs at least one, so
   * the queue still drains under a budget the very first task overruns.
   */
  drain(budgetMs: number): void {
    if (this.pending === 0) return
    const deadline = performance.now() + budgetMs
    do {
      // A task may queue more work, and `clear()` may empty the queue from
      // under us mid-drain; the optional call covers both.
      this.#tasks[this.#head++]?.()
    } while (this.pending > 0 && performance.now() < deadline)

    if (this.pending === 0) {
      this.#tasks.length = 0
      this.#head = 0
    } else if (this.#head > 256) {
      this.#tasks = this.#tasks.slice(this.#head)
      this.#head = 0
    }
  }

  /** Drops everything still queued (scene teardown). */
  clear(): void {
    this.#tasks = []
    this.#head = 0
  }
}

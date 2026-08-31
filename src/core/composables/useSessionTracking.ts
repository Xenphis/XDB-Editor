import { computed, watch, type Ref } from 'vue'
import type { FieldChange } from '@core/composables/useQueryGenerator'
import {
  useSessionTrackerStore,
  type EntityId,
  type EntitySnapshot,
  type SessionSqlBuilder,
} from '@core/stores/sessionTracker'

/**
 * Session-tracking hook for hand-written editor stores (the map module &
 * friends), mirroring the integration built into createEntityEditorStore:
 * debounced deep watch on the live draft, original frozen at first
 * modification, diff surviving save/execute.
 *
 * `T` is the store's own snapshot shape (a plain row, or an aggregate for
 * multi-table editors). The builders must be pure: a null original means the
 * entity did not exist at session start, a null current means it was deleted.
 */
export interface SessionTrackingOptions<T extends object> {
  /** Unique tracker scope (usually the main table name). */
  scopeId: string
  /** Main table, for display. */
  table: string
  editorDataLoaded: Ref<boolean>
  /** Live reactive sources to deep-watch (formData, child row refs…). */
  watchSources: object[]
  /** Whether the editor currently holds a new-entity draft. */
  isNew: () => boolean
  /** Plain clone of the live draft. */
  cloneCurrent: () => T
  /** Plain clone of the last persisted state; null for new drafts. */
  cloneOriginal: () => T | null
  /** Row identity; join composite keys with ':' (e.g. `${mapId}:${difficulty}`). */
  getId: (current: T) => EntityId
  buildStatements: (original: T | null, current: T | null, id: EntityId) => string[]
  buildFieldChanges: (original: T | null, current: T | null, id: EntityId) => FieldChange[]
}

export interface SessionTracking<T extends object> {
  /** Run a pending debounced sync now. Call at the top of saveEntry(). */
  flush(): void
  /** Call after a successful save so a new-entity draft is tracked as created. */
  onSaved(): void
  /** Call after a successful delete. `original` needs at least the key columns. */
  trackDeleted(id: EntityId, original: T): void
}

export function useSessionTracking<T extends object>(opts: SessionTrackingOptions<T>): SessionTracking<T> {
  const tracker = useSessionTrackerStore()

  function wrap(row: T | null): EntitySnapshot | null {
    return row == null ? null : { main: row as unknown as Record<string, unknown> }
  }

  const builder: SessionSqlBuilder = {
    statements: (original, current, id) =>
      opts.buildStatements((original?.main as T | undefined) ?? null, (current?.main as T | undefined) ?? null, id),
    fieldChanges: (original, current, id) =>
      opts.buildFieldChanges((original?.main as T | undefined) ?? null, (current?.main as T | undefined) ?? null, id),
  }

  let timer: ReturnType<typeof setTimeout> | null = null
  // New drafts are keyed by their typed identity, which can change while
  // drafting; a pristine (untouched) blank draft is not tracked at all.
  let newBaseline: string | null = null
  let newId: EntityId | null = null
  let newSaved = false

  // Capture the pristine baseline whenever a new-entity draft starts.
  watch(computed(opts.isNew), isNew => {
    newBaseline = isNew ? JSON.stringify(opts.cloneCurrent()) : null
    newId = null
    newSaved = false
  })

  function sync() {
    timer = null
    if (!opts.editorDataLoaded.value) return
    const current = opts.cloneCurrent()
    const id = opts.getId(current)
    if (opts.isNew()) {
      if (!newSaved) {
        if (newBaseline !== null && JSON.stringify(current) === newBaseline) return
        // The draft's typed identity changed: re-key its entry.
        if (newId != null && newId !== id) tracker.forget(opts.scopeId, newId)
      } else if (newId != null && newId !== id) {
        // Saved under the previous key; this identity starts a fresh draft.
        newSaved = false
      }
      newId = id
    }
    tracker.record({
      scopeId: opts.scopeId,
      table: opts.table,
      id,
      original: wrap(opts.cloneOriginal()),
      current: wrap(current),
      builder,
    })
  }

  function schedule() {
    if (timer != null) clearTimeout(timer)
    timer = setTimeout(sync, 200)
  }

  function flush() {
    if (timer != null) {
      clearTimeout(timer)
      sync()
    }
  }

  function onSaved() {
    if (!opts.isNew()) return
    const current = opts.cloneCurrent()
    newId = opts.getId(current)
    newSaved = true
    tracker.record({
      scopeId: opts.scopeId,
      table: opts.table,
      id: newId,
      original: null,
      current: wrap(current),
      builder,
    })
  }

  function trackDeleted(id: EntityId, original: T) {
    flush()
    tracker.markDeleted(opts.scopeId, opts.table, id, wrap(original), builder)
  }

  watch(opts.watchSources, schedule, { deep: true })

  return { flush, onSaved, trackDeleted }
}

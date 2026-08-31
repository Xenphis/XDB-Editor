import { computed, markRaw, ref } from 'vue'
import { defineStore } from 'pinia'
import type { FieldChange } from '@core/composables/useQueryGenerator'

/**
 * Session-wide change tracker.
 *
 * Records, for every DB entity touched during the app session, a frozen
 * snapshot of its state at first modification ("original") plus its latest
 * state ("current"). Unlike the per-editor unsaved layer, executing changes
 * against the database does NOT reset these entries: they represent the net
 * patch of the whole session and are only cleared on app close (in-memory),
 * DB disconnect, or an explicit reset from the SQL Session panel.
 */

export type EntityId = number | string

/** Plain deep-cloned snapshot of one entity aggregate (main row + sub-tables). */
export interface EntitySnapshot {
  main: Record<string, unknown>
  /** Keyed by sub-table tableName; value = plain rows[] or a single row object. */
  subs?: Record<string, unknown>
}

/**
 * Pure SQL/diff builders provided by the owning editor store. They close over
 * the store's table metadata (tableName, primaryKey, sub-table configs) but
 * must not read any live editor state — only the snapshots they are given.
 */
export interface SessionSqlBuilder {
  statements(original: EntitySnapshot | null, current: EntitySnapshot | null, id: EntityId): string[]
  fieldChanges(original: EntitySnapshot | null, current: EntitySnapshot | null, id: EntityId): FieldChange[]
}

export interface SessionRecordPayload {
  /** Unique per editor store (e.g. the main table name). */
  scopeId: string
  /** Main table, for display. */
  table: string
  id: EntityId
  /** Used only when the entity is not yet tracked; frozen afterwards. null = did not exist at session start. */
  original: EntitySnapshot | null
  /** null = deleted. */
  current: EntitySnapshot | null
  builder: SessionSqlBuilder
  /** Optional human-readable name for the panel card. */
  label?: string
}

export type SessionChangeKind = 'created' | 'modified' | 'deleted'

export interface SessionChange {
  key: string
  table: string
  id: EntityId
  kind: SessionChangeKind
  label?: string
  fieldChanges: FieldChange[]
  statements: string[]
  sql: string
  firstChangedAt: number
  updatedAt: number
}

interface TrackedEntity extends SessionChange {
  original: EntitySnapshot | null
  current: EntitySnapshot | null
  builder: SessionSqlBuilder
}

function entryKey(scopeId: string, id: EntityId): string {
  return `${scopeId}#${id}`
}

export const useSessionTrackerStore = defineStore('sessionTracker', () => {
  const entries = ref(new Map<string, TrackedEntity>())

  function record(payload: SessionRecordPayload): void {
    const key = entryKey(payload.scopeId, payload.id)
    const existing = entries.value.get(key)
    // The original is frozen at first modification and never overwritten.
    const original = existing ? existing.original : payload.original
    const statements = payload.builder.statements(original, payload.current, payload.id)
    if (!existing && statements.length === 0) {
      // No actual difference (watchers also fire on loads / pristine restores).
      return
    }
    const now = Date.now()
    entries.value.set(key, {
      key,
      table: payload.table,
      id: payload.id,
      kind: original === null ? 'created' : payload.current === null ? 'deleted' : 'modified',
      label: payload.label ?? existing?.label,
      fieldChanges: payload.builder.fieldChanges(original, payload.current, payload.id),
      statements,
      sql: statements.join('\n'),
      firstChangedAt: existing?.firstChangedAt ?? now,
      updatedAt: now,
      original: original ? markRaw(original) : null,
      current: payload.current ? markRaw(payload.current) : null,
      builder: markRaw(payload.builder),
    })
  }

  function markDeleted(
    scopeId: string,
    table: string,
    id: EntityId,
    original: EntitySnapshot | null,
    builder: SessionSqlBuilder,
  ): void {
    record({ scopeId, table, id, original, current: null, builder })
  }

  /** Drop one entry. Only meant for re-keying unsaved new entities whose typed PK changed. */
  function forget(scopeId: string, id: EntityId): void {
    entries.value.delete(entryKey(scopeId, id))
  }

  function reset(): void {
    entries.value.clear()
  }

  /**
   * Entries whose net diff is non-empty. Entries are kept (not deleted) when
   * their diff returns to empty, so the frozen original survives e.g. an
   * execute followed by a manual revert to the starting values.
   */
  const changes = computed<SessionChange[]>(() =>
    [...entries.value.values()]
      .filter(entry => entry.statements.length > 0)
      .sort((a, b) => a.firstChangedAt - b.firstChangedAt),
  )

  const totalChanges = computed(() => changes.value.length)

  const globalSqlScript = computed(() => changes.value.map(change => change.sql).join('\n'))

  return {
    changes,
    totalChanges,
    globalSqlScript,
    record,
    markDeleted,
    forget,
    reset,
  }
})

import { computed, reactive, ref, watch, type Ref } from 'vue'
import {
  generateDeleteQuery,
  generateDiffQuery,
  generateFullQuery,
  generateFullQueryStatements,
  getChangedFields,
  type FieldChange,
} from '@core/composables/useQueryGenerator'
import { executeBatch } from '@core/services/sql'
import {
  useSessionTrackerStore,
  type EntitySnapshot,
  type SessionSqlBuilder,
} from '@core/stores/sessionTracker'
import type { SubTableManager, SubTableSnapshot } from '@core/stores/SubTableManager'

export interface EntityEditorCache<T extends object> {
  formData: T
  originalValue: T
  subTables: Record<string, SubTableSnapshot>
}

export interface EntitySubTableBinding<T extends object, TLoaded = unknown> {
  manager: SubTableManager
  getParentId?: (formData: T, editingId: number | null) => number
  load?: (id: number, formData: T) => Promise<TLoaded>
  mapLoaded?: (data: TLoaded, id: number, formData: T) => unknown
  commitWhenMissing?: boolean
}

export interface CreateEntityEditorStoreOptions<T extends object> {
  tableName: string
  primaryKey: keyof T & string
  createDefault: () => T
  load?: (id: number) => Promise<T>
  delete?: (id: number) => Promise<void>
  subTables?: EntitySubTableBinding<T>[]
  getParentId?: (formData: T, editingId: number | null) => number
}

function cloneEntity<T extends object>(entity: T): T {
  return { ...entity }
}

export function createEntityEditorStore<T extends object>(options: CreateEntityEditorStoreOptions<T>) {
  const editing = ref(false)
  const editingId = ref<number | null>(null)
  const formData = reactive(options.createDefault()) as unknown as T
  const originalValue = ref<T | null>(null) as Ref<T | null>
  const editorDataLoaded = ref(false)
  const dirtyCache = ref<Map<number, EntityEditorCache<T>>>(new Map()) as Ref<Map<number, EntityEditorCache<T>>>
  const subTableBindings = options.subTables ?? []
  const subTables = subTableBindings.map(binding => binding.manager)

  let pendingOpen: Promise<void> | null = null
  let pendingOpenId: number | null = null

  function getBindingParentId(binding: EntitySubTableBinding<T>, data: T = formData, id: number | null = editingId.value): number {
    if (binding.getParentId) {
      return binding.getParentId(data, id)
    }
    if (options.getParentId) {
      return options.getParentId(data, id)
    }
    return Number((data as Record<string, unknown>)[options.primaryKey])
  }

  const changedFields = computed<FieldChange[]>(() => {
    if (!originalValue.value) return []
    return getChangedFields(
      originalValue.value as unknown as Record<string, unknown>,
      formData as unknown as Record<string, unknown>,
      options.primaryKey,
    )
  })

  const hasChanges = computed(() => changedFields.value.length > 0)

  const diffQuery = computed(() => {
    if (!originalValue.value) return ''
    return generateDiffQuery(
      options.tableName,
      options.primaryKey,
      originalValue.value as unknown as Record<string, unknown>,
      formData as unknown as Record<string, unknown>,
    )
  })

  const fullQuery = computed(() => generateFullQuery(
    options.tableName,
    options.primaryKey,
    formData as unknown as Record<string, unknown>,
  ))

  const combinedDiffQuery = computed(() => {
    const parts: string[] = []
    if (diffQuery.value) {
      parts.push(diffQuery.value)
    }
    for (const binding of subTableBindings) {
      const sql = binding.manager.getSqlDiff(getBindingParentId(binding))
      if (sql) {
        parts.push(sql)
      }
    }
    return parts.join('\n')
  })

  const combinedHasChanges = computed(() => {
    if (hasChanges.value) return true
    return subTableBindings.some(binding => Boolean(binding.manager.getSqlDiff(getBindingParentId(binding))))
  })

  const combinedChangedFields = computed<FieldChange[]>(() => {
    const fields = [...changedFields.value]
    for (const binding of subTableBindings) {
      fields.push(...binding.manager.getChangedFields(getBindingParentId(binding)))
    }
    return fields
  })

  const combinedFullQuery = computed(() => fullQuery.value)

  /** Ids with unsaved edits — drives the "modified" dot in EntityListPanel.
      Known blind spot: sub-table-only changes on cached, non-active entries
      are not detected here. (Unsaved layer only: the session tracker keeps
      its own copies and is not affected.) */
  const modifiedIds = computed<Set<number>>(() => {
    const ids = new Set<number>()
    for (const [id, cached] of dirtyCache.value) {
      if (id === editingId.value && editorDataLoaded.value) continue
      const changed = getChangedFields(
        cached.originalValue as unknown as Record<string, unknown>,
        cached.formData as unknown as Record<string, unknown>,
        options.primaryKey,
      )
      if (changed.length > 0) ids.add(id)
    }
    if (editingId.value != null && editorDataLoaded.value && combinedHasChanges.value) {
      ids.add(editingId.value)
    }
    return ids
  })

  // ─── Session tracking ─────────────────────────────────────────────
  // Feeds the session-wide tracker (src/stores/sessionTracker.ts): the
  // original state of an entity is frozen at its first modification and the
  // diff survives execute/save. Snapshots are plain clones — the tracker
  // never holds live editor state.

  const tracker = useSessionTrackerStore()
  const scopeId = options.tableName

  function takeCurrentSnapshot(): EntitySnapshot {
    const snapshot: EntitySnapshot = { main: { ...(formData as Record<string, unknown>) } }
    if (subTables.length > 0) {
      snapshot.subs = {}
      for (const manager of subTables) {
        snapshot.subs[manager.tableName] = manager.cloneLive()
      }
    }
    return snapshot
  }

  /** Last persisted state of the active entity; null for new entities (they don't exist yet). */
  function takeOriginalSnapshot(): EntitySnapshot | null {
    if (editingId.value == null || !originalValue.value) return null
    const snapshot: EntitySnapshot = { main: { ...(originalValue.value as Record<string, unknown>) } }
    if (subTables.length > 0) {
      snapshot.subs = {}
      for (const manager of subTables) {
        snapshot.subs[manager.tableName] = manager.cloneOriginal()
      }
    }
    return snapshot
  }

  function originalSnapshotFromCache(id: number): EntitySnapshot | null {
    const cached = dirtyCache.value.get(id)
    if (!cached) return null
    const snapshot: EntitySnapshot = { main: { ...(cached.originalValue as Record<string, unknown>) } }
    if (subTables.length > 0) {
      snapshot.subs = {}
      for (const manager of subTables) {
        snapshot.subs[manager.tableName] = cached.subTables[manager.tableName]?.original ?? null
      }
    }
    return snapshot
  }

  const sessionBuilder: SessionSqlBuilder = {
    statements(original, current, id) {
      if (current === null) {
        return original === null ? [] : [generateDeleteQuery(options.tableName, options.primaryKey, id)]
      }
      const statements: string[] = []
      if (original === null) {
        statements.push(...generateFullQueryStatements(options.tableName, options.primaryKey, current.main))
      } else {
        const diff = generateDiffQuery(options.tableName, options.primaryKey, original.main, current.main)
        if (diff) statements.push(diff)
      }
      const numericId = typeof id === 'number' ? id : Number(id)
      for (const binding of subTableBindings) {
        statements.push(...binding.manager.buildStatements(
          original?.subs?.[binding.manager.tableName] ?? null,
          current.subs?.[binding.manager.tableName] ?? null,
          getBindingParentId(binding, current.main as T, numericId),
        ))
      }
      return statements
    },
    fieldChanges(original, current, id) {
      if (current === null) {
        if (original === null) return []
        return [{ field: options.tableName, oldValue: `#${id}`, newValue: '(deleted)' }]
      }
      const base = original?.main ?? (options.createDefault() as Record<string, unknown>)
      const fields = getChangedFields(base, current.main, options.primaryKey)
      const numericId = typeof id === 'number' ? id : Number(id)
      for (const binding of subTableBindings) {
        fields.push(...binding.manager.buildFieldChanges(
          original?.subs?.[binding.manager.tableName] ?? null,
          current.subs?.[binding.manager.tableName] ?? null,
          getBindingParentId(binding, current.main as T, numericId),
        ))
      }
      return fields
    },
  }

  let syncTimer: ReturnType<typeof setTimeout> | null = null
  // New-entity drafts are keyed by their typed PK, which can change while
  // drafting; once saved, the entity exists in DB and must not be forgotten.
  let newEntityId: number | null = null
  let newEntitySaved = false

  function syncTracker() {
    syncTimer = null
    if (!editing.value || !editorDataLoaded.value) return
    const id = editingId.value ?? Number((formData as Record<string, unknown>)[options.primaryKey])
    if (Number.isNaN(id)) return
    if (editingId.value == null) {
      // Untouched blank editor: nothing to track yet.
      if (!combinedHasChanges.value && !newEntitySaved) return
      if (newEntityId != null && newEntityId !== id) {
        if (!newEntitySaved) tracker.forget(scopeId, newEntityId)
        newEntitySaved = false
      }
      newEntityId = id
    } else {
      newEntityId = null
      newEntitySaved = false
    }
    tracker.record({
      scopeId,
      table: options.tableName,
      id,
      original: takeOriginalSnapshot(),
      current: takeCurrentSnapshot(),
      builder: sessionBuilder,
    })
  }

  function scheduleTrackerSync() {
    if (syncTimer != null) clearTimeout(syncTimer)
    syncTimer = setTimeout(syncTracker, 200)
  }

  /** Run a pending sync now — must happen before any lifecycle change that
      swaps the active entity or overwrites originalValue (commitEditor). */
  function flushTrackerSync() {
    if (syncTimer != null) {
      clearTimeout(syncTimer)
      syncTracker()
    }
  }

  watch(
    [formData, ...subTables.map(manager => manager.getLive())],
    scheduleTrackerSync,
    { deep: true },
  )

  function resetSubTables() {
    for (const subTable of subTables) {
      subTable.reset()
    }
  }

  function commitSubTables() {
    for (const subTable of subTables) {
      subTable.commit()
    }
  }

  function snapshotSubTables(): Record<string, SubTableSnapshot> {
    const snapshots: Record<string, SubTableSnapshot> = {}
    for (const subTable of subTables) {
      snapshots[subTable.tableName] = subTable.snapshot()
    }
    return snapshots
  }

  function resetEditorState() {
    Object.assign(formData, options.createDefault())
    originalValue.value = null
    editorDataLoaded.value = false
    resetSubTables()
  }

  function saveToCache() {
    if (editingId.value == null || !editorDataLoaded.value) return
    dirtyCache.value.set(editingId.value, {
      formData: cloneEntity(formData),
      originalValue: originalValue.value ? cloneEntity(originalValue.value) : cloneEntity(formData),
      subTables: snapshotSubTables(),
    })
  }

  function restoreFromCache(id: number): boolean {
    const cached = dirtyCache.value.get(id)
    if (!cached) return false

    Object.assign(formData, cached.formData)
    originalValue.value = cloneEntity(cached.originalValue)
    for (const subTable of subTables) {
      const snapshot = cached.subTables[subTable.tableName]
      if (snapshot) {
        subTable.restore(snapshot)
      }
    }
    editorDataLoaded.value = true
    return true
  }

  async function loadSubTables(id: number) {
    await Promise.all(subTableBindings.map(async binding => {
      if (!binding.load) return
      const data = await binding.load(id, formData)
      if (data == null) {
        if (binding.commitWhenMissing) {
          binding.manager.commit()
        } else {
          binding.manager.reset()
        }
        return
      }
      binding.manager.load(binding.mapLoaded ? binding.mapLoaded(data, id, formData) : data)
    }))
  }

  async function openEditor(id: number | null) {
    if (pendingOpen && pendingOpenId === id) {
      return pendingOpen
    }

    // Attribute any pending edit to the entity that is still active.
    flushTrackerSync()
    // Navigating away from a new-entity draft is an implicit discard (new
    // drafts are not cached): drop its tracker entry unless it was saved.
    if (editingId.value == null && newEntityId != null) {
      if (!newEntitySaved) tracker.forget(scopeId, newEntityId)
      newEntityId = null
      newEntitySaved = false
    }

    const task = (async () => {
      saveToCache()
      editingId.value = id
      editing.value = true

      if (id != null && restoreFromCache(id)) {
        return
      }

      resetEditorState()

      if (id == null) {
        originalValue.value = cloneEntity(formData)
        commitSubTables()
        editorDataLoaded.value = true
        return
      }

      if (!options.load) {
        return
      }

      const data = await options.load(id)
      Object.assign(formData, data)
      originalValue.value = cloneEntity(data)
      await loadSubTables(id)
      editorDataLoaded.value = true
    })()

    pendingOpen = task.finally(() => {
      if (pendingOpen === task) {
        pendingOpen = null
        pendingOpenId = null
      }
    })
    pendingOpenId = id
    return pendingOpen
  }

  function closeEditor() {
    flushTrackerSync()
    saveToCache()
    editing.value = false
  }

  function discardEditor() {
    flushTrackerSync()
    if (editingId.value == null) {
      // Abandoned new-entity draft: unless saved, it never existed.
      if (newEntityId != null && !newEntitySaved) tracker.forget(scopeId, newEntityId)
      newEntityId = null
      newEntitySaved = false
    } else {
      const persisted = takeOriginalSnapshot()
      if (persisted) {
        // The draft is dropped: the entity's effective state falls back to
        // the last persisted one (empty diff if it was never executed).
        tracker.record({
          scopeId,
          table: options.tableName,
          id: editingId.value,
          original: persisted,
          current: persisted,
          builder: sessionBuilder,
        })
      }
    }
    if (editingId.value != null) {
      dirtyCache.value.delete(editingId.value)
    }
    editing.value = false
    editingId.value = null
    resetEditorState()
  }

  function discardChanges() {
    if (originalValue.value) {
      Object.assign(formData, originalValue.value)
    } else {
      Object.assign(formData, options.createDefault())
    }
    for (const subTable of subTables) {
      subTable.revert()
    }
  }

  function setFormData(data: T) {
    Object.assign(formData, data)
  }

  function setOriginalValue(data: T) {
    originalValue.value = cloneEntity(data)
  }

  function markEditorLoaded() {
    editorDataLoaded.value = true
  }

  function commitEditor() {
    originalValue.value = cloneEntity(formData)
    commitSubTables()
    if (editingId.value != null) {
      dirtyCache.value.delete(editingId.value)
    }
  }

  /**
   * Collect all pending statements (main table + sub-tables) for the current
   * editor. Existing entities are updated field-by-field; new entities
   * (editingId == null) are written as a full DELETE + INSERT.
   */
  function collectSaveStatements(): string[] {
    const statements: string[] = []

    if (editingId.value != null && originalValue.value) {
      const diff = generateDiffQuery(
        options.tableName,
        options.primaryKey,
        originalValue.value as unknown as Record<string, unknown>,
        formData as unknown as Record<string, unknown>,
      )
      if (diff) {
        statements.push(diff)
      }
    } else {
      statements.push(...generateFullQueryStatements(
        options.tableName,
        options.primaryKey,
        formData as unknown as Record<string, unknown>,
      ))
    }

    for (const binding of subTableBindings) {
      statements.push(...binding.manager.getSqlDiffStatements(getBindingParentId(binding)))
    }

    return statements
  }

  // All statements run in a single backend transaction: a failure in any
  // sub-table save rolls back the whole entity instead of leaving the
  // database half-updated.
  async function saveCurrent() {
    // Freeze the session original from the still-pristine originalValue
    // before commitEditor overwrites it.
    flushTrackerSync()
    const statements = collectSaveStatements()
    if (statements.length > 0) {
      await executeBatch(statements)
    }
    if (editingId.value == null) {
      // A saved new entity now exists in DB: make sure it is tracked even if
      // the draft was never edited, and protect it from draft-discard forget.
      newEntityId = Number((formData as Record<string, unknown>)[options.primaryKey])
      newEntitySaved = true
      tracker.record({
        scopeId,
        table: options.tableName,
        id: newEntityId,
        original: null,
        current: takeCurrentSnapshot(),
        builder: sessionBuilder,
      })
    }
    commitEditor()
  }

  async function deleteCurrent(id = editingId.value) {
    if (!options.delete || id == null) return
    flushTrackerSync()
    // Capture the entity's last persisted state before editor state is reset.
    const originalSnapshot =
      (editingId.value === id && editorDataLoaded.value ? takeOriginalSnapshot() : null)
      ?? originalSnapshotFromCache(id)
      ?? { main: { [options.primaryKey]: id } }
    await options.delete(id)
    dirtyCache.value.delete(id)
    if (editingId.value === id) {
      discardEditor()
    }
    tracker.markDeleted(scopeId, options.tableName, id, originalSnapshot, sessionBuilder)
  }

  return {
    editing,
    editingId,
    formData,
    originalValue,
    editorDataLoaded,
    dirtyCache,
    subTables,
    changedFields,
    hasChanges,
    diffQuery,
    fullQuery,
    combinedDiffQuery,
    combinedHasChanges,
    combinedChangedFields,
    combinedFullQuery,
    modifiedIds,
    saveToCache,
    restoreFromCache,
    openEditor,
    closeEditor,
    discardEditor,
    discardChanges,
    resetEditorState,
    setFormData,
    setOriginalValue,
    markEditorLoaded,
    commitEditor,
    saveCurrent,
    deleteCurrent,
  }
}
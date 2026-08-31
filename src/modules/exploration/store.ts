import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import type { ExplorationBasexp } from './types'
import type { FieldChange } from '@core/composables/useQueryGenerator'
import { useSessionTracking } from '@core/composables/useSessionTracking'
import * as explorationService from './service'

// ─── SQL helpers (primary key: level) ────────────────────────────────

function escapeVal(v: unknown): string {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number') return String(v)
  return `'${String(v).replace(/'/g, "''")}'`
}

const EDITABLE_KEYS: (keyof ExplorationBasexp)[] = ['basexp']

function normalize(v: unknown): unknown {
  return v === undefined || v === '' ? null : v
}

export function generateDiffQuery(original: ExplorationBasexp, current: ExplorationBasexp): string {
  const sets: string[] = []
  for (const key of EDITABLE_KEYS) {
    if (normalize(original[key]) !== normalize(current[key])) {
      sets.push(`\`${key}\` = ${escapeVal(current[key])}`)
    }
  }
  if (sets.length === 0) return ''
  return `UPDATE \`exploration_basexp\` SET ${sets.join(', ')} WHERE \`level\` = ${current.level};`
}

export function generateFullQuery(row: ExplorationBasexp): string {
  const cols: (keyof ExplorationBasexp)[] = ['level', 'basexp']
  const colNames = cols.map(c => `\`${c}\``).join(', ')
  const vals = cols.map(c => escapeVal(row[c])).join(', ')
  const del = `DELETE FROM \`exploration_basexp\` WHERE \`level\` = ${row.level};`
  const ins = `INSERT INTO \`exploration_basexp\` (${colNames}) VALUES (${vals});`
  return del + '\n' + ins
}

export function getChangedFields(original: ExplorationBasexp, current: ExplorationBasexp): FieldChange[] {
  const changes: FieldChange[] = []
  for (const key of EDITABLE_KEYS) {
    if (normalize(original[key]) !== normalize(current[key])) {
      changes.push({ field: key, oldValue: original[key], newValue: current[key] })
    }
  }
  return changes
}

// ─── Default factory ─────────────────────────────────────────────────

function createDefault(): ExplorationBasexp {
  return {
    level: 0,
    basexp: 0,
  }
}

// ─── Store ───────────────────────────────────────────────────────────

export const useExplorationBasexpStore = defineStore('explorationBasexpModule', () => {
  // --- List state ---
  const entries = ref<ExplorationBasexp[]>([])
  const loading = ref(false)
  const currentSearch = ref('')
  const listLoaded = ref(false)

  // --- Editor state ---
  const formData = reactive<ExplorationBasexp>(createDefault())
  const originalValue = ref<ExplorationBasexp | null>(null)
  const editorDataLoaded = ref(false)

  // --- Session tracking ---
  const tracking = useSessionTracking<ExplorationBasexp>({
    scopeId: 'exploration_basexp',
    table: 'exploration_basexp',
    editorDataLoaded,
    watchSources: [formData],
    isNew: () => originalValue.value === null,
    cloneCurrent: () => ({ ...formData }),
    cloneOriginal: () => (originalValue.value ? { ...originalValue.value } : null),
    getId: current => current.level,
    buildStatements: (original, current, id) => {
      if (current === null) {
        return original === null ? [] : [`DELETE FROM \`exploration_basexp\` WHERE \`level\` = ${Number(id)};`]
      }
      if (original === null) return generateFullQuery(current).split('\n')
      const query = generateDiffQuery(original, current)
      return query ? [query] : []
    },
    buildFieldChanges: (original, current, id) => {
      if (current === null) {
        return original === null ? [] : [{ field: 'exploration_basexp', oldValue: `#${id}`, newValue: '(deleted)' }]
      }
      return getChangedFields(original ?? createDefault(), current)
    },
  })

  // ─── Actions ─────────────────────────────────────────────────────

  async function fetchEntries(search?: string, limit?: number, offset?: number) {
    loading.value = true
    try {
      const result = await explorationService.getExplorationBasexps(search, limit, offset)
      entries.value = result.data
      currentSearch.value = search || ''
      listLoaded.value = true
      return result
    } finally {
      loading.value = false
    }
  }

  async function openEditor(level: number) {
    editorDataLoaded.value = false
    try {
      const data = await explorationService.getExplorationBasexp(level)
      Object.assign(formData, data)
      originalValue.value = structuredClone(data)
      editorDataLoaded.value = true
    } catch (error) {
      console.error('Failed to load exploration basexp:', error)
      throw error
    }
  }

  function openNew() {
    Object.assign(formData, createDefault())
    originalValue.value = null
    editorDataLoaded.value = true
  }

  async function saveEntry() {
    tracking.flush()
    await explorationService.saveExplorationBasexp(formData)
    tracking.onSaved()
    // Sync the unsaved layer with what was just persisted.
    originalValue.value = { ...formData }
    if (listLoaded.value) {
      await fetchEntries(currentSearch.value)
    }
  }

  async function deleteEntry(level: number) {
    await explorationService.deleteExplorationBasexp(level)
    tracking.trackDeleted(level, entries.value.find(e => e.level === level) ?? { ...createDefault(), level })
    if (listLoaded.value) {
      await fetchEntries(currentSearch.value)
    }
  }

  return {
    entries,
    loading,
    currentSearch,
    listLoaded,
    formData,
    originalValue,
    editorDataLoaded,
    fetchEntries,
    openEditor,
    openNew,
    saveEntry,
    deleteEntry,
  }
})

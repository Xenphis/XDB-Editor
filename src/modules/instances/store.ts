import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import type { AccessRequirement } from './types/access_requirement'
import type { FieldChange } from '@core/composables/useQueryGenerator'
import { useSessionTracking } from '@core/composables/useSessionTracking'
import * as instanceService from './service'

// ─── SQL helpers (composite primary key: mapId + difficulty) ─────────

function escapeVal(v: unknown): string {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number') return String(v)
  return `'${String(v).replace(/'/g, "''")}'`
}

const EDITABLE_KEYS: (keyof AccessRequirement)[] = [
  'level_min', 'level_max', 'item_level',
  'item', 'item2',
  'quest_done_A', 'quest_done_H',
  'completed_achievement',
  'quest_failed_text',
  'comment',
]

function normalize(v: unknown): unknown {
  return v === undefined || v === '' ? null : v
}

export function generateDiffQuery(original: AccessRequirement, current: AccessRequirement): string {
  const sets: string[] = []
  for (const key of EDITABLE_KEYS) {
    if (normalize(original[key]) !== normalize(current[key])) {
      sets.push(`\`${key}\` = ${escapeVal(current[key])}`)
    }
  }
  if (sets.length === 0) return ''
  return `UPDATE \`access_requirement\` SET ${sets.join(', ')} WHERE \`mapId\` = ${current.mapId} AND \`difficulty\` = ${current.difficulty};`
}

export function generateFullQuery(row: AccessRequirement): string {
  const cols: (keyof AccessRequirement)[] = [
    'mapId', 'difficulty', 'level_min', 'level_max', 'item_level',
    'item', 'item2',
    'quest_done_A', 'quest_done_H', 'completed_achievement',
    'quest_failed_text', 'comment',
  ]
  const colNames = cols.map(c => `\`${c}\``).join(', ')
  const vals = cols.map(c => escapeVal(row[c])).join(', ')
  const del = `DELETE FROM \`access_requirement\` WHERE \`mapId\` = ${row.mapId} AND \`difficulty\` = ${row.difficulty};`
  const ins = `INSERT INTO \`access_requirement\` (${colNames}) VALUES (${vals});`
  return del + '\n' + ins
}

export function getChangedFields(original: AccessRequirement, current: AccessRequirement): FieldChange[] {
  const changes: FieldChange[] = []
  for (const key of EDITABLE_KEYS) {
    if (normalize(original[key]) !== normalize(current[key])) {
      changes.push({ field: key, oldValue: original[key], newValue: current[key] })
    }
  }
  return changes
}

// ─── Default factory ─────────────────────────────────────────────────

function createDefault(): AccessRequirement {
  return {
    mapId: 0,
    difficulty: 0,
    level_min: 0,
    level_max: 0,
    item_level: 0,
    item: 0,
    item2: 0,
    quest_done_A: 0,
    quest_done_H: 0,
    completed_achievement: 0,
    quest_failed_text: null,
    comment: null,
  }
}

// ─── Store ───────────────────────────────────────────────────────────

export const useAccessRequirementStore = defineStore('accessRequirement', () => {
  // --- List state ---
  const entries = ref<AccessRequirement[]>([])
  const loading = ref(false)
  const currentSearch = ref('')
  const listLoaded = ref(false)

  // --- Editor state ---
  const formData = reactive<AccessRequirement>(createDefault())
  const originalValue = ref<AccessRequirement | null>(null)
  const editorDataLoaded = ref(false)

  // --- Session tracking ---
  const tracking = useSessionTracking<AccessRequirement>({
    scopeId: 'access_requirement',
    table: 'access_requirement',
    editorDataLoaded,
    watchSources: [formData],
    isNew: () => originalValue.value === null,
    cloneCurrent: () => ({ ...formData }),
    cloneOriginal: () => (originalValue.value ? { ...originalValue.value } : null),
    getId: current => `${current.mapId}:${current.difficulty}`,
    buildStatements: (original, current) => {
      if (current === null) {
        if (original === null) return []
        return [`DELETE FROM \`access_requirement\` WHERE \`mapId\` = ${original.mapId} AND \`difficulty\` = ${original.difficulty};`]
      }
      if (original === null) return generateFullQuery(current).split('\n')
      const query = generateDiffQuery(original, current)
      return query ? [query] : []
    },
    buildFieldChanges: (original, current, id) => {
      if (current === null) {
        return original === null ? [] : [{ field: 'access_requirement', oldValue: `#${id}`, newValue: '(deleted)' }]
      }
      return getChangedFields(original ?? createDefault(), current)
    },
  })

  // ─── Actions ─────────────────────────────────────────────────────

  async function fetchEntries(search?: string, limit?: number, offset?: number) {
    loading.value = true
    try {
      const result = await instanceService.getAccessRequirements(search, limit, offset)
      entries.value = result.data
      currentSearch.value = search || ''
      listLoaded.value = true
      return result
    } finally {
      loading.value = false
    }
  }

  async function openEditor(mapId: number, difficulty: number) {
    editorDataLoaded.value = false
    try {
      const data = await instanceService.getAccessRequirement(mapId, difficulty)
      Object.assign(formData, data)
      originalValue.value = structuredClone(data)
      editorDataLoaded.value = true
    } catch (error) {
      console.error('Failed to load access requirement:', error)
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
    await instanceService.saveAccessRequirement(formData)
    tracking.onSaved()
    // Sync the unsaved layer with what was just persisted.
    originalValue.value = { ...formData }
    if (listLoaded.value) {
      await fetchEntries(currentSearch.value)
    }
  }

  async function deleteEntry(mapId: number, difficulty: number) {
    await instanceService.deleteAccessRequirement(mapId, difficulty)
    tracking.trackDeleted(
      `${mapId}:${difficulty}`,
      entries.value.find(e => e.mapId === mapId && e.difficulty === difficulty)
        ?? { ...createDefault(), mapId, difficulty },
    )
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

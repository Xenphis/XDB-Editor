import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import type { InstanceEncounter } from '../types/instance_encounters'
import type { FieldChange } from '@core/composables/useQueryGenerator'
import * as instanceService from '../service'

// ─── SQL helpers (primary key: entry) ────────────────────────────────

function escapeVal(v: unknown): string {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number') return String(v)
  return `'${String(v).replace(/'/g, "''")}'`
}

const EDITABLE_KEYS: (keyof InstanceEncounter)[] = [
  'creditType', 'creditEntry', 'lastEncounterDungeon', 'comment',
]

function normalize(v: unknown): unknown {
  return v === undefined || v === '' ? null : v
}

export function generateDiffQuery(original: InstanceEncounter, current: InstanceEncounter): string {
  const sets: string[] = []
  for (const key of EDITABLE_KEYS) {
    if (normalize(original[key]) !== normalize(current[key])) {
      sets.push(`\`${key}\` = ${escapeVal(current[key])}`)
    }
  }
  if (sets.length === 0) return ''
  return `UPDATE \`instance_encounters\` SET ${sets.join(', ')} WHERE \`entry\` = ${current.entry};`
}

export function generateFullQuery(row: InstanceEncounter): string {
  const cols: (keyof InstanceEncounter)[] = [
    'entry', 'creditType', 'creditEntry', 'lastEncounterDungeon', 'comment',
  ]
  const colNames = cols.map(c => `\`${c}\``).join(', ')
  const vals = cols.map(c => escapeVal(row[c])).join(', ')
  const del = `DELETE FROM \`instance_encounters\` WHERE \`entry\` = ${row.entry};`
  const ins = `INSERT INTO \`instance_encounters\` (${colNames}) VALUES (${vals});`
  return del + '\n' + ins
}

export function getChangedFields(original: InstanceEncounter, current: InstanceEncounter): FieldChange[] {
  const changes: FieldChange[] = []
  for (const key of EDITABLE_KEYS) {
    if (normalize(original[key]) !== normalize(current[key])) {
      changes.push({ field: key, oldValue: original[key], newValue: current[key] })
    }
  }
  return changes
}

// ─── Default factory ─────────────────────────────────────────────────

function createDefault(): InstanceEncounter {
  return {
    entry: 0,
    creditType: 0,
    creditEntry: 0,
    lastEncounterDungeon: 0,
    comment: '',
  }
}

// ─── Store ───────────────────────────────────────────────────────────

export const useInstanceEncountersStore = defineStore('instanceEncountersModule', () => {
  // --- List state ---
  const entries = ref<InstanceEncounter[]>([])
  const loading = ref(false)
  const currentSearch = ref('')
  const listLoaded = ref(false)

  // --- Editor state ---
  const formData = reactive<InstanceEncounter>(createDefault())
  const originalValue = ref<InstanceEncounter | null>(null)
  const editorDataLoaded = ref(false)

  // ─── Actions ─────────────────────────────────────────────────────

  async function fetchEntries(search?: string, limit?: number, offset?: number) {
    loading.value = true
    try {
      const result = await instanceService.getInstanceEncounters(search, limit, offset)
      entries.value = result.data
      currentSearch.value = search || ''
      listLoaded.value = true
      return result
    } finally {
      loading.value = false
    }
  }

  async function openEditor(entry: number) {
    editorDataLoaded.value = false
    try {
      const data = await instanceService.getInstanceEncounter(entry)
      Object.assign(formData, data)
      originalValue.value = structuredClone(data)
      editorDataLoaded.value = true
    } catch (error) {
      console.error('Failed to load instance encounter:', error)
      throw error
    }
  }

  function openNew() {
    Object.assign(formData, createDefault())
    originalValue.value = null
    editorDataLoaded.value = true
  }

  async function saveEntry() {
    await instanceService.saveInstanceEncounter(formData)
    if (listLoaded.value) {
      await fetchEntries(currentSearch.value)
    }
  }

  async function deleteEntry(entry: number) {
    await instanceService.deleteInstanceEncounter(entry)
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

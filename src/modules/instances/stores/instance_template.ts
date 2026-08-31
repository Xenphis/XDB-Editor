import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import type { InstanceTemplate } from '../types/instance_template'
import type { FieldChange } from '@core/composables/useQueryGenerator'
import * as instanceService from '../service'

// ─── SQL helpers (primary key: map) ──────────────────────────────────

function escapeVal(v: unknown): string {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number') return String(v)
  return `'${String(v).replace(/'/g, "''")}'`
}

const EDITABLE_KEYS: (keyof InstanceTemplate)[] = ['parent', 'script', 'allowMount']

function normalize(v: unknown): unknown {
  return v === undefined || v === '' ? null : v
}

export function generateDiffQuery(original: InstanceTemplate, current: InstanceTemplate): string {
  const sets: string[] = []
  for (const key of EDITABLE_KEYS) {
    if (normalize(original[key]) !== normalize(current[key])) {
      sets.push(`\`${key}\` = ${escapeVal(current[key])}`)
    }
  }
  if (sets.length === 0) return ''
  return `UPDATE \`instance_template\` SET ${sets.join(', ')} WHERE \`map\` = ${current.map};`
}

export function generateFullQuery(row: InstanceTemplate): string {
  const cols: (keyof InstanceTemplate)[] = ['map', 'parent', 'script', 'allowMount']
  const colNames = cols.map(c => `\`${c}\``).join(', ')
  const vals = cols.map(c => escapeVal(row[c])).join(', ')
  const del = `DELETE FROM \`instance_template\` WHERE \`map\` = ${row.map};`
  const ins = `INSERT INTO \`instance_template\` (${colNames}) VALUES (${vals});`
  return del + '\n' + ins
}

export function getChangedFields(original: InstanceTemplate, current: InstanceTemplate): FieldChange[] {
  const changes: FieldChange[] = []
  for (const key of EDITABLE_KEYS) {
    if (normalize(original[key]) !== normalize(current[key])) {
      changes.push({ field: key, oldValue: original[key], newValue: current[key] })
    }
  }
  return changes
}

// ─── Default factory ─────────────────────────────────────────────────

function createDefault(): InstanceTemplate {
  return {
    map: 0,
    parent: 0,
    script: '',
    allowMount: 0,
  }
}

// ─── Store ───────────────────────────────────────────────────────────

export const useInstanceTemplateStore = defineStore('instanceTemplateModule', () => {
  // --- List state ---
  const entries = ref<InstanceTemplate[]>([])
  const loading = ref(false)
  const currentSearch = ref('')
  const listLoaded = ref(false)

  // --- Editor state ---
  const formData = reactive<InstanceTemplate>(createDefault())
  const originalValue = ref<InstanceTemplate | null>(null)
  const editorDataLoaded = ref(false)

  // ─── Actions ─────────────────────────────────────────────────────

  async function fetchEntries(search?: string, limit?: number, offset?: number) {
    loading.value = true
    try {
      const result = await instanceService.getInstanceTemplates(search, limit, offset)
      entries.value = result.data
      currentSearch.value = search || ''
      listLoaded.value = true
      return result
    } finally {
      loading.value = false
    }
  }

  async function openEditor(map: number) {
    editorDataLoaded.value = false
    try {
      const data = await instanceService.getInstanceTemplate(map)
      Object.assign(formData, data)
      originalValue.value = structuredClone(data)
      editorDataLoaded.value = true
    } catch (error) {
      console.error('Failed to load instance template:', error)
      throw error
    }
  }

  function openNew() {
    Object.assign(formData, createDefault())
    originalValue.value = null
    editorDataLoaded.value = true
  }

  async function saveEntry() {
    await instanceService.saveInstanceTemplate(formData)
    if (listLoaded.value) {
      await fetchEntries(currentSearch.value)
    }
  }

  async function deleteEntry(map: number) {
    await instanceService.deleteInstanceTemplate(map)
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

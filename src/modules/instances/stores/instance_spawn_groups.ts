import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import type { InstanceSpawnGroup } from '../types/instance_spawn_groups'
import type { FieldChange } from '@core/composables/useQueryGenerator'
import * as instanceService from '../service'

// ─── SQL helpers (composite key: instanceMapId + bossStateId + bossStates + spawnGroupId) ──

function escapeVal(v: unknown): string {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number') return String(v)
  return `'${String(v).replace(/'/g, "''")}'`
}

const EDITABLE_KEYS: (keyof InstanceSpawnGroup)[] = ['flags']

function normalize(v: unknown): unknown {
  return v === undefined || v === '' ? null : v
}

function whereClause(row: InstanceSpawnGroup): string {
  return `\`instanceMapId\` = ${row.instanceMapId} AND \`bossStateId\` = ${row.bossStateId} ` +
    `AND \`bossStates\` = ${row.bossStates} AND \`spawnGroupId\` = ${row.spawnGroupId}`
}

export function generateDiffQuery(original: InstanceSpawnGroup, current: InstanceSpawnGroup): string {
  const sets: string[] = []
  for (const key of EDITABLE_KEYS) {
    if (normalize(original[key]) !== normalize(current[key])) {
      sets.push(`\`${key}\` = ${escapeVal(current[key])}`)
    }
  }
  if (sets.length === 0) return ''
  return `UPDATE \`instance_spawn_groups\` SET ${sets.join(', ')} WHERE ${whereClause(current)};`
}

export function generateFullQuery(row: InstanceSpawnGroup): string {
  const cols: (keyof InstanceSpawnGroup)[] = [
    'instanceMapId', 'bossStateId', 'bossStates', 'spawnGroupId', 'flags',
  ]
  const colNames = cols.map(c => `\`${c}\``).join(', ')
  const vals = cols.map(c => escapeVal(row[c])).join(', ')
  const del = `DELETE FROM \`instance_spawn_groups\` WHERE ${whereClause(row)};`
  const ins = `INSERT INTO \`instance_spawn_groups\` (${colNames}) VALUES (${vals});`
  return del + '\n' + ins
}

export function getChangedFields(original: InstanceSpawnGroup, current: InstanceSpawnGroup): FieldChange[] {
  const changes: FieldChange[] = []
  for (const key of EDITABLE_KEYS) {
    if (normalize(original[key]) !== normalize(current[key])) {
      changes.push({ field: key, oldValue: original[key], newValue: current[key] })
    }
  }
  return changes
}

// ─── Default factory ─────────────────────────────────────────────────

function createDefault(): InstanceSpawnGroup {
  return {
    instanceMapId: 0,
    bossStateId: 0,
    bossStates: 0,
    spawnGroupId: 0,
    flags: 0,
  }
}

// ─── Store ───────────────────────────────────────────────────────────

export const useInstanceSpawnGroupsStore = defineStore('instanceSpawnGroupsModule', () => {
  // --- List state ---
  const entries = ref<InstanceSpawnGroup[]>([])
  const loading = ref(false)
  const currentSearch = ref('')
  const listLoaded = ref(false)

  // --- Editor state ---
  const formData = reactive<InstanceSpawnGroup>(createDefault())
  const originalValue = ref<InstanceSpawnGroup | null>(null)
  const editorDataLoaded = ref(false)

  // ─── Actions ─────────────────────────────────────────────────────

  async function fetchEntries(search?: string, limit?: number, offset?: number) {
    loading.value = true
    try {
      const result = await instanceService.getInstanceSpawnGroups(search, limit, offset)
      entries.value = result.data
      currentSearch.value = search || ''
      listLoaded.value = true
      return result
    } finally {
      loading.value = false
    }
  }

  async function openEditor(
    instanceMapId: number,
    bossStateId: number,
    bossStates: number,
    spawnGroupId: number,
  ) {
    editorDataLoaded.value = false
    try {
      const data = await instanceService.getInstanceSpawnGroup(instanceMapId, bossStateId, bossStates, spawnGroupId)
      Object.assign(formData, data)
      originalValue.value = structuredClone(data)
      editorDataLoaded.value = true
    } catch (error) {
      console.error('Failed to load instance spawn group:', error)
      throw error
    }
  }

  function openNew() {
    Object.assign(formData, createDefault())
    originalValue.value = null
    editorDataLoaded.value = true
  }

  async function saveEntry() {
    await instanceService.saveInstanceSpawnGroup(formData)
    if (listLoaded.value) {
      await fetchEntries(currentSearch.value)
    }
  }

  async function deleteEntry(
    instanceMapId: number,
    bossStateId: number,
    bossStates: number,
    spawnGroupId: number,
  ) {
    await instanceService.deleteInstanceSpawnGroup(instanceMapId, bossStateId, bossStates, spawnGroupId)
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

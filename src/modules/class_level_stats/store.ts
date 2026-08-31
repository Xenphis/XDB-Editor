import { defineStore } from 'pinia'
import { reactive, ref, computed } from 'vue'
import type { CreatureClassLevelStats } from './types'
import type { FieldChange } from '@core/composables/useQueryGenerator'
import { useSessionTracking } from '@core/composables/useSessionTracking'
import * as classLevelStatsService from './service'

// ─── Class definitions ────────────────────────────────────────────────────────

export const CLASS_IDS = [1, 2, 4, 8] as const

// ─── SQL helpers ──────────────────────────────────────────────────────────────

function escapeVal(v: unknown): string {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number') return String(v)
  return `'${String(v).replace(/'/g, "''")}'`
}

const EDITABLE_KEYS: (keyof CreatureClassLevelStats)[] = [
  'basehp0', 'basehp1', 'basehp2',
  'basemana', 'basearmor',
  'attackpower', 'rangedattackpower',
  'damage_base', 'damage_exp1', 'damage_exp2',
  'comment',
]

function normalize(v: unknown): unknown {
  return v === undefined || v === '' ? null : v
}

export function generateDiffQuery(original: CreatureClassLevelStats, current: CreatureClassLevelStats): string {
  const sets: string[] = []
  for (const key of EDITABLE_KEYS) {
    if (normalize(original[key]) !== normalize(current[key])) {
      sets.push(`\`${key}\` = ${escapeVal(current[key])}`)
    }
  }
  if (sets.length === 0) return ''
  return `UPDATE \`creature_classlevelstats\` SET ${sets.join(', ')} WHERE \`level\` = ${current.level} AND \`class\` = ${current.class};`
}

export function generateFullQuery(row: CreatureClassLevelStats): string {
  const cols: (keyof CreatureClassLevelStats)[] = [
    'level', 'class', 'basehp0', 'basehp1', 'basehp2',
    'basemana', 'basearmor', 'attackpower', 'rangedattackpower',
    'damage_base', 'damage_exp1', 'damage_exp2', 'comment',
  ]
  const colNames = cols.map(c => `\`${c}\``).join(', ')
  const vals = cols.map(c => escapeVal(row[c])).join(', ')
  const del = `DELETE FROM \`creature_classlevelstats\` WHERE \`level\` = ${row.level} AND \`class\` = ${row.class};`
  const ins = `INSERT INTO \`creature_classlevelstats\` (${colNames}) VALUES (${vals});`
  return del + '\n' + ins
}

export function getChangedFields(original: CreatureClassLevelStats, current: CreatureClassLevelStats): FieldChange[] {
  const changes: FieldChange[] = []
  for (const key of EDITABLE_KEYS) {
    if (normalize(original[key]) !== normalize(current[key])) {
      changes.push({ field: key, oldValue: original[key], newValue: current[key] })
    }
  }
  return changes
}

// ─── Default factory ──────────────────────────────────────────────────────────

function createDefault(): CreatureClassLevelStats {
  return {
    level: 1,
    class: 1,
    basehp0: 1,
    basehp1: 1,
    basehp2: 1,
    basemana: 1,
    basearmor: 1,
    attackpower: 0,
    rangedattackpower: 0,
    damage_base: 0,
    damage_exp1: 0,
    damage_exp2: 0,
    comment: null,
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCreatureClassLevelStatsStore = defineStore('creatureClassLevelStats', () => {
  // --- List state ---
  const entries = ref<CreatureClassLevelStats[]>([])
  const loading = ref(false)
  const listLoaded = ref(false)

  // --- Editor state ---
  const formData = reactive<CreatureClassLevelStats>(createDefault())
  const originalValue = ref<CreatureClassLevelStats | null>(null)
  const editorDataLoaded = ref(false)

  // --- Session tracking ---
  const tracking = useSessionTracking<CreatureClassLevelStats>({
    scopeId: 'creature_classlevelstats',
    table: 'creature_classlevelstats',
    editorDataLoaded,
    watchSources: [formData],
    isNew: () => originalValue.value === null,
    cloneCurrent: () => ({ ...formData }),
    cloneOriginal: () => (originalValue.value ? { ...originalValue.value } : null),
    getId: current => `${current.level}:${current.class}`,
    buildStatements: (original, current) => {
      if (current === null) {
        if (original === null) return []
        return [`DELETE FROM \`creature_classlevelstats\` WHERE \`level\` = ${original.level} AND \`class\` = ${original.class};`]
      }
      if (original === null) return generateFullQuery(current).split('\n')
      const query = generateDiffQuery(original, current)
      return query ? [query] : []
    },
    buildFieldChanges: (original, current, id) => {
      if (current === null) {
        return original === null ? [] : [{ field: 'creature_classlevelstats', oldValue: `#${id}`, newValue: '(deleted)' }]
      }
      return getChangedFields(original ?? createDefault(), current)
    },
  })

  // --- Computed matrix ---
  // Map: level → (class → row)
  const matrixData = computed(() => {
    const map: Record<number, Record<number, CreatureClassLevelStats>> = {}
    for (const row of entries.value) {
      const levelRows = map[row.level] ?? (map[row.level] = {})
      levelRows[row.class] = row
    }
    return map
  })

  const uniqueLevels = computed<number[]>(() => {
    const levels = new Set(entries.value.map(r => r.level))
    return [...levels].sort((a, b) => a - b)
  })

  // ─── Actions ─────────────────────────────────────────────────────────────

  async function fetchEntries() {
    loading.value = true
    try {
      entries.value = await classLevelStatsService.getCreatureClassLevelStats()
      listLoaded.value = true
    } finally {
      loading.value = false
    }
  }

  async function openEditor(level: number, classId: number) {
    editorDataLoaded.value = false
    try {
      const data = await classLevelStatsService.getCreatureClassLevelStat(level, classId)
      Object.assign(formData, data)
      originalValue.value = structuredClone(data)
      editorDataLoaded.value = true
    } catch (error) {
      console.error('Failed to load creature_classlevelstat:', error)
      throw error
    }
  }

  async function saveEntry() {
    tracking.flush()
    await classLevelStatsService.saveCreatureClassLevelStat(formData)
    tracking.onSaved()
    // Sync the unsaved layer with what was just persisted.
    originalValue.value = { ...formData }
    if (listLoaded.value) {
      await fetchEntries()
    }
  }

  return {
    entries,
    loading,
    listLoaded,
    formData,
    originalValue,
    editorDataLoaded,
    matrixData,
    uniqueLevels,
    fetchEntries,
    openEditor,
    saveEntry,
  }
})

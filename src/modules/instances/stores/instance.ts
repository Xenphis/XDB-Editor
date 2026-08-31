import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import type { InstanceTemplate } from '../types/instance_template'
import type { InstanceSpawnGroup } from '../types/instance_spawn_groups'
import type { InstanceEncounter } from '../types/instance_encounters'
import type { FieldChange } from '@core/composables/useQueryGenerator'
import { useSessionTracking } from '@core/composables/useSessionTracking'
import * as instanceService from '../service'
import {
  generateDiffQuery as tplDiff,
  generateFullQuery as tplFull,
  getChangedFields as tplChanged,
} from './instance_template'
import {
  generateDiffQuery as sgDiff,
  generateFullQuery as sgFull,
} from './instance_spawn_groups'
import {
  generateDiffQuery as encDiff,
  generateFullQuery as encFull,
} from './instance_encounters'

// ─── Row identity (synthetic uid to diff child collections) ──────────

let uidCounter = 1
function nextUid(): number {
  return uidCounter++
}

type WithUid<T> = T & { _uid: number }

function tag<T>(rows: T[]): WithUid<T>[] {
  return rows.map(r => ({ ...r, _uid: nextUid() }))
}

function strip<T>(row: WithUid<T>): T {
  const { _uid, ...rest } = row as WithUid<T> & Record<string, unknown>
  return rest as unknown as T
}

// ─── Child DELETE helpers (composite / simple keys) ──────────────────

function spawnGroupDelete(row: InstanceSpawnGroup): string {
  return `DELETE FROM \`instance_spawn_groups\` WHERE \`instanceMapId\` = ${row.instanceMapId} ` +
    `AND \`bossStateId\` = ${row.bossStateId} AND \`bossStates\` = ${row.bossStates} ` +
    `AND \`spawnGroupId\` = ${row.spawnGroupId};`
}

function encounterDelete(row: InstanceEncounter): string {
  return `DELETE FROM \`instance_encounters\` WHERE \`entry\` = ${row.entry};`
}

function rowsEqual<T extends object>(a: T, b: T): boolean {
  const keys = Object.keys(a) as (keyof T)[]
  return keys.every(k => k === '_uid' || a[k] === b[k])
}

// ─── Default factories ───────────────────────────────────────────────

function createTemplate(): InstanceTemplate {
  return { map: 0, parent: 0, script: '', allowMount: 0 }
}

function newSpawnGroup(map: number): WithUid<InstanceSpawnGroup> {
  return { _uid: nextUid(), instanceMapId: map, bossStateId: 0, bossStates: 0, spawnGroupId: 0, flags: 0 }
}

function newEncounter(): WithUid<InstanceEncounter> {
  return { _uid: nextUid(), entry: 0, creditType: 0, creditEntry: 0, lastEncounterDungeon: 0, comment: '' }
}

// ─── Pure aggregate diff (uid-stripped snapshots) ────────────────────

export interface InstanceAggregate {
  template: InstanceTemplate
  spawnGroups: InstanceSpawnGroup[]
  encounters: InstanceEncounter[]
}

/** Per-table changes between two plain aggregates; null original = new instance. */
function buildInstanceQueries(
  original: InstanceAggregate | null,
  current: InstanceAggregate,
): { table: string; query: string }[] {
  const out: { table: string; query: string }[] = []

  // Template
  if (original) {
    const q = tplDiff(original.template, current.template)
    if (q) out.push({ table: 'instance_template', query: q })
  } else {
    out.push({ table: 'instance_template', query: tplFull(current.template) })
  }

  // Spawn groups
  const curSg = current.spawnGroups
  const origSg = original?.spawnGroups ?? []
  // removed
  for (const orig of origSg) {
    const stillThere = curSg.some(c => rowsEqual(c, orig))
    const sameKey = curSg.some(c =>
      c.instanceMapId === orig.instanceMapId && c.bossStateId === orig.bossStateId &&
      c.bossStates === orig.bossStates && c.spawnGroupId === orig.spawnGroupId)
    if (!stillThere && !sameKey) {
      out.push({ table: 'instance_spawn_groups', query: spawnGroupDelete(orig) })
    }
  }
  // added / changed
  for (const cur of curSg) {
    const orig = origSg.find(o =>
      o.instanceMapId === cur.instanceMapId && o.bossStateId === cur.bossStateId &&
      o.bossStates === cur.bossStates && o.spawnGroupId === cur.spawnGroupId)
    if (!orig) {
      out.push({ table: 'instance_spawn_groups', query: sgFull(cur) })
    } else if (!rowsEqual(orig, cur)) {
      const q = sgDiff(orig, cur)
      if (q) out.push({ table: 'instance_spawn_groups', query: q })
    }
  }

  // Encounters
  const curEnc = current.encounters
  const origEnc = original?.encounters ?? []
  for (const orig of origEnc) {
    const sameKey = curEnc.some(c => c.entry === orig.entry)
    if (!sameKey) out.push({ table: 'instance_encounters', query: encounterDelete(orig) })
  }
  for (const cur of curEnc) {
    const orig = origEnc.find(o => o.entry === cur.entry)
    if (!orig) {
      out.push({ table: 'instance_encounters', query: encFull(cur) })
    } else if (!rowsEqual(orig, cur)) {
      const q = encDiff(orig, cur)
      if (q) out.push({ table: 'instance_encounters', query: q })
    }
  }

  return out
}

// ─── Store ───────────────────────────────────────────────────────────

export const useInstanceStore = defineStore('instanceModule', () => {
  // --- List state (instance_template rows = the instances) ---
  const entries = ref<InstanceTemplate[]>([])
  const loading = ref(false)
  const currentSearch = ref('')
  const listLoaded = ref(false)

  // --- Editor state ---
  const isNew = ref(false)
  const editorDataLoaded = ref(false)

  // Template tab
  const template = reactive<InstanceTemplate>(createTemplate())
  const originalTemplate = ref<InstanceTemplate | null>(null)

  // Spawn groups tab
  const spawnGroups = ref<WithUid<InstanceSpawnGroup>[]>([])
  const originalSpawnGroups = ref<InstanceSpawnGroup[]>([])

  // Encounters tab
  const encounters = ref<WithUid<InstanceEncounter>[]>([])
  const originalEncounters = ref<InstanceEncounter[]>([])

  // ─── List actions ────────────────────────────────────────────────

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

  // ─── Editor actions ──────────────────────────────────────────────

  async function openEditor(map: number) {
    editorDataLoaded.value = false
    isNew.value = false
    try {
      const [tpl, sgs, encs] = await Promise.all([
        instanceService.getInstanceTemplate(map),
        instanceService.getInstanceSpawnGroupsByMap(map),
        instanceService.getInstanceEncountersByMap(map),
      ])
      Object.assign(template, tpl)
      originalTemplate.value = structuredClone(tpl)
      spawnGroups.value = tag(sgs)
      originalSpawnGroups.value = structuredClone(sgs)
      encounters.value = tag(encs)
      originalEncounters.value = structuredClone(encs)
      editorDataLoaded.value = true
    } catch (error) {
      console.error('Failed to load instance:', error)
      throw error
    }
  }

  function openNew() {
    isNew.value = true
    Object.assign(template, createTemplate())
    originalTemplate.value = null
    spawnGroups.value = []
    originalSpawnGroups.value = []
    encounters.value = []
    originalEncounters.value = []
    editorDataLoaded.value = true
  }

  function addSpawnGroup() {
    spawnGroups.value.push(newSpawnGroup(template.map))
  }

  function removeSpawnGroup(index: number) {
    spawnGroups.value.splice(index, 1)
  }

  function addEncounter() {
    encounters.value.push(newEncounter())
  }

  function removeEncounter(index: number) {
    encounters.value.splice(index, 1)
  }

  // ─── Diff helpers ────────────────────────────────────────────────

  function liveAggregate(): InstanceAggregate {
    return {
      template: { ...template },
      spawnGroups: spawnGroups.value.map(strip),
      encounters: encounters.value.map(strip),
    }
  }

  function originalAggregate(): InstanceAggregate | null {
    if (!originalTemplate.value) return null
    return {
      template: { ...originalTemplate.value },
      spawnGroups: originalSpawnGroups.value.map(r => ({ ...r })),
      encounters: originalEncounters.value.map(r => ({ ...r })),
    }
  }

  /** Per-table changes used for the SQL panel. */
  function buildQueries(): { table: string; query: string }[] {
    return buildInstanceQueries(originalAggregate(), liveAggregate())
  }

  function diffQueryText(): string {
    return buildQueries().map(q => q.query).join('\n')
  }

  function changedFields(): FieldChange[] {
    const fields: FieldChange[] = []
    if (originalTemplate.value) {
      fields.push(...tplChanged(originalTemplate.value, template))
    }
    return fields
  }

  function hasChanges(): boolean {
    return buildQueries().length > 0
  }

  // --- Session tracking ---
  const tracking = useSessionTracking<InstanceAggregate>({
    scopeId: 'instance',
    table: 'instance_template',
    editorDataLoaded,
    watchSources: [template, spawnGroups, encounters],
    isNew: () => originalTemplate.value === null,
    cloneCurrent: liveAggregate,
    cloneOriginal: originalAggregate,
    getId: current => current.template.map,
    buildStatements: (original, current, id) => {
      if (current === null) {
        return original === null ? [] : [`DELETE FROM \`instance_template\` WHERE \`map\` = ${Number(id)};`]
      }
      return buildInstanceQueries(original, current).map(q => q.query)
    },
    buildFieldChanges: (original, current, id) => {
      if (current === null) {
        return original === null ? [] : [{ field: 'instance_template', oldValue: `#${id}`, newValue: '(deleted)' }]
      }
      const fields = tplChanged(original?.template ?? createTemplate(), current.template)
      // Child tables: summarize row counts when their rows differ.
      const queries = buildInstanceQueries(original, current)
      for (const [table, origRows, curRows] of [
        ['instance_spawn_groups', original?.spawnGroups ?? [], current.spawnGroups],
        ['instance_encounters', original?.encounters ?? [], current.encounters],
      ] as const) {
        if (queries.some(q => q.table === table)) {
          fields.push({ field: table, oldValue: `${origRows.length} row(s)`, newValue: `${curRows.length} row(s)` })
        }
      }
      return fields
    },
  })

  // ─── Persistence ─────────────────────────────────────────────────

  async function saveEntry() {
    tracking.flush()

    // Template
    await instanceService.saveInstanceTemplate(template)

    // Spawn groups: delete removed, upsert current
    for (const orig of originalSpawnGroups.value) {
      const sameKey = spawnGroups.value.some(c =>
        c.instanceMapId === orig.instanceMapId && c.bossStateId === orig.bossStateId &&
        c.bossStates === orig.bossStates && c.spawnGroupId === orig.spawnGroupId)
      if (!sameKey) {
        await instanceService.deleteInstanceSpawnGroup(orig.instanceMapId, orig.bossStateId, orig.bossStates, orig.spawnGroupId)
      }
    }
    for (const cur of spawnGroups.value) {
      await instanceService.saveInstanceSpawnGroup(strip(cur))
    }

    // Encounters: delete removed, upsert current
    for (const orig of originalEncounters.value) {
      const sameKey = encounters.value.some(c => c.entry === orig.entry)
      if (!sameKey) await instanceService.deleteInstanceEncounter(orig.entry)
    }
    for (const cur of encounters.value) {
      await instanceService.saveInstanceEncounter(strip(cur))
    }

    tracking.onSaved()
    // Sync the unsaved layer with what was just persisted.
    originalTemplate.value = { ...template }
    originalSpawnGroups.value = spawnGroups.value.map(strip)
    originalEncounters.value = encounters.value.map(strip)

    if (listLoaded.value) {
      await fetchEntries(currentSearch.value)
    }
  }

  async function deleteEntry(map: number) {
    await instanceService.deleteInstanceTemplate(map)
    tracking.trackDeleted(map, {
      template: entries.value.find(e => e.map === map) ?? { ...createTemplate(), map },
      spawnGroups: [],
      encounters: [],
    })
    if (listLoaded.value) {
      await fetchEntries(currentSearch.value)
    }
  }

  return {
    // list
    entries,
    loading,
    currentSearch,
    listLoaded,
    fetchEntries,
    // editor
    isNew,
    editorDataLoaded,
    template,
    originalTemplate,
    spawnGroups,
    encounters,
    openEditor,
    openNew,
    addSpawnGroup,
    removeSpawnGroup,
    addEncounter,
    removeEncounter,
    diffQueryText,
    changedFields,
    hasChanges,
    saveEntry,
    deleteEntry,
  }
})

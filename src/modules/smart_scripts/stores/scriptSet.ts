import { ref, markRaw, type Ref } from 'vue'
import type { FieldChange } from '@core/composables/useQueryGenerator'
import type { SubTableManager, SubTableSnapshot } from '@core/stores/SubTableManager'
import { toSqlLiteral } from '@core/utils/sql'
import type { SmartScript } from '../types/smart_scripts'
import {
  getSaiActionDef,
  getSaiEventDef,
  getSaiTargetDef,
  SAI_SOURCE_TYPE_TIMED_ACTIONLIST,
} from '../types/sai'

// The whole editable state of one SmartAI editor entity: every row of the
// owner's script plus the rows of its referenced timed actionlists, flat.
// Rows are grouped by (entryorguid, source_type) when generating SQL.
export interface SmartScriptSetState {
  rows: SmartScript[]
  /** Statements hooking the script to its owner (UPDATE AIName / INSERT
      areatrigger_scripts), emitted once alongside any row change. */
  ownerHookStatements: string[]
}

export const SMART_SCRIPT_COLUMNS: (keyof SmartScript)[] = [
  'entryorguid', 'source_type', 'id', 'link',
  'event_type', 'event_phase_mask', 'event_chance', 'event_flags',
  'event_param1', 'event_param2', 'event_param3', 'event_param4',
  'action_type', 'action_param1', 'action_param2', 'action_param3',
  'action_param4', 'action_param5', 'action_param6',
  'target_type', 'target_param1', 'target_param2', 'target_param3',
  'target_x', 'target_y', 'target_z', 'target_o', 'comment',
]

// (source_type, entryorguid) → single route/list key and back. source_type is
// 0-9, so one decimal digit is enough; works for negative (per-guid) entries.
export function encodeScriptKey(entryorguid: number, sourceType: number): number {
  return entryorguid * 10 + (entryorguid < 0 ? -sourceType : sourceType)
}

export function decodeScriptKey(key: number): { entryorguid: number; sourceType: number } {
  const sourceType = Math.abs(key % 10)
  const entryorguid = (key - (key < 0 ? -sourceType : sourceType)) / 10
  return { entryorguid, sourceType }
}

export function groupKeyOf(row: SmartScript): string {
  return `${row.source_type}:${row.entryorguid}`
}

export function createDefaultRow(entryorguid: number, sourceType: number, id: number): SmartScript {
  return {
    entryorguid,
    source_type: sourceType,
    id,
    link: 0,
    event_type: 0,
    event_phase_mask: 0,
    event_chance: 100,
    event_flags: 0,
    event_param1: 0,
    event_param2: 0,
    event_param3: 0,
    event_param4: 0,
    action_type: 0,
    action_param1: 0,
    action_param2: 0,
    action_param3: 0,
    action_param4: 0,
    action_param5: 0,
    action_param6: 0,
    target_type: 1,
    target_param1: 0,
    target_param2: 0,
    target_param3: 0,
    target_x: 0,
    target_y: 0,
    target_z: 0,
    target_o: 0,
    comment: '',
  }
}

/**
 * Reassign sequential ids (0..n-1, array order) to one (entryorguid,
 * source_type) group and remap `link` values accordingly. Links pointing to
 * removed rows fall back to 0. Mutates the rows in place.
 */
export function renumberGroup(rows: SmartScript[], entryorguid: number, sourceType: number): void {
  const group = rows.filter(row => row.entryorguid === entryorguid && row.source_type === sourceType)
  const idMap = new Map(group.map((row, index) => [row.id, index]))
  for (const row of group) {
    row.id = idMap.get(row.id) ?? 0
    row.link = row.link !== 0 ? (idMap.get(row.link) ?? 0) : 0
  }
}

function cloneState(state: SmartScriptSetState): SmartScriptSetState {
  return {
    rows: state.rows.map(row => ({ ...row })),
    ownerHookStatements: [...state.ownerHookStatements],
  }
}

function emptyState(): SmartScriptSetState {
  return { rows: [], ownerHookStatements: [] }
}

function rowsEqual(a: SmartScript, b: SmartScript): boolean {
  return SMART_SCRIPT_COLUMNS.every(column => a[column] === b[column])
}

function rowKey(row: SmartScript): string {
  return `${row.source_type}:${row.entryorguid}:${row.id}`
}

/** Inspector label: "#3" for the owner's own rows, "list 1739800 #3" for actionlists. */
function rowLabel(row: SmartScript): string {
  return row.source_type === SAI_SOURCE_TYPE_TIMED_ACTIONLIST
    ? `list ${row.entryorguid} #${row.id}`
    : `#${row.id}`
}

// Always the event→action phrase: the comment often stays identical while the
// row changes, which would render the inspector diff useless ("old → old").
function summarizeRow(row: SmartScript): string {
  const event = getSaiEventDef(row.event_type)
  const action = getSaiActionDef(row.action_type)
  const target = getSaiTargetDef(row.target_type)
  return `${event?.name ?? row.event_type} → ${action?.name ?? row.action_type} → ${target?.name ?? row.target_type}`
}

function groupRows(rows: SmartScript[]): Map<string, SmartScript[]> {
  const groups = new Map<string, SmartScript[]>()
  for (const row of rows) {
    const key = groupKeyOf(row)
    const group = groups.get(key)
    if (group) {
      group.push(row)
    } else {
      groups.set(key, [row])
    }
  }
  return groups
}

function groupsEqual(a: SmartScript[], b: SmartScript[]): boolean {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort((x, y) => x.id - y.id)
  const sortedB = [...b].sort((x, y) => x.id - y.id)
  return sortedA.every((row, index) => rowsEqual(row, sortedB[index]!))
}

function buildGroupReplace(groupKey: string, rows: SmartScript[]): string[] {
  const [sourceType, entryorguid] = groupKey.split(':').map(Number)
  const statements = [
    `DELETE FROM \`smart_scripts\` WHERE \`entryorguid\` = ${entryorguid} AND \`source_type\` = ${sourceType};`,
  ]
  if (rows.length > 0) {
    const columns = SMART_SCRIPT_COLUMNS.map(column => `\`${column}\``).join(', ')
    const tuples = [...rows]
      .sort((a, b) => a.id - b.id)
      .map(row => `(${SMART_SCRIPT_COLUMNS.map(column => toSqlLiteral(row[column])).join(', ')})`)
    statements.push(`INSERT INTO \`smart_scripts\` (${columns}) VALUES\n${tuples.join(',\n')};`)
  }
  return statements
}

/**
 * SubTableManager holding the full script set of one owner. Persistence is a
 * full replace per touched (entryorguid, source_type) group — the standard
 * TrinityCore way of shipping SAI scripts — so row ids can be renumbered
 * freely by the editor.
 */
export class SmartScriptSet implements SubTableManager {
  readonly tableName = 'smart_scripts'
  readonly live: Ref<SmartScriptSetState>
  readonly original: Ref<SmartScriptSetState | null>

  constructor() {
    this.live = ref(emptyState())
    this.original = ref(null) as Ref<SmartScriptSetState | null>
    markRaw(this)
  }

  get rows(): SmartScript[] {
    return this.live.value.rows
  }

  get hookStatements(): string[] {
    return this.live.value.ownerHookStatements
  }

  snapshot(): SubTableSnapshot {
    return {
      new: cloneState(this.live.value),
      original: cloneState(this.original.value ?? this.live.value),
    }
  }

  restore(cached: SubTableSnapshot): void {
    this.live.value = cloneState(cached.new as SmartScriptSetState)
    this.original.value = cloneState(cached.original as SmartScriptSetState)
  }

  reset(): void {
    this.live.value = emptyState()
    this.original.value = null
  }

  load(data: unknown): void {
    const state = data as SmartScriptSetState
    this.live.value = cloneState(state)
    this.original.value = cloneState(state)
  }

  commit(): void {
    // The owner hook has been applied by the save that triggered this commit:
    // drop it so later diffs stop re-emitting it. (The session tracker keeps
    // its own frozen pre-save original and still exports it once.)
    this.live.value.ownerHookStatements = []
    this.original.value = cloneState(this.live.value)
  }

  revert(): void {
    this.live.value = this.original.value ? cloneState(this.original.value) : emptyState()
  }

  getSqlDiff(parentId: number): string {
    return this.getSqlDiffStatements(parentId).join('\n')
  }

  getSqlDiffStatements(parentId: number): string[] {
    if (!this.original.value) return []
    return this.buildStatements(cloneState(this.original.value), cloneState(this.live.value), parentId)
  }

  getChangedFields(parentId: number): FieldChange[] {
    if (!this.original.value) return []
    return this.buildFieldChanges(cloneState(this.original.value), cloneState(this.live.value), parentId)
  }

  getLive(): object {
    return this.live
  }

  cloneLive(): unknown {
    return cloneState(this.live.value)
  }

  cloneOriginal(): unknown | null {
    return this.original.value ? cloneState(this.original.value) : null
  }

  /** Full-replace statements for every group, regardless of changes (inspector "full" view). */
  fullReplaceStatements(): string[] {
    const statements: string[] = []
    for (const [key, group] of groupRows(this.live.value.rows)) {
      statements.push(...buildGroupReplace(key, group))
    }
    return statements
  }

  buildStatements(original: unknown | null, current: unknown | null, _parentId: number): string[] {
    if (current == null) return []
    const originalState = original as SmartScriptSetState | null
    const currentState = current as SmartScriptSetState
    const originalGroups = groupRows(originalState?.rows ?? [])
    const currentGroups = groupRows(currentState.rows)

    const statements: string[] = []
    for (const [key, group] of originalGroups) {
      const currentGroup = currentGroups.get(key)
      if (!currentGroup) {
        statements.push(...buildGroupReplace(key, []))
      } else if (!groupsEqual(group, currentGroup)) {
        statements.push(...buildGroupReplace(key, currentGroup))
      }
    }
    for (const [key, group] of currentGroups) {
      if (!originalGroups.has(key)) {
        statements.push(...buildGroupReplace(key, group))
      }
    }

    if (statements.length === 0) return []
    // Frozen original wins: for the session tracker it reflects the owner
    // state at first modification, before any save applied the hook.
    const hook = originalState?.ownerHookStatements.length
      ? originalState.ownerHookStatements
      : currentState.ownerHookStatements
    return [...hook, ...statements]
  }

  buildFieldChanges(original: unknown | null, current: unknown | null, _parentId: number): FieldChange[] {
    if (current == null) return []
    const originalRows = (original as SmartScriptSetState | null)?.rows ?? []
    const currentRows = (current as SmartScriptSetState).rows

    const changes: FieldChange[] = []
    const originalMap = new Map(originalRows.map(row => [rowKey(row), row]))
    const currentMap = new Map(currentRows.map(row => [rowKey(row), row]))
    for (const [key, row] of originalMap) {
      if (!currentMap.has(key)) {
        changes.push({ field: rowLabel(row), oldValue: summarizeRow(row), newValue: '(deleted)' })
      }
    }
    for (const [key, row] of currentMap) {
      const originalRow = originalMap.get(key)
      if (!originalRow) {
        changes.push({ field: rowLabel(row), oldValue: '(none)', newValue: summarizeRow(row) })
        continue
      }
      // One entry per changed column: a row summary alone would render
      // identical old/new values for edits to phases, flags, chance or params.
      for (const column of SMART_SCRIPT_COLUMNS) {
        if (originalRow[column] !== row[column]) {
          changes.push({
            field: `${rowLabel(row)}.${column}`,
            oldValue: originalRow[column],
            newValue: row[column],
          })
        }
      }
    }
    return changes
  }
}

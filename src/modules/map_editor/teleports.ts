import type { FieldChange } from '@core/composables/useQueryGenerator'
import { useSessionTrackerStore, type SessionSqlBuilder } from '@core/stores/sessionTracker'
import type { GameTele } from './types'
import { deleteGameTele, saveGameTele } from './service'

/**
 * game_tele writes for the map editor, taken over from the standalone
 * teleport editor that used to own this table.
 *
 * Saves go straight to the database (like everything else in this module),
 * and the equivalent statement is also recorded in the session tracker so the
 * SQL Session panel keeps showing the net patch of the session.
 */

const EDITABLE_KEYS: (keyof GameTele)[] = [
  'position_x', 'position_y', 'position_z', 'orientation', 'map', 'name',
]

const ALL_KEYS: (keyof GameTele)[] = ['id', ...EDITABLE_KEYS]

function escapeVal(v: unknown): string {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number') return String(v)
  return `'${String(v).replace(/'/g, "''")}'`
}

function normalize(v: unknown): unknown {
  return v === undefined || v === '' ? null : v
}

/** Zeroed row: a created teleport is diffed against it, so the session panel
 * lists what was actually filled in rather than nothing at all. */
function emptyRow(): GameTele {
  return { id: 0, position_x: 0, position_y: 0, position_z: 0, orientation: 0, map: 0, name: '' }
}

export function generateDiffQuery(original: GameTele, current: GameTele): string {
  const sets: string[] = []
  for (const key of EDITABLE_KEYS) {
    if (normalize(original[key]) !== normalize(current[key])) {
      sets.push(`\`${key}\` = ${escapeVal(current[key])}`)
    }
  }
  if (sets.length === 0) return ''
  return `UPDATE \`game_tele\` SET ${sets.join(', ')} WHERE \`id\` = ${current.id};`
}

export function generateFullQuery(row: GameTele): string {
  const colNames = ALL_KEYS.map(c => `\`${c}\``).join(', ')
  const vals = ALL_KEYS.map(c => escapeVal(row[c])).join(', ')
  const del = `DELETE FROM \`game_tele\` WHERE \`id\` = ${row.id};`
  const ins = `INSERT INTO \`game_tele\` (${colNames}) VALUES (${vals});`
  return del + '\n' + ins
}

export function getChangedFields(original: GameTele, current: GameTele): FieldChange[] {
  const changes: FieldChange[] = []
  for (const key of EDITABLE_KEYS) {
    if (normalize(original[key]) !== normalize(current[key])) {
      changes.push({ field: key, oldValue: original[key], newValue: current[key] })
    }
  }
  return changes
}

/** Pure builders for the session panel; a null side means created / deleted. */
const sessionBuilder: SessionSqlBuilder = {
  statements: (original, current, id) => {
    const before = original?.main as GameTele | undefined
    const after = current?.main as GameTele | undefined
    if (!after) return before ? [`DELETE FROM \`game_tele\` WHERE \`id\` = ${Number(id)};`] : []
    if (!before) return generateFullQuery(after).split('\n')
    const query = generateDiffQuery(before, after)
    return query ? [query] : []
  },
  fieldChanges: (original, current, id) => {
    const before = original?.main as GameTele | undefined
    const after = current?.main as GameTele | undefined
    if (!after) {
      return before ? [{ field: 'game_tele', oldValue: `#${id}`, newValue: '(deleted)' }] : []
    }
    return getChangedFields(before ?? emptyRow(), after)
  },
}

/**
 * Persists one teleport. `original` is the row as it was loaded, or null when
 * creating — the session entry is a "created" one in that case.
 */
export async function saveTeleport(row: GameTele, original: GameTele | null): Promise<void> {
  await saveGameTele(row)
  useSessionTrackerStore().record({
    scopeId: 'game_tele',
    table: 'game_tele',
    id: row.id,
    original: original ? { main: { ...original } } : null,
    current: { main: { ...row } },
    builder: sessionBuilder,
    label: row.name || undefined,
  })
}

export async function deleteTeleport(row: GameTele): Promise<void> {
  await deleteGameTele(row.id)
  useSessionTrackerStore().markDeleted('game_tele', 'game_tele', row.id, { main: { ...row } }, sessionBuilder)
}

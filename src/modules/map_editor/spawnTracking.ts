import type { FieldChange } from '@core/composables/useQueryGenerator'
import { useSessionTrackerStore, type SessionSqlBuilder } from '@core/stores/sessionTracker'
import type { CreatureSpawnMarker, SpawnTransform } from './types'

/**
 * Feeds the spawn edits of the 3D view into the session tracker, so the SQL
 * Session panel lists them next to every other change. A move or turn is only
 * staged (the panel offers the UPDATE to copy), a delete goes straight to the
 * database; either way the tracker holds the net patch of the session.
 *
 * The tracked snapshot is the four placement columns, taken from the marker as
 * loaded. The tracker freezes the first one, so later moves of the same spawn
 * always diff against where the database has it.
 */

const SCOPE = 'creature'

const PLACEMENT: { key: keyof Placement; column: string; angle?: boolean }[] = [
  { key: 'position_x', column: 'position_x' },
  { key: 'position_y', column: 'position_y' },
  { key: 'position_z', column: 'position_z' },
  { key: 'orientation', column: 'orientation', angle: true },
]

interface Placement {
  position_x: number
  position_y: number
  position_z: number
  orientation: number
}

/** Below this a column is considered unchanged (same tolerance as the panel). */
const EPSILON = 1e-4

function changed(a: number, b: number, angle?: boolean): boolean {
  if (!angle) return Math.abs(a - b) >= EPSILON
  const diff = Math.abs(a - b) % (2 * Math.PI)
  return Math.min(diff, 2 * Math.PI - diff) >= EPSILON
}

function moved(before: Placement, after: Placement) {
  return PLACEMENT.filter(p => changed(before[p.key], after[p.key], p.angle))
}

const builder: SessionSqlBuilder = {
  statements: (original, current, id) => {
    const before = original?.main as unknown as Placement | undefined
    const after = current?.main as unknown as Placement | undefined
    if (!before) return []
    // The row is gone; whatever it was moved to first no longer matters.
    if (!after) return [`DELETE FROM \`creature\` WHERE \`guid\` = ${Number(id)};`]
    const sets = moved(before, after).map(p => `\`${p.column}\` = ${after[p.key].toFixed(4)}`)
    return sets.length ? [`UPDATE \`creature\` SET ${sets.join(', ')} WHERE \`guid\` = ${Number(id)};`] : []
  },
  fieldChanges: (original, current, id) => {
    const before = original?.main as unknown as Placement | undefined
    const after = current?.main as unknown as Placement | undefined
    if (!before) return []
    if (!after) return [{ field: 'creature', oldValue: `#${id}`, newValue: '(deleted)' }]
    return moved(before, after).map<FieldChange>(p => ({
      field: p.column,
      oldValue: before[p.key],
      newValue: after[p.key],
    }))
  },
}

function placementOf(spawn: CreatureSpawnMarker): Placement {
  return {
    position_x: spawn.position_x,
    position_y: spawn.position_y,
    position_z: spawn.position_z,
    orientation: spawn.orientation,
  }
}

/** A move/turn (or its undo: `transform` null puts the spawn back). */
export function trackSpawnTransform(spawn: CreatureSpawnMarker, transform: SpawnTransform | null): void {
  const origin = placementOf(spawn)
  useSessionTrackerStore().record({
    scopeId: SCOPE,
    table: 'creature',
    id: spawn.guid,
    original: { main: { ...origin } },
    current: {
      main: transform
        ? { position_x: transform.x, position_y: transform.y, position_z: transform.z, orientation: transform.orientation }
        : { ...origin },
    },
    builder,
    label: spawn.name || undefined,
  })
}

/** The spawn's row was deleted from the database. */
export function trackSpawnDelete(spawn: CreatureSpawnMarker): void {
  useSessionTrackerStore().markDeleted(
    SCOPE,
    'creature',
    spawn.guid,
    { main: { ...placementOf(spawn) } },
    builder,
  )
}

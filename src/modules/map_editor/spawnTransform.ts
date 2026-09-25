import { computed, ref, type Ref } from 'vue'
import type { CreatureSpawnMarker, SpawnTransform } from './types'

/**
 * Edit state of the spawn selected in the 3D view: where it has been moved or
 * turned to, the undo history behind that, and the `UPDATE` that writes it.
 *
 * `current` is null while the spawn stands where the DB has it, so "nothing
 * changed" needs no comparison. Every change — a gizmo drag, a right-click
 * placement, a reset — pushes the state it replaces, so each one undoes on its
 * own, the reset included.
 *
 * Nothing here touches the scene: the 3D view watches `current` and moves the
 * model to match, which is how an undo reaches it.
 */

/** Below this the column is considered unchanged (a drag that went nowhere). */
const EPSILON = 1e-4

function originOf(spawn: CreatureSpawnMarker): SpawnTransform {
  return {
    x: spawn.position_x,
    y: spawn.position_y,
    z: spawn.position_z,
    orientation: spawn.orientation,
  }
}

function same(a: number, b: number): boolean {
  return Math.abs(a - b) < EPSILON
}

/** Angles compare around the circle: a full turn back lands on 0, not 2π. */
function sameAngle(a: number, b: number): boolean {
  const diff = Math.abs(a - b) % (2 * Math.PI)
  return Math.min(diff, 2 * Math.PI - diff) < EPSILON
}

function sameTransform(a: SpawnTransform, b: SpawnTransform): boolean {
  return (
    same(a.x, b.x) &&
    same(a.y, b.y) &&
    same(a.z, b.z) &&
    sameAngle(a.orientation, b.orientation)
  )
}

export function useSpawnTransform(spawn: Ref<CreatureSpawnMarker | null>) {
  const current = ref<SpawnTransform | null>(null)
  /** States replaced by each change, most recent last. */
  const history = ref<(SpawnTransform | null)[]>([])

  const canUndo = computed(() => history.value.length > 0)
  const dirty = computed(() => current.value !== null)

  /** Settles on null when the spawn is back where the DB has it. */
  function settle(transform: SpawnTransform | null): SpawnTransform | null {
    if (!transform || !spawn.value) return null
    return sameTransform(transform, originOf(spawn.value)) ? null : { ...transform }
  }

  function apply(transform: SpawnTransform) {
    if (!spawn.value) return
    const next = settle(transform)
    // A click on a handle, or a drag back to the start: nothing to undo.
    const previous = current.value
    if (next === previous || (next && previous && sameTransform(next, previous))) return
    history.value.push(previous)
    current.value = next
  }

  function undo() {
    if (history.value.length === 0) return
    current.value = history.value.pop() ?? null
  }

  function reset() {
    if (!current.value) return
    history.value.push(current.value)
    current.value = null
  }

  function clear() {
    current.value = null
    history.value = []
  }

  /** Only the columns that moved, so a rotation does not rewrite the position. */
  const migrationSql = computed(() => {
    const target = current.value
    if (!spawn.value || !target) return ''
    const origin = originOf(spawn.value)
    const sets: string[] = []
    if (!same(target.x, origin.x)) sets.push(`position_x = ${target.x.toFixed(4)}`)
    if (!same(target.y, origin.y)) sets.push(`position_y = ${target.y.toFixed(4)}`)
    if (!same(target.z, origin.z)) sets.push(`position_z = ${target.z.toFixed(4)}`)
    if (!sameAngle(target.orientation, origin.orientation)) {
      sets.push(`orientation = ${target.orientation.toFixed(4)}`)
    }
    if (sets.length === 0) return ''
    return `UPDATE creature SET ${sets.join(', ')} WHERE guid = ${spawn.value.guid};`
  })

  return { current, canUndo, dirty, apply, undo, reset, clear, migrationSql }
}

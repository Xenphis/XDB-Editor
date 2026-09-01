import { computed } from 'vue'
import { getChangedFields } from '@core/composables/useQueryGenerator'
import { useSpellTuningStore } from '@/modules/spells/store'

/**
 * Per-section "modified" state for the spell tuning editor, one computed per
 * `ReactiveSubTable` — same shape as `useNpcFieldModifiers`' addon/movement
 * helpers, for the same reason: each manager is `markRaw`'d, so its changes
 * must be read through its own `getOriginalEntry()` / `newEntry` pair rather
 * than through the store's own reactivity. Written out per section rather
 * than through a shared generic helper: Pinia's inferred store type omits
 * `ReactiveSubTable`'s private fields, so a helper typed against the class
 * itself does not accept what `store.bonus` actually resolves to.
 */
export function useSpellTuningFieldModifiers() {
  const store = useSpellTuningStore()

  const bonusModified = computed(() => {
    const original = store.bonus.getOriginalEntry()
    if (!original) return new Set<string>()
    const current = store.bonus.newEntry
    // Touch every field so Vue's dependency tracking sees the mutation.
    void Object.values(current)
    const changed = getChangedFields(
      original as unknown as Record<string, unknown>,
      current as unknown as Record<string, unknown>,
      store.bonus.primaryKey,
    )
    return new Set(changed.map(c => c.field))
  })

  const threatModified = computed(() => {
    const original = store.threat.getOriginalEntry()
    if (!original) return new Set<string>()
    const current = store.threat.newEntry
    void Object.values(current)
    const changed = getChangedFields(
      original as unknown as Record<string, unknown>,
      current as unknown as Record<string, unknown>,
      store.threat.primaryKey,
    )
    return new Set(changed.map(c => c.field))
  })

  const customAttrModified = computed(() => {
    const original = store.customAttr.getOriginalEntry()
    if (!original) return new Set<string>()
    const current = store.customAttr.newEntry
    void Object.values(current)
    const changed = getChangedFields(
      original as unknown as Record<string, unknown>,
      current as unknown as Record<string, unknown>,
      store.customAttr.primaryKey,
    )
    return new Set(changed.map(c => c.field))
  })

  return {
    isBonusModified: (field: string) => bonusModified.value.has(field),
    isThreatModified: (field: string) => threatModified.value.has(field),
    isCustomAttrModified: (field: string) => customAttrModified.value.has(field),
  }
}

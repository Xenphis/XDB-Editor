import { computed, toRef } from 'vue'
import { useQueryGenerator, getChangedFields } from '@core/composables/useQueryGenerator'
import { useNpcModuleStore } from '@/modules/npc/store'
import type { CreatureTemplate } from '@/modules/npc/types/creature_template/creature_template'

export function useNpcFieldModifiers() {
  const store = useNpcModuleStore()

  const form = store.formData
  const originalValue = toRef(store, 'originalValue')

  // Main table field changes (creature_template)
  const { changedFields } = useQueryGenerator<CreatureTemplate>(
    'creature_template',
    'entry',
    originalValue,
    form,
  )

  // Movement and addon: access reactive objects directly to ensure Vue tracks dependencies
  // We must access the properties of the reactive object to trigger Vue's dependency tracking
  // since the SubTableManager instances are marked with markRaw()
  const movementChangedFields = computed(() => {
    const original = store.movement.getOriginalEntry()
    if (!original) return []
    const current = store.movement.newEntry
    // Touch all fields to ensure reactive tracking
    void Object.values(current)
    return getChangedFields(
      original as unknown as Record<string, unknown>,
      current as unknown as Record<string, unknown>,
      store.movement.primaryKey,
    )
  })
  const addonChangedFields = computed(() => {
    const original = store.addon.getOriginalEntry()
    if (!original) return []
    const current = store.addon.newEntry
    // Touch all fields to ensure reactive tracking
    void Object.values(current)
    return getChangedFields(
      original as unknown as Record<string, unknown>,
      current as unknown as Record<string, unknown>,
      store.addon.primaryKey,
    )
  })

  const onKillRepChangedFields = computed(() => {
    const original = store.onKillRep.getOriginalEntry()
    if (!original) return []
    const current = store.onKillRep.newEntry
    void Object.values(current)
    return getChangedFields(
      original as unknown as Record<string, unknown>,
      current as unknown as Record<string, unknown>,
      store.onKillRep.primaryKey,
    )
  })

  const modifiedFieldSet = computed(() => new Set(changedFields.value.map(c => c.field)))
  const movementModifiedFieldSet = computed(() => new Set(movementChangedFields.value.map(c => c.field)))
  const addonModifiedFieldSet = computed(() => new Set(addonChangedFields.value.map(c => c.field)))
  const onKillRepModifiedFieldSet = computed(() => new Set(onKillRepChangedFields.value.map(c => c.field)))

  function isFieldModified(field: string): boolean {
    return modifiedFieldSet.value.has(field)
  }

  function isMovementModified(field: string): boolean {
    return movementModifiedFieldSet.value.has(field)
  }

  function isAddonModified(field: string): boolean {
    return addonModifiedFieldSet.value.has(field)
  }

  function isOnKillRepModified(field: string): boolean {
    return onKillRepModifiedFieldSet.value.has(field)
  }

  return {
    isFieldModified,
    isMovementModified,
    isAddonModified,
    isOnKillRepModified,
  }
}

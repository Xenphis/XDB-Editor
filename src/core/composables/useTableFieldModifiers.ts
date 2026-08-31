import { computed, toRef } from 'vue'
import type { FieldChange } from '@core/composables/useQueryGenerator'

/**
 * Field-modifier helper for the hand-written table editors: works with any
 * store exposing `formData` and `originalValue`, plus its own
 * `getChangedFields`. Feeds the "modified" dot on EditorField and the
 * inspector's change list.
 */
export function useTableFieldModifiers<T extends object>(
  store: { formData: T; originalValue: T | null },
  getChangedFields: (original: T, current: T) => FieldChange[],
) {
  const form = store.formData
  const originalValue = toRef(store, 'originalValue')

  const changedFields = computed(() => {
    if (!originalValue.value) return []
    return getChangedFields(originalValue.value, form)
  })

  const modifiedFieldSet = computed(() => new Set(changedFields.value.map(c => c.field)))

  function isFieldModified(field: string): boolean {
    return modifiedFieldSet.value.has(field)
  }

  return {
    isFieldModified,
    changedFields,
  }
}

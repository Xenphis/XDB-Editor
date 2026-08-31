import { computed } from 'vue'
import { useTrainerStore } from '@/modules/npc/stores/trainerStore'
import type { Trainer } from '@/modules/npc/types/trainer/trainer'

export function useTrainerFieldModifiers() {
  const store = useTrainerStore()
  const modifiedFieldSet = computed(() => new Set(store.changedFields.map(c => c.field)))

  function isFieldModified(field: keyof Trainer): boolean {
    return modifiedFieldSet.value.has(field)
  }

  return { isFieldModified }
}

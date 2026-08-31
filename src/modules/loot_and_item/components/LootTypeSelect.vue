<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Select from 'primevue/select'
import { LOOT_TYPES, type LootType } from '../types'

/**
 * Type picker sitting above the loot list, in the same spot as the Object
 * section's `ObjectTableSwitch`. A dropdown rather than a SelectButton: six
 * tables don't fit in a toggle strip, and there is room for more later.
 *
 * Switching drops the current selection — the tables share nothing but the
 * list frame — but not the pending edits: each type keeps its own store.
 *
 * No `size` prop on purpose: `styles/forms.css` pins every select to
 * `--input-height` and centers its label with a matching `line-height`, so
 * PrimeVue's `small` variant would add its own vertical padding on top of a box
 * that is already a fixed height — which is what pushed the label off-centre.
 */

const props = defineProps<{ modelValue: LootType }>()

const { t } = useI18n()
const router = useRouter()

const options = computed(() =>
  LOOT_TYPES.map(value => ({
    value,
    label: t(`lootAndItem.submodules.${value}.title`),
  })),
)

function onChange(value: LootType) {
  if (value === props.modelValue) return
  void router.push(`/loot-items/${value}`)
}
</script>

<template>
  <div class="loot-type-select">
    <Select
      :modelValue="modelValue"
      :options="options"
      optionLabel="label"
      optionValue="value"
      fluid
      @update:modelValue="onChange"
    />
  </div>
</template>

<style scoped>
.loot-type-select {
  /* Right padding clears the workspace's absolutely positioned collapse
     toggle, which sits over this corner (same as ObjectTableSwitch). */
  padding: 0.6rem 2.1rem 0 0.6rem;
  flex-shrink: 0;
}
</style>

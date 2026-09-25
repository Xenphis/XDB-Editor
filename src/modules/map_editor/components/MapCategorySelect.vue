<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Select from 'primevue/select'
import { MAP_CATEGORIES, type MapCategory } from '../types'

/**
 * List picker above the map list, in the same spot as the loot section's
 * `LootTypeSelect`: open-world zones or dungeon/raid instances. The page
 * restores the category's own last selection on a switch.
 *
 * No `size` prop, for the same reason as `LootTypeSelect`: `styles/forms.css`
 * already pins every select to `--input-height`.
 */

const props = defineProps<{ modelValue: MapCategory }>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: MapCategory): void
}>()

const { t } = useI18n()

const options = computed(() =>
  MAP_CATEGORIES.map(value => ({
    value,
    label: t(`mapEditor.categories.${value}`),
  })),
)

function onChange(value: MapCategory) {
  if (value !== props.modelValue) emit('update:modelValue', value)
}
</script>

<template>
  <div class="map-category-select">
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
.map-category-select {
  /* Right padding clears the workspace's absolutely positioned collapse
     toggle, which sits over this corner (same as LootTypeSelect). */
  padding: 0.6rem 2.1rem 0 0.6rem;
  flex-shrink: 0;
}
</style>

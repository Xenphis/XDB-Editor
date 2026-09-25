<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Select from 'primevue/select'
import { ZONES } from '@/modules/map_editor/data/zones'

/**
 * Zone picker above the quest list, in the same spot as the loot section's
 * `LootTypeSelect`: narrows the list to quests whose giver (creature or
 * gameobject) stands in the chosen zone. '' = no filter.
 *
 * No `size` prop, for the same reason as `LootTypeSelect`: `styles/forms.css`
 * already pins every select to `--input-height`.
 */

defineProps<{ modelValue: string }>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const { t, te } = useI18n()

/** Localized zone name; a zone without a translation shows its raw id. */
function zoneName(id: string): string {
  const key = `mapEditor.zones.names.${id}`
  return te(key) ? t(key) : id
}

const options = computed(() => [
  { value: '', label: t('quest.zoneFilter.all') },
  // Continents in map order, zones alphabetically within each (per locale).
  ...[...ZONES]
    .map(zone => ({ zone, label: zoneName(zone.id) }))
    .sort((a, b) => a.zone.map - b.zone.map || a.label.localeCompare(b.label))
    .map(({ zone, label }) => ({ value: zone.id, label })),
])
</script>

<template>
  <div class="quest-zone-select">
    <Select
      :modelValue="modelValue"
      :options="options"
      optionLabel="label"
      optionValue="value"
      :placeholder="t('quest.zoneFilter.placeholder')"
      fluid
      @update:modelValue="(v: string) => emit('update:modelValue', v ?? '')"
    />
  </div>
</template>

<style scoped>
.quest-zone-select {
  /* Right padding clears the workspace's absolutely positioned collapse
     toggle, which sits over this corner (same as LootTypeSelect). */
  padding: 0.6rem 2.1rem 0 0.6rem;
  flex-shrink: 0;
}
</style>

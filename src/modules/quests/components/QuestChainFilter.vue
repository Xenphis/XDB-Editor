<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Popover from 'primevue/popover'
import Select from 'primevue/select'

/**
 * Chain scope of the quest list, as the square filter button next to the
 * search box (same look as the creature list's type filter): 'start' = first
 * quest of a chain (has a follow-up, no prerequisite), 'single' = quest not
 * linked to any chain, null = no filter.
 */

type ChainFilter = 'start' | 'single'

const props = defineProps<{ modelValue: ChainFilter | null }>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: ChainFilter | null): void
}>()

const { t } = useI18n()

const popover = ref<InstanceType<typeof Popover> | null>(null)

const options = computed(() => [
  { value: 'start', label: t('quest.chainFilter.start') },
  { value: 'single', label: t('quest.chainFilter.single') },
])
</script>

<template>
  <button
    type="button"
    class="chain-filter-toggle"
    :class="{ active: props.modelValue !== null }"
    v-tooltip.bottom="t('quest.chainFilter.placeholder')"
    @click="(e: Event) => popover?.toggle(e)"
  >
    <i class="pi pi-filter"></i>
  </button>
  <Popover ref="popover">
    <Select
      :modelValue="props.modelValue"
      :options="options"
      optionLabel="label"
      optionValue="value"
      :placeholder="t('quest.chainFilter.placeholder')"
      showClear
      class="chain-filter-select"
      @update:modelValue="(v: ChainFilter | null) => emit('update:modelValue', v ?? null)"
    />
  </Popover>
</template>

<style scoped>
.chain-filter-toggle {
  width: var(--input-height-sm);
  height: var(--input-height-sm);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-default);
  border-radius: var(--radius);
  background: transparent;
  color: var(--text-muted);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s;
}

.chain-filter-toggle:hover,
.chain-filter-toggle.active {
  color: var(--accent);
  border-color: var(--accent-focus);
  background: var(--accent-soft);
}

.chain-filter-select {
  width: 14rem;
}
</style>

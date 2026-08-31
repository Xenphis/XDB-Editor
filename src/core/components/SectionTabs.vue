<script setup lang="ts">
import { ref, watch } from 'vue'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'

export interface SectionTabItem {
  /** Unique value used as tab id and slot name. */
  value: string
  /** Label shown in the tab strip. */
  label: string
  /** Optional small count badge appended to the label, e.g. (3). */
  count?: number | string
  /** When true, displays a cyan modified dot on the tab. */
  modified?: boolean
  /** Disables the tab. */
  disabled?: boolean
}

const props = withDefaults(defineProps<{
  tabs: SectionTabItem[]
  /** Initially selected tab value. Defaults to the first tab. */
  defaultValue?: string
  /** Optional header title for the card. */
  title?: string
  /** Optional header description shown under the title. */
  description?: string
  /** Highlights the card border in cyan when true. */
  modified?: boolean
  /** 'card' wraps tabs in a bordered card (default); 'plain' renders bare
      chip tabs for use directly under an EditorHeader. */
  variant?: 'card' | 'plain'
}>(), {
  modified: false,
  variant: 'card',
})

const active = ref<string>(props.defaultValue ?? props.tabs[0]?.value ?? '')

// Keep selection valid when the tabs list changes.
watch(() => props.tabs.map(t => t.value).join('|'), () => {
  if (!props.tabs.some(t => t.value === active.value)) {
    active.value = props.tabs[0]?.value ?? ''
  }
})
</script>

<template>
  <div class="section-tabs" :class="{ 'section-tabs-modified': modified && variant === 'card', 'section-tabs-plain': variant === 'plain' }">
    <div v-if="title || description" class="section-tabs-header">
      <h4 v-if="title">{{ title }}</h4>
      <p v-if="description">{{ description }}</p>
    </div>

    <Tabs v-model:value="active" class="section-tabs-inner">
      <TabList>
        <Tab
          v-for="tab in tabs"
          :key="tab.value"
          :value="tab.value"
          :disabled="tab.disabled"
        >
          <span class="section-tab-label">
            <span
              v-if="tab.modified"
              class="section-tab-dot"
              aria-hidden="true"
            />
            {{ tab.label }}
            <span v-if="tab.count != null" class="section-tab-count">({{ tab.count }})</span>
          </span>
        </Tab>
      </TabList>
      <TabPanels>
        <TabPanel v-for="tab in tabs" :key="tab.value" :value="tab.value">
          <slot v-if="tab.value === active" :name="tab.value" :tab="tab" />
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>

<style scoped>
.section-tabs {
  background: var(--surface-1);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding: 1rem;
  margin-bottom: 1rem;
  transition: border-color 0.2s, background 0.2s;
}

.section-tabs.section-tabs-plain {
  background: transparent;
  border: none;
  padding: 0;
  margin-bottom: 0;
}

.section-tabs-modified {
  border-color: var(--accent-focus);
  background: var(--accent-soft);
}

.section-tabs-header {
  margin-bottom: 1rem;
}

.section-tabs-header h4 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 0.25rem 0;
}

.section-tabs-header p {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 0;
}

.section-tab-label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.section-tab-count {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-weight: 500;
}

.section-tab-dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-ring);
}

/* PrimeVue Tabs theming — compact chip/pill tabs */
:deep(.p-tabs),
:deep(.p-tablist),
:deep(.p-tablist-content),
:deep(.p-tabpanels),
:deep(.p-tabpanel) {
  background: transparent !important;
}

:deep(.p-tablist) {
  border-bottom: 1px solid var(--border-default);
  padding-bottom: 0.5rem;
}

:deep(.p-tablist-tab-list) {
  background: transparent !important;
  border: none !important;
  gap: 0.35rem;
}

:deep(.p-tab) {
  color: var(--text-muted) !important;
  background: transparent !important;
  border: 1px solid transparent !important;
  border-radius: 999px !important;
  padding: 0.3rem 0.85rem !important;
  margin: 0 !important;
  font-size: 0.8rem !important;
  font-weight: 500 !important;
}

:deep(.p-tab:hover) {
  color: var(--text) !important;
  background: var(--surface-hover) !important;
}

:deep(.p-tab-active),
:deep(.p-tab[data-p-active="true"]),
:deep(.p-tab[aria-selected="true"]) {
  color: var(--accent) !important;
  background: var(--accent-soft) !important;
  border-color: var(--accent-focus) !important;
  font-weight: 600 !important;
}

:deep(.p-tablist-active-bar) {
  display: none !important;
}

:deep(.p-tabpanels) {
  padding: 1rem 0 0 0 !important;
}

:deep(.p-tabpanel) {
  padding: 0 !important;
}

/* Embedded EditableDataTable inside a tab should not duplicate the card padding/border. */
:deep(.section-tabs-inner .editable-table-wrapper) {
  background: transparent;
  border: none;
  padding: 0;
  margin: 0;
}
</style>

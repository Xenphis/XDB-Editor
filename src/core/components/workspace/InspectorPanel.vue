<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FieldChange } from '@core/composables/useQueryGenerator'
import ChangedFieldsList from './ChangedFieldsList.vue'
import SqlPreview from './SqlPreview.vue'

const props = withDefaults(defineProps<{
  title: string
  subtitle?: string
  storageKey: string
  changedFields?: FieldChange[]
  diffQuery?: string
  fullQuery?: string
  hasChanges?: boolean
  width?: string
}>(), {
  changedFields: () => [],
  diffQuery: '',
  fullQuery: '',
  hasChanges: false,
  width: '300px',
})

const { t } = useI18n()

const KEY = `workspace:${props.storageKey}:inspector`
const collapsed = ref(localStorage.getItem(KEY) === '1')

function toggle() {
  collapsed.value = !collapsed.value
  localStorage.setItem(KEY, collapsed.value ? '1' : '0')
}
</script>

<template>
  <div class="inspector" :class="{ collapsed }" :style="{ '--inspector-w': width }">
    <!-- Collapsed rail -->
    <button v-if="collapsed" class="inspector-rail" @click="toggle">
      <i class="pi pi-angle-double-left"></i>
      <span class="inspector-rail-label">{{ title }}</span>
      <span v-if="hasChanges" class="inspector-rail-dot" aria-hidden="true" />
    </button>

    <template v-else>
      <!-- Header -->
      <div class="inspector-header">
        <div class="inspector-titles">
          <span class="inspector-title">{{ title }}</span>
          <span v-if="subtitle" class="inspector-subtitle">{{ subtitle }}</span>
        </div>
        <button class="inspector-toggle" @click="toggle">
          <i class="pi pi-angle-double-right"></i>
        </button>
      </div>

      <div class="inspector-body">
        <!-- Visual preview -->
        <div v-if="$slots.preview" class="inspector-section inspector-preview">
          <slot name="preview" />
        </div>

        <!-- Key facts -->
        <div v-if="$slots.facts" class="inspector-section">
          <slot name="facts" />
        </div>

        <!-- Changed fields -->
        <div class="inspector-section">
          <h5 class="inspector-section-title">
            {{ t('sqlPanel.changedFields') }}
            <span v-if="changedFields.length" class="inspector-count">{{ changedFields.length }}</span>
          </h5>
          <ChangedFieldsList :changedFields="changedFields" />
        </div>

        <!-- SQL preview -->
        <div class="inspector-section">
          <h5 class="inspector-section-title">SQL</h5>
          <SqlPreview :diffQuery="diffQuery" :fullQuery="fullQuery" />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.inspector {
  width: var(--inspector-w);
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--surface-1);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: width 0.15s ease;
}

.inspector.collapsed {
  width: 2.25rem;
}

.inspector-rail {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0;
  border: none;
  background: none;
  color: var(--text-muted);
  cursor: pointer;
  font-family: inherit;
}

.inspector-rail:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.inspector-rail-label {
  writing-mode: vertical-rl;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.inspector-rail-dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-ring);
}

.inspector-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid var(--border-default);
  flex-shrink: 0;
}

.inspector-titles {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.inspector-title {
  font-size: var(--font-label);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text);
}

.inspector-subtitle {
  font-size: 0.72rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.inspector-toggle {
  width: 1.6rem;
  height: 1.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius);
  background: transparent;
  color: var(--text-placeholder);
  font-size: 0.75rem;
  cursor: pointer;
  flex-shrink: 0;
}

.inspector-toggle:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.inspector-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.inspector-section-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: var(--font-label);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  margin: 0 0 0.4rem 0;
}

.inspector-count {
  background: var(--accent-ring);
  color: var(--accent);
  padding: 0.05rem 0.4rem;
  border-radius: 0.375rem;
  font-size: 0.68rem;
  font-weight: 600;
}
</style>

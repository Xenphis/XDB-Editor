<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  /** Header title shown when expanded and as the rail tooltip when collapsed. */
  title: string
  /** Optional PrimeVue icon class, e.g. "pi pi-user". */
  icon?: string
  /** Optional secondary line under the title (e.g. the entity name). */
  subtitle?: string
  /** When set, the collapsed state is persisted in localStorage under this key. */
  storageKey?: string
  defaultCollapsed?: boolean
}>(), {
  defaultCollapsed: false,
})

function readInitial(): boolean {
  if (props.storageKey) {
    const stored = localStorage.getItem(`viewInfoPanel:${props.storageKey}`)
    if (stored !== null) return stored === '1'
  }
  return props.defaultCollapsed
}

const collapsed = ref(readInitial())

function toggle() {
  collapsed.value = !collapsed.value
  if (props.storageKey) {
    localStorage.setItem(`viewInfoPanel:${props.storageKey}`, collapsed.value ? '1' : '0')
  }
}
</script>

<template>
  <!-- Collapsed: thin rail with an expand affordance -->
  <button
    v-if="collapsed"
    type="button"
    class="view-info-rail"
    :title="title"
    @click="toggle"
  >
    <i class="pi pi-angle-left"></i>
    <span class="view-info-rail-title">{{ title }}</span>
  </button>

  <!-- Expanded -->
  <aside v-else class="view-info-panel">
    <div class="view-info-header">
      <div class="view-info-heading">
        <h4 class="view-info-title">
          <i v-if="icon" :class="icon" class="view-info-title-icon"></i>
          {{ title }}
        </h4>
        <span v-if="subtitle" class="view-info-subtitle">{{ subtitle }}</span>
      </div>
      <button
        type="button"
        class="view-info-toggle"
        :title="title"
        @click="toggle"
      >
        <i class="pi pi-angle-right"></i>
      </button>
    </div>

    <div class="view-info-body">
      <slot />
    </div>
  </aside>
</template>

<style scoped>
.view-info-panel {
  width: 320px;
  flex-shrink: 0;
  align-self: flex-start;
  position: sticky;
  top: 0;
  height: calc(93vh - 3rem);
  overflow-y: auto;
  background: var(--surface-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.view-info-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.view-info-heading {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.view-info-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.view-info-title-icon {
  color: var(--accent);
  font-size: 1rem;
}

.view-info-subtitle {
  font-size: 0.85rem;
  color: var(--accent);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.view-info-toggle {
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--border-default);
  border-radius: 0.4rem;
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, background 0.2s;
}

.view-info-toggle:hover {
  color: var(--accent);
  border-color: var(--accent-focus);
  background: var(--accent-soft);
}

.view-info-body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Collapsed rail */
.view-info-rail {
  flex-shrink: 0;
  align-self: flex-start;
  width: 2.5rem;
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0;
  background: var(--surface-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius);
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, background 0.2s;
}

.view-info-rail:hover {
  color: var(--accent);
  border-color: var(--accent-focus);
  background: var(--accent-soft);
}

.view-info-rail-title {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.02em;
}
</style>

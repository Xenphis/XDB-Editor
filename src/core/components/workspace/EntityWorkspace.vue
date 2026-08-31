<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  /** Persistence key for the collapse states, e.g. "npc.creatureTemplate". */
  storageKey: string
  /** Width of the list pane. */
  listWidth?: string
}>(), {
  listWidth: '280px',
})

const LIST_KEY = `workspace:${props.storageKey}:list`

const listCollapsed = ref(localStorage.getItem(LIST_KEY) === '1')

function toggleList() {
  listCollapsed.value = !listCollapsed.value
  localStorage.setItem(LIST_KEY, listCollapsed.value ? '1' : '0')
}
</script>

<template>
  <div class="entity-workspace">
    <!-- List pane -->
    <aside class="workspace-list" :class="{ collapsed: listCollapsed }" :style="{ '--ws-list-w': listWidth }">
      <button
        class="workspace-list-toggle"
        :class="{ collapsed: listCollapsed }"
        @click="toggleList"
      >
        <i :class="listCollapsed ? 'pi pi-angle-double-right' : 'pi pi-angle-double-left'"></i>
      </button>
      <div v-if="!listCollapsed" class="workspace-list-body">
        <slot name="list" />
      </div>
    </aside>

    <!-- Editor pane -->
    <section class="workspace-editor">
      <slot name="editor" />
    </section>

    <!-- Inspector pane (component inside handles its own collapse) -->
    <aside v-if="$slots.inspector" class="workspace-inspector">
      <slot name="inspector" />
    </aside>
  </div>
</template>

<style scoped>
.entity-workspace {
  display: flex;
  align-items: stretch;
  gap: 1rem;
  height: 100%;
  min-height: 0;
}

.workspace-list {
  position: relative;
  width: var(--ws-list-w);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--surface-1);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: width 0.15s ease;
}

.workspace-list.collapsed {
  width: 2.25rem;
}

.workspace-list-toggle {
  position: absolute;
  top: 0.35rem;
  right: 0.35rem;
  z-index: 2;
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
  transition: color 0.15s, background 0.15s;
}

.workspace-list-toggle:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.workspace-list-toggle.collapsed {
  right: 0.3rem;
}

.workspace-list-body {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}

.workspace-editor {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.workspace-inspector {
  flex-shrink: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
</style>

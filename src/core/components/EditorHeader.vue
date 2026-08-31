<script setup lang="ts">
import Button from 'primevue/button'

withDefaults(defineProps<{
  title?: string
  subtitle?: string
  id?: string | number
  /** Small mono chip showing the DB table name, e.g. "creature_template". */
  table?: string
  backLabel?: string
  /** Workspaces pass false — the persistent list replaces the back button. */
  showBack?: boolean
  hasChanges?: boolean
  showDiscard?: boolean
  showExecute?: boolean
  executeLabel?: string
  discardLabel?: string
}>(), {
  showBack: true,
  showDiscard: true,
  showExecute: true,
})

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'discard'): void
  (e: 'execute'): void
}>()
</script>

<template>
  <div class="editor-header">
    <div class="editor-header-left">
      <Button
        v-if="showBack"
        icon="pi pi-arrow-left"
        :label="backLabel"
        severity="secondary"
        @click="emit('back')"
        class="back-button"
      />
      <h1 v-if="title || subtitle || id != null" class="editor-title">
        <span v-if="title">{{ title }}</span>
        <span v-if="subtitle" class="editor-subtitle">{{ subtitle }}</span>
        <span v-if="id != null" class="editor-id">#{{ id }}</span>
        <span v-if="table" class="editor-table">{{ table }}</span>
      </h1>
    </div>
    <div class="editor-header-right">
      <Button
        v-if="showDiscard !== false"
        icon="pi pi-undo"
        :label="discardLabel"
        @click="emit('discard')"
        :disabled="!hasChanges"
        class="discard-button"
      />
      <Button
        v-if="showExecute !== false"
        icon="pi pi-play"
        :label="executeLabel"
        @click="emit('execute')"
        :disabled="!hasChanges"
        class="execute-button"
      />
    </div>
  </div>
</template>

<style scoped>
.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  gap: 1.5rem;
}

.editor-header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  min-width: 0;
}

.editor-header-right {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.editor-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  flex-wrap: wrap;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.editor-subtitle {
  color: var(--text);
}

.editor-id {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text-muted);
}

.editor-table {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--text-muted);
  background: var(--surface-hover);
  border: 1px solid var(--border-default);
  border-radius: 0.3rem;
  padding: 0.1rem 0.4rem;
  align-self: center;
}
</style>

<style>
.editor-header .back-button.p-button {
  background: var(--surface-elevated) !important;
  border: 1px solid var(--border-input) !important;
  color: var(--text) !important;
  font-weight: 600 !important;
  padding: 0.4rem 0.9rem !important;
  transition: all 0.2s !important;
  flex-shrink: 0;
}

.editor-header .back-button.p-button:hover {
  background: var(--surface-strong) !important;
  border-color: var(--border-input) !important;
  color: var(--text) !important;
}

.editor-header .execute-button.p-button {
  background: var(--accent-gradient) !important;
  border: none !important;
  color: var(--accent-contrast) !important;
  font-weight: 600 !important;
  padding: 0.4rem 1rem !important;
  border-radius: var(--radius) !important;
}

.editor-header .execute-button.p-button:hover:not(:disabled) {
  filter: brightness(1.1);
}

.editor-header .discard-button.p-button {
  background: var(--danger) !important;
  border: none !important;
  color: #fff !important;
  font-weight: 600 !important;
  padding: 0.4rem 1rem !important;
  border-radius: var(--radius) !important;
}

.editor-header .discard-button.p-button:hover:not(:disabled) {
  filter: brightness(1.1);
}
</style>

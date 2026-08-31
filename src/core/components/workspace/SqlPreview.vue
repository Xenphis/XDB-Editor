<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { highlightSql } from '@core/utils/sql'
import { copyToClipboard as clipboardCopy } from '@core/utils/clipboard'

const props = defineProps<{
  diffQuery: string
  fullQuery: string
}>()

const { t } = useI18n()
const activeTab = ref<'diff' | 'full'>('diff')
const copied = ref(false)

const currentQuery = computed(() => (activeTab.value === 'diff' ? props.diffQuery : props.fullQuery))

async function copy() {
  if (!currentQuery.value) return
  await clipboardCopy(currentQuery.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>

<template>
  <div class="sql-preview">
    <div class="sql-preview-bar">
      <button
        v-for="tab in (['diff', 'full'] as const)"
        :key="tab"
        class="sql-preview-tab"
        :class="{ active: activeTab === tab }"
        @click="activeTab = tab"
      >
        {{ tab === 'diff' ? t('sqlPanel.diffQuery') : t('sqlPanel.fullQuery') }}
      </button>
      <button
        v-if="currentQuery"
        class="sql-preview-copy"
        v-tooltip.left="copied ? t('sqlPanel.copied') : t('sqlPanel.copy')"
        @click="copy"
      >
        <i :class="copied ? 'pi pi-check' : 'pi pi-copy'"></i>
      </button>
    </div>

    <pre v-if="currentQuery" class="sql-code" v-html="highlightSql(currentQuery)" />
    <div v-else class="sql-empty">
      {{ activeTab === 'diff' ? t('sqlPanel.noChanges') : t('sqlPanel.noData') }}
    </div>
  </div>
</template>

<style scoped>
.sql-preview {
  background: var(--surface-code);
  border: 1px solid var(--border-default);
  border-radius: var(--radius);
  overflow: hidden;
}

.sql-preview-bar {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--border-default);
}

.sql-preview-tab {
  all: unset;
  padding: 0.4rem 0.75rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}

.sql-preview-tab:hover {
  background: var(--surface-hover);
}

.sql-preview-tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.sql-preview-copy {
  all: unset;
  margin-left: auto;
  padding: 0.35rem 0.6rem;
  font-size: 0.75rem;
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.15s;
}

.sql-preview-copy:hover {
  color: var(--accent);
}

.sql-code {
  margin: 0;
  padding: 0.6rem 0.75rem;
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 0.72rem;
  line-height: 1.55;
  color: var(--text);
  white-space: pre-wrap;
  word-break: break-all;
  overflow-y: auto;
  max-height: 220px;
}

.sql-empty {
  padding: 1rem;
  text-align: center;
  color: var(--text-placeholder);
  font-size: 0.78rem;
  font-style: italic;
}

/* SQL syntax highlighting */
:deep(.sql-keyword) {
  color: var(--sql-keyword);
  font-weight: 600;
}

:deep(.sql-string) {
  color: var(--sql-string);
}

:deep(.sql-number) {
  color: var(--sql-number);
}

:deep(.sql-field) {
  color: var(--sql-field);
}
</style>

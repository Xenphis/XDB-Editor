<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useSessionTrackerStore, type SessionChange, type SessionChangeKind } from '@core/stores/sessionTracker'
import { resolveEntityRoute } from '@/modules/sql_session/entityRoutes'
import ChangedFieldsList from '@core/components/workspace/ChangedFieldsList.vue'
import { highlightSql } from '@core/utils/sql'
import { copyToClipboard } from '@core/utils/clipboard'

const { t } = useI18n()
const router = useRouter()
const session = useSessionTrackerStore()

const copiedId = ref<string | null>(null)
const expandedSql = ref(new Set<string>())

async function copyText(text: string, id: string) {
  await copyToClipboard(text)
  copiedId.value = id
  setTimeout(() => { copiedId.value = null }, 2000)
}

function toggleSql(key: string) {
  const next = new Set(expandedSql.value)
  if (next.has(key)) {
    next.delete(key)
  } else {
    next.add(key)
  }
  expandedSql.value = next
}

// Deleted entities have no editor to open any more.
function openTarget(change: SessionChange): string | null {
  return change.kind === 'deleted' ? null : resolveEntityRoute(change.table, change.id)
}

function kindLabel(kind: SessionChangeKind): string {
  switch (kind) {
    case 'created': return t('sqlSession.statusCreated')
    case 'deleted': return t('sqlSession.statusDeleted')
    default: return t('sqlSession.statusModified')
  }
}
</script>

<template>
  <div class="sql-session">
    <!-- Header -->
    <div class="session-header">
      <div>
        <h2 class="session-title">{{ t('sqlSession.title') }}</h2>
        <p class="session-description">{{ t('sqlSession.description') }}</p>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="session.totalChanges === 0" class="session-empty">
      <i class="pi pi-code" />
      <h3>{{ t('sqlSession.emptyTitle') }}</h3>
      <p>{{ t('sqlSession.emptyDescription') }}</p>
    </div>

    <!-- Change list -->
    <div v-else class="session-content">
      <!-- Summary bar -->
      <div class="session-summary">
        <span class="summary-badge">
          {{ session.totalChanges }} {{ t('sqlSession.entries') }}
        </span>
      </div>

      <!-- Individual changes -->
      <div
        v-for="change in session.changes"
        :key="change.key"
        class="query-card"
      >
        <div class="query-card-header">
          <div class="query-card-info">
            <span class="query-table">{{ change.table }}</span>
            <span class="query-entry">#{{ change.id }}</span>
            <span class="kind-badge" :class="`kind-${change.kind}`">{{ kindLabel(change.kind) }}</span>
          </div>
          <div class="query-card-actions">
            <button
              v-if="openTarget(change)"
              class="copy-icon-btn"
              :title="t('sqlSession.openEntity')"
              @click="router.push(openTarget(change)!)"
            >
              <i class="pi pi-external-link" />
            </button>
            <button
              class="copy-icon-btn"
              :title="expandedSql.has(change.key) ? t('sqlSession.hideSql') : t('sqlSession.showSql')"
              @click="toggleSql(change.key)"
            >
              <i :class="expandedSql.has(change.key) ? 'pi pi-chevron-up' : 'pi pi-code'" />
            </button>
            <button class="copy-icon-btn" @click="copyText(change.sql, change.key)">
              <i :class="copiedId === change.key ? 'pi pi-check' : 'pi pi-copy'" />
            </button>
          </div>
        </div>
        <div class="query-fields">
          <ChangedFieldsList :changed-fields="change.fieldChanges" />
        </div>
        <pre v-if="expandedSql.has(change.key)" class="query-code" v-html="highlightSql(change.sql)" />
      </div>

      <!-- Full script -->
      <div class="full-script-section">
        <div class="full-script-header">
          <div>
            <h3>{{ t('sqlSession.fullScript') }}</h3>
            <p>{{ t('sqlSession.fullScriptDesc') }}</p>
          </div>
          <button class="copy-icon-btn" @click="copyText(session.globalSqlScript, 'full')">
            <i :class="copiedId === 'full' ? 'pi pi-check' : 'pi pi-copy'" />
          </button>
        </div>
        <pre class="full-script-code" v-html="highlightSql(session.globalSqlScript)" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.sql-session {
  max-width: 80rem;
}

.session-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;
}

.copy-icon-btn {
  all: unset;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;
}

.copy-icon-btn:hover {
  background: var(--surface-elevated);
  color: var(--accent);
}

.copy-icon-btn .pi-check {
  color: var(--success);
}

.session-title {
  font-size: 2rem;
  font-weight: 700;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 0.5rem 0;
}

.session-description {
  color: var(--text-muted);
  font-size: 0.95rem;
  margin: 0;
}

/* Empty state */
.session-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  height: 50vh;
  border: 2px dashed var(--border-input-soft);
  border-radius: 1rem;
  color: var(--text-placeholder);
}

.session-empty .pi-code {
  font-size: 3rem;
  color: var(--border-input);
}

.session-empty h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-muted);
  margin: 0;
}

.session-empty p {
  font-size: 0.9rem;
  margin: 0;
}

/* Summary */
.session-summary {
  margin-bottom: 1.5rem;
}

.summary-badge {
  background: var(--accent-ring-soft);
  color: var(--accent);
  padding: 0.35rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
}

/* Change cards */
.query-card {
  background: var(--surface-1);
  border: 1px solid var(--border-default);
  border-radius: 0.75rem;
  margin-bottom: 1rem;
  overflow: hidden;
}

.query-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-default);
}

.query-card-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.query-card-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.query-table {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--sql-field);
}

.query-entry {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-weight: 500;
}

.kind-badge {
  padding: 0.15rem 0.5rem;
  border-radius: 0.4rem;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.kind-badge.kind-modified {
  background: var(--accent-ring-soft);
  color: var(--accent);
}

.kind-badge.kind-created {
  background: color-mix(in srgb, var(--success) 15%, transparent);
  color: var(--success);
}

.kind-badge.kind-deleted {
  background: color-mix(in srgb, var(--danger) 15%, transparent);
  color: var(--danger);
}

.query-fields {
  padding: 0.35rem 1rem;
}

.query-code {
  margin: 0;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--border-default);
  background: var(--surface-code);
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 0.8rem;
  line-height: 1.6;
  color: var(--text);
  white-space: pre-wrap;
  word-break: break-all;
}

/* Full script section */
.full-script-section {
  background: var(--surface-code);
  border: 1px solid var(--border-default);
  border-radius: 0.75rem;
  margin-top: 2rem;
  overflow: hidden;
}

.full-script-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-default);
}

.full-script-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 0.25rem 0;
}

.full-script-header p {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: 0;
}

.full-script-code {
  margin: 0;
  padding: 1rem 1.25rem;
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 0.8rem;
  line-height: 1.6;
  color: var(--text);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 400px;
  overflow-y: auto;
}

/* SQL syntax highlighting */
:deep(.sql-keyword) {
  color: var(--accent);
  font-weight: 600;
}

:deep(.sql-string) {
  color: var(--success);
}

:deep(.sql-number) {
  color: var(--warn);
}

:deep(.sql-field) {
  color: var(--sql-field);
}

/* Scrollbar */
.full-script-code::-webkit-scrollbar {
  width: 6px;
}

.full-script-code::-webkit-scrollbar-track {
  background: transparent;
}

.full-script-code::-webkit-scrollbar-thumb {
  background: var(--border-input-soft);
  border-radius: 3px;
}
</style>

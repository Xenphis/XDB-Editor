<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { FieldChange } from '@core/composables/useQueryGenerator'
import { formatValue } from '@core/utils/sql'

defineProps<{
  changedFields: FieldChange[]
}>()

const { t } = useI18n()
</script>

<template>
  <div class="changed-fields">
    <div v-if="changedFields.length > 0" class="changes-list">
      <div v-for="change in changedFields" :key="change.field" class="change-item">
        <span class="change-field">{{ change.field }}</span>
        <span class="change-values">
          <span class="change-old">{{ formatValue(change.oldValue) }}</span>
          <i class="pi pi-arrow-right change-arrow" />
          <span class="change-new">{{ formatValue(change.newValue) }}</span>
        </span>
      </div>
    </div>
    <div v-else class="changes-empty">
      {{ t('sqlPanel.noChanges') }}
    </div>
  </div>
</template>

<style scoped>
.change-item {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0.35rem 0;
  font-size: 0.75rem;
  border-bottom: 1px solid var(--border-default);
}

.change-item:last-child {
  border-bottom: none;
}

.change-field {
  color: var(--sql-field);
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
}

.change-values {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.change-old {
  color: var(--danger);
  font-family: 'JetBrains Mono', monospace;
  text-decoration: line-through;
  opacity: 0.7;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.change-arrow {
  color: var(--text-placeholder);
  font-size: 0.65rem;
  flex-shrink: 0;
}

.change-new {
  color: var(--success);
  font-family: 'JetBrains Mono', monospace;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.changes-empty {
  text-align: center;
  color: var(--text-placeholder);
  font-size: 0.78rem;
  font-style: italic;
  padding: 0.5rem 0;
}
</style>

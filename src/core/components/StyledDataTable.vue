<script setup lang="ts" generic="T extends Record<string, any>">
import DataTable from 'primevue/datatable'

defineProps<{
  data: T[]
  dataKey: string
  rows?: number
}>()
</script>

<template>
  <DataTable
    :value="data"
    :dataKey="dataKey"
    :rows="rows ?? 20"
    stripedRows
    class="styled-datatable"
  >
    <slot />
  </DataTable>
</template>

<style scoped>
.styled-datatable {
  background: var(--surface-hover);
  border-radius: 0.75rem;
  border: 1px solid var(--border-input-soft);
  overflow: hidden;
}

:deep(.p-datatable-table-container) {
  border-radius: 0.75rem;
  overflow: hidden;
}

:deep(.p-datatable-thead > tr > th) {
  background: var(--surface-elevated) !important;
  border-color: var(--border-input-soft) !important;
  color: var(--text-soft) !important;
  font-weight: 600;
  font-size: 0.875rem;
}

:deep(.p-datatable-tbody > tr) {
  background: transparent !important;
  border-color: var(--border-default) !important;
}

:deep(.p-datatable-tbody > tr:hover) {
  background: var(--border-default) !important;
}

:deep(.p-datatable-tbody > tr > td) {
  border-color: var(--border-default) !important;
  color: var(--text);
  font-size: 0.875rem;
}

:deep(.p-datatable-striped .p-datatable-tbody > tr:nth-child(even)) {
  background: var(--surface-panel) !important;
}
</style>

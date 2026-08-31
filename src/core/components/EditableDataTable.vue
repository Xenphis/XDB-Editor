<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Button from 'primevue/button'

export interface ColumnDef {
  field: string
  header: string
  type: 'number' | 'text' | 'select' | 'readonly'
  width?: string
  options?: { value: any; label: string }[]
  optionsFn?: (data: Record<string, any>, allEntries: Record<string, any>[]) => { value: any; label: string }[]
  fractionDigits?: { min: number; max: number }
}

const props = withDefaults(defineProps<{
  entries: Record<string, any>[]
  columns: ColumnDef[]
  hasChanges?: boolean
  maxRows?: number
  addLabel?: string
  title?: string
  description?: string
  dataKey?: string
  showHeaderAdd?: boolean
  showFooterAdd?: boolean
  showDetailButton?: boolean
  showRemoveButton?: boolean
  embedded?: boolean
}>(), {
  hasChanges: false,
  dataKey: 'id',
  showHeaderAdd: false,
  showFooterAdd: true,
  showDetailButton: false,
  showRemoveButton: true,
  embedded: false,
})

const emit = defineEmits<{
  (e: 'add'): void
  (e: 'remove', index: number): void
  (e: 'detail', index: number): void
}>()

const { t } = useI18n()

const canAdd = computed(() => {
  if (props.maxRows == null) return true
  return props.entries.length < props.maxRows
})

const countLabel = computed(() => {
  if (props.maxRows != null) {
    return `(${props.entries.length}/${props.maxRows})`
  }
  return `(${props.entries.length})`
})

function updateField(index: number, field: string, value: any) {
  const entry = props.entries[index]
  if (entry) entry[field] = value
}
</script>

<template>
  <div class="editable-table-wrapper" :class="{ 'editable-table-modified': hasChanges, 'editable-table-embedded': embedded }">
    <!-- Header -->
    <div v-if="title" class="editable-table-header">
      <div class="editable-table-title-row">
        <h4>{{ title }} <span class="editable-table-count">{{ countLabel }}</span></h4>
        <Button
          v-if="showHeaderAdd"
          icon="pi pi-plus"
          severity="secondary"
          text
          rounded
          size="small"
          class="header-add-btn"
          :disabled="!canAdd"
          @click="emit('add')"
        />
      </div>
      <p v-if="description" class="editable-table-desc">{{ description }}</p>
    </div>

    <!-- DataTable -->
    <DataTable
      :value="entries"
      :dataKey="dataKey"
      class="editable-datatable"
      :class="{ 'no-header': !title }"
    >
      <Column
        v-for="col in columns"
        :key="col.field"
        :field="col.field"
        :header="col.header"
        :style="col.width ? { width: col.width } : undefined"
      >
        <template #body="{ data, index }">
          <!-- Readonly -->
          <span v-if="col.type === 'readonly'" class="cell-readonly">{{ data[col.field] }}</span>

          <!-- Number -->
          <InputNumber
            v-else-if="col.type === 'number'"
            :modelValue="data[col.field]"
            @update:modelValue="v => updateField(index, col.field, v)"
            :useGrouping="false"
            :minFractionDigits="col.fractionDigits?.min"
            :maxFractionDigits="col.fractionDigits?.max"
            fluid
            class="cell-input"
          />

          <!-- Text -->
          <InputText
            v-else-if="col.type === 'text'"
            :modelValue="data[col.field]"
            @update:modelValue="v => updateField(index, col.field, v)"
            fluid
            class="cell-input"
          />

          <!-- Select -->
          <Select
            v-else-if="col.type === 'select'"
            :modelValue="data[col.field]"
            @update:modelValue="v => updateField(index, col.field, v)"
            :options="col.optionsFn ? col.optionsFn(data, entries) : col.options"
            optionLabel="label"
            optionValue="value"
            fluid
            class="cell-input"
          />
        </template>
      </Column>

      <!-- Actions column -->
      <Column v-if="showDetailButton || showRemoveButton" header="" :style="{ width: showDetailButton && showRemoveButton ? '5.5rem' : '3.5rem' }" bodyStyle="text-align: center; padding: 0.25rem">
        <template #body="{ index }">
          <div class="action-buttons">
            <Button
              v-if="showDetailButton"
              icon="pi pi-ellipsis-h"
              severity="secondary"
              text
              rounded
              size="small"
              class="action-detail"
              @click="emit('detail', index)"
            />
            <Button
              v-if="showRemoveButton"
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              size="small"
              class="action-delete"
              @click="emit('remove', index)"
            />
          </div>
        </template>
      </Column>

      <!-- Custom column slots -->
      <slot />

      <!-- Empty message -->
      <template #empty>
        <div class="editable-table-empty">
          {{ t('common.noEntries', 'Aucune entrée') }}
        </div>
      </template>
    </DataTable>

    <!-- Add row -->
    <div v-if="showFooterAdd && !showHeaderAdd" class="editable-table-footer">
      <slot name="add-row">
        <Button
          icon="pi pi-plus"
          :label="addLabel"
          severity="secondary"
          size="small"
          :disabled="!canAdd"
          @click="emit('add')"
        />
      </slot>
    </div>
  </div>
</template>

<style scoped>
.editable-table-wrapper {
  background: var(--surface-1);
  border-radius: 0.75rem;
  border: 1px solid var(--border-default);
  overflow: hidden;
  transition: border-color 0.2s;
  margin-bottom: 1.5rem;
}

.editable-table-wrapper.editable-table-embedded {
  background: transparent;
  border-color: transparent;
  border-radius: 0;
  margin-bottom: 0;
  overflow: visible;
}

.editable-table-wrapper.editable-table-embedded.editable-table-modified {
  border-color: transparent;
}

.editable-table-modified {
  border-color: var(--accent-focus);
}

/* Header */
.editable-table-header {
  padding: 1.25rem 1.25rem 0.75rem;
}

.editable-table-embedded .editable-table-header {
  padding: 0 0 0.75rem;
}

/* Embedded inside a .field-group: match the .field-group-header micro-label. */
.editable-table-embedded .editable-table-header h4 {
  font-size: var(--font-label);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

.editable-table-embedded .editable-table-count {
  font-size: var(--font-label);
  color: var(--text-placeholder);
}

.editable-table-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.editable-table-header h4 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.editable-table-count {
  font-weight: 400;
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-left: 0.5rem;
}

.editable-table-modified .editable-table-header h4 {
  color: var(--accent);
}

/* Header add button */
.header-add-btn {
  color: var(--text-muted) !important;
  width: 2rem !important;
  height: var(--input-height-sm) !important;
}

.header-add-btn:hover {
  color: var(--accent) !important;
  background: var(--accent-ring-soft) !important;
}

.editable-table-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: 0.25rem 0 0 0;
}

/* DataTable overrides */
.editable-datatable {
  background: transparent;
  margin: 0 1rem 1rem;
  width: calc(100% - 2rem);
}

.editable-table-embedded .editable-datatable {
  margin: 0;
  width: 100%;
}

:deep(.p-datatable-table-container) {
  border-radius: 0.5rem;
  border: 1px solid var(--border-input-soft);
  overflow: hidden;
}

:deep(.p-datatable-thead > tr > th) {
  background: var(--surface-elevated) !important;
  border-color: var(--border-default) !important;
  color: var(--text-soft) !important;
  font-weight: 600;
  font-size: 0.8rem;
  padding: 0.6rem 0.75rem !important;
}

:deep(.p-datatable-thead > tr > th:first-child) {
  border-top-left-radius: 0.5rem;
}

:deep(.p-datatable-thead > tr > th:last-child) {
  border-top-right-radius: 0.5rem;
}

:deep(.p-datatable-tbody > tr) {
  background: transparent !important;
  border-color: var(--border-default) !important;
}

:deep(.p-datatable-tbody > tr:hover) {
  background: var(--surface-hover) !important;
}

:deep(.p-datatable-tbody > tr > td) {
  border-color: var(--border-default) !important;
  color: var(--text);
  font-size: 0.85rem;
  padding: 0.35rem 0.5rem !important;
  vertical-align: middle;
}

:deep(.p-datatable-tbody > tr:nth-child(even)) {
  background: var(--surface-panel) !important;
}

:deep(.p-datatable-tbody > tr:nth-child(even):hover) {
  background: var(--surface-hover) !important;
}

:deep(.p-datatable-tbody > tr:last-child > td:first-child) {
  border-bottom-left-radius: 0.5rem;
}

:deep(.p-datatable-tbody > tr:last-child > td:last-child) {
  border-bottom-right-radius: 0.5rem;
}

:deep(.p-datatable-tbody > tr:last-child > td) {
  border-bottom: none !important;
}

/* Compact inputs inside cells.
 *
 * `class="cell-input"` lands on a different node in each component: on the
 * `<input>` itself for InputText, on the wrapper `<span>` for InputNumber, and
 * on the root `<div>` for Select. Vue compiles `:deep()` to a *descendant*
 * combinator whether or not a space precedes it, so the previous
 * `.cell-input :deep(.p-inputtext)` / `.cell-input:deep(.p-select)` rules only
 * ever matched InputNumber's inner input — the one case where the target really
 * is a descendant. That is why a row showed its number field at one height and
 * its text and select fields at the theme's default.
 *
 * So: size the node that carries the class, and reach inside only for the parts
 * that genuinely live deeper (InputNumber's input, Select's label). */
.cell-input,
.cell-input :deep(.p-inputnumber-input) {
  height: var(--input-height-sm) !important;
  font-size: 0.85rem !important;
}

/* The bordered box: InputText and Select carry it themselves, InputNumber
   paints it through its inner input (its wrapper stays transparent). */
.cell-input.p-inputtext,
.cell-input.p-select,
.cell-input :deep(.p-inputnumber-input) {
  background: var(--surface-1) !important;
  border: 1px solid var(--border-input-soft) !important;
  color: var(--text) !important;
}

.cell-input.p-inputtext,
.cell-input :deep(.p-inputnumber-input) {
  padding: 0 0.5rem !important;
}

/* Select draws its text in a child label; the 2px is the box's own borders,
   which border-box takes out of the content height. */
.cell-input :deep(.p-select-label) {
  padding: 0 0.5rem !important;
  line-height: calc(var(--input-height-sm) - 2px) !important;
  font-size: 0.85rem !important;
}

.cell-input.p-inputtext:focus,
.cell-input.p-select.p-focus,
.cell-input :deep(.p-inputnumber-input:focus) {
  border-color: var(--accent-focus) !important;
  box-shadow: 0 0 0 2px var(--accent-ring-soft) !important;
}

/* Readonly cell */
.cell-readonly {
  font-weight: 500;
  color: var(--text-muted);
  padding: 0 0.25rem;
}

/* Action buttons */
.action-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
}

.action-detail {
  color: var(--text-muted) !important;
  width: 1.75rem !important;
  height: 1.75rem !important;
}

.action-detail:hover {
  color: var(--accent) !important;
  background: var(--accent-ring-soft) !important;
}

/* Delete button */
.action-delete {
  color: var(--danger) !important;
  width: 1.75rem !important;
  height: 1.75rem !important;
}

.action-delete:hover {
  background: color-mix(in srgb, var(--danger) 10%, transparent) !important;
}

/* Empty state */
.editable-table-empty {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
  padding: 1rem 0;
}

/* Footer (add button & count) */
.editable-table-footer {
  padding: 0.6rem 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.editable-table-embedded .editable-table-footer {
  padding: 0.6rem 0 0;
}

.editable-table-count-footer {
  padding: 0.5rem 1.25rem;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.editable-table-footer :deep(.p-button) {
  font-size: 0.8rem;
}

.editable-table-footer :deep(.p-select) {
  flex: 1;
}
</style>

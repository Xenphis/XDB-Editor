<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Button from 'primevue/button'

const { t } = useI18n()

defineProps<{
  title: string
  description: string
  searchPlaceholder?: string
  addButtonLabel?: string
}>()

const emit = defineEmits<{
  (e: 'add'): void
  (e: 'update:search', value: string): void
}>()

const searchQuery = ref('')

function onSearchInput(val: string) {
  searchQuery.value = val
  emit('update:search', val)
}
</script>

<template>
  <div class="module-layout">
    <!-- Header -->
    <div class="module-header">
      <div>
        <h2 class="module-title">{{ title }}</h2>
        <p class="module-description">{{ description }}</p>
      </div>
    </div>

    <!-- Actions Bar -->
    <div class="module-actions">
      <div class="search-wrapper">
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText
            :modelValue="searchQuery"
            :placeholder="searchPlaceholder || t('common.search')"
            fluid
            @update:modelValue="onSearchInput($event as string)"
          />
        </IconField>
      </div>
      <Button
        :label="t('common.filter')"
        icon="pi pi-filter"
        severity="secondary"
        class="filter-btn"
      />
      <Button
        v-if="addButtonLabel"
        :label="addButtonLabel"
        icon="pi pi-plus"
        class="add-btn"
        @click="emit('add')"
      />
    </div>

    <!-- Content slot (table, etc.) -->
    <slot />
  </div>
</template>

<style scoped>
.module-layout {
  max-width: 100%;
}

.module-header {
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.module-title {
  font-size: 2rem;
  font-weight: 700;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.5rem;
}

.module-description {
  color: var(--text-muted);
  font-size: 0.95rem;
}

.module-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
  align-items: center;
}

.search-wrapper {
  flex: 1;
  min-width: 300px;
}

.filter-btn {
  background: var(--surface-elevated) !important;
  border: 1px solid var(--border-input-soft) !important;
  color: var(--text-soft) !important;
}

.filter-btn:hover {
  background: var(--border-input-soft) !important;
  color: var(--text) !important;
}

.add-btn {
  background: var(--accent-gradient) !important;
  border: none !important;
  font-weight: 500 !important;
}

.add-btn:hover {
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3) !important;
}

/* Dark theme search input */
.search-wrapper :deep(.p-inputtext) {
  background: var(--surface-1) !important;
  border: 1px solid var(--border-input-soft) !important;
  color: var(--text) !important;
}

.search-wrapper :deep(.p-inputtext:focus) {
  border-color: var(--accent-focus) !important;
  box-shadow: 0 0 0 2px var(--accent-ring-soft) !important;
}

.search-wrapper :deep(.p-inputtext::placeholder) {
  color: rgba(148, 163, 184, 0.5) !important;
}

.search-wrapper :deep(.p-icon) {
  color: var(--text-muted) !important;
}
</style>

<script setup lang="ts" generic="T">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'

const props = withDefaults(defineProps<{
  items: T[]
  idOf: (item: T) => string | number
  titleOf?: (item: T) => string
  metaOf?: (item: T) => string
  selectedId?: string | number | null
  /** Ids with unsaved changes — shows the accent dot on the row. */
  modifiedIds?: Set<string | number>
  loading?: boolean
  searchPlaceholder?: string
  showAdd?: boolean
  /** Shows a trash button on row hover and emits 'remove'. */
  removable?: boolean
}>(), {
  loading: false,
  showAdd: true,
  removable: false,
})

const emit = defineEmits<{
  (e: 'select', item: T): void
  (e: 'add'): void
  (e: 'search', query: string): void
  (e: 'remove', item: T): void
}>()

const { t } = useI18n()
const search = ref('')

let debounceTimer: ReturnType<typeof setTimeout> | undefined
watch(search, value => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => emit('search', value), 300)
})
</script>

<template>
  <div class="entity-list">
    <!-- Search + add -->
    <div class="entity-list-header">
      <div class="entity-list-search">
        <i class="pi pi-search"></i>
        <InputText
          v-model="search"
          :placeholder="searchPlaceholder ?? t('workspace.searchPlaceholder')"
          class="entity-list-search-input"
          fluid
        />
      </div>
      <slot name="filters" />
      <button
        v-if="showAdd"
        class="entity-list-add"
        v-tooltip.bottom="t('workspace.add')"
        @click="emit('add')"
      >
        <i class="pi pi-plus"></i>
      </button>
    </div>

    <!-- Rows -->
    <div class="entity-list-rows">
      <div v-if="loading" class="entity-list-loading">
        <i class="pi pi-spin pi-spinner"></i>
      </div>

      <template v-else>
        <button
          v-for="item in items"
          :key="idOf(item)"
          class="entity-row"
          :class="{ selected: selectedId != null && idOf(item) === selectedId }"
          @click="emit('select', item)"
        >
          <slot name="item" :item="item">
            <span class="entity-row-main">
              <span class="entity-row-title">
                {{ titleOf ? titleOf(item) : idOf(item) }}
                <span v-if="modifiedIds?.has(idOf(item))" class="entity-row-dot" aria-hidden="true" />
              </span>
              <span v-if="metaOf" class="entity-row-meta">{{ metaOf(item) }}</span>
            </span>
          </slot>
          <span
            v-if="removable"
            class="entity-row-remove"
            role="button"
            @click.stop="emit('remove', item)"
          >
            <i class="pi pi-trash"></i>
          </span>
        </button>

        <div v-if="items.length === 0" class="entity-list-empty">
          {{ t('workspace.noResults') }}
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.entity-list {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}

.entity-list-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem;
  padding-right: 2.1rem; /* room for the workspace collapse toggle */
  border-bottom: 1px solid var(--border-default);
  flex-shrink: 0;
}

.entity-list-search {
  position: relative;
  flex: 1;
  min-width: 0;
}

.entity-list-search > i {
  position: absolute;
  left: 0.6rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.75rem;
  color: var(--text-placeholder);
  pointer-events: none;
}

.entity-list-search-input {
  padding-left: 1.8rem !important;
  height: var(--input-height-sm) !important;
  font-size: 0.8rem !important;
}

.entity-list-add {
  width: var(--input-height-sm);
  height: var(--input-height-sm);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-default);
  border-radius: var(--radius);
  background: transparent;
  color: var(--text-muted);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s;
}

.entity-list-add:hover {
  color: var(--accent);
  border-color: var(--accent-focus);
  background: var(--accent-soft);
}

.entity-list-rows {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0.35rem;
}

.entity-row {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.45rem 0.6rem;
  border: none;
  border-left: 2px solid transparent;
  border-radius: var(--radius);
  background: none;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.1s;
}

.entity-row:hover {
  background: var(--surface-hover);
}

.entity-row.selected {
  background: var(--accent-soft);
  border-left-color: var(--accent);
}

.entity-row-main {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
  flex: 1;
}

.entity-row-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.entity-row.selected .entity-row-title {
  color: var(--accent);
}

.entity-row-dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-ring);
  flex-shrink: 0;
}

.entity-row-meta {
  font-size: 0.72rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.entity-row-remove {
  display: none;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: var(--radius);
  color: var(--text-placeholder);
  font-size: 0.7rem;
  flex-shrink: 0;
}

.entity-row:hover .entity-row-remove {
  display: flex;
}

.entity-row-remove:hover {
  color: var(--danger);
  background: color-mix(in srgb, var(--danger) 10%, transparent);
}

.entity-list-loading {
  display: flex;
  justify-content: center;
  padding: 1.5rem 0;
  color: var(--accent);
}

.entity-list-empty {
  padding: 1.25rem 0.5rem;
  text-align: center;
  font-size: 0.8rem;
  color: var(--text-placeholder);
  font-style: italic;
}
</style>

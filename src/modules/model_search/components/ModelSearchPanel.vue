<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import EntityListPanel from '@core/components/workspace/EntityListPanel.vue'
import ModelViewer from '@/modules/model_viewer/components/ModelViewer.vue'
import { searchModelTags } from '@/modules/model_search/service'
import type { ModelKind, ModelTag } from '@/modules/model_search/types'

const props = defineProps<{
  kind: ModelKind
}>()

const emit = defineEmits<{
  (e: 'select', displayId: number): void
}>()

const { t } = useI18n()

const results = ref<ModelTag[]>([])
const loading = ref(false)
const selected = ref<ModelTag | null>(null)
const lastQuery = ref('')

// Guards against out-of-order async responses when the query changes rapidly.
let searchToken = 0

function tagsOf(row: ModelTag): string[] {
  return [row.tags01, row.tags02, row.tags03].filter((tg): tg is string => !!tg)
}

function titleOf(row: ModelTag): string {
  return row.name || `#${row.displayId}`
}

function metaOf(row: ModelTag): string {
  return tagsOf(row).join(', ')
}

async function onSearch(query: string) {
  lastQuery.value = query
  const trimmed = query.trim()
  const token = ++searchToken

  if (!trimmed) {
    results.value = []
    selected.value = null
    loading.value = false
    return
  }

  loading.value = true
  try {
    const rows = await searchModelTags(props.kind, trimmed, 50)
    if (token !== searchToken) return
    results.value = rows
    // Auto-select the first hit so the preview shows something immediately.
    selected.value = rows[0] ?? null
  } catch (e) {
    if (token !== searchToken) return
    console.error('[ModelSearchPanel] search failed', e)
    results.value = []
    selected.value = null
  } finally {
    if (token === searchToken) loading.value = false
  }
}

function onSelectRow(row: ModelTag) {
  selected.value = row
}

function onUse() {
  if (selected.value) emit('select', selected.value.displayId)
}

// Switching kind (creature ↔ gameobject) invalidates the current results.
watch(() => props.kind, () => {
  results.value = []
  selected.value = null
  searchToken++
})
</script>

<template>
  <div class="model-search">
    <div class="model-search-list">
      <EntityListPanel
        :items="results"
        :idOf="(r: ModelTag) => r.displayId"
        :titleOf="titleOf"
        :metaOf="metaOf"
        :selectedId="selected?.displayId ?? null"
        :loading="loading"
        :searchPlaceholder="t('modelSearch.searchPlaceholder')"
        :showAdd="false"
        @search="onSearch"
        @select="onSelectRow"
      />
    </div>

    <div class="model-search-preview">
      <template v-if="selected">
        <div class="model-search-viewer">
          <ModelViewer :kind="kind" :displayId="selected.displayId" />
        </div>

        <div class="model-search-facts">
          <div class="model-search-name-row">
            <div class="model-search-name">{{ selected.name || t('modelSearch.noName') }}</div>
            <Button
              class="model-search-use"
              icon="pi pi-check"
              size="small"
              :label="t('modelSearch.useThis')"
              @click="onUse"
            />
          </div>
          <div class="model-search-id">{{ t('modelSearch.displayId') }} {{ selected.displayId }}</div>
          <div v-if="tagsOf(selected).length" class="model-search-tags">
            <span v-for="tag in tagsOf(selected)" :key="tag" class="model-search-tag">{{ tag }}</span>
          </div>
        </div>
      </template>

      <div v-else class="model-search-empty">
        <i class="pi pi-search model-search-empty-icon"></i>
        <span>{{ lastQuery.trim() ? t('modelSearch.noResults') : t('modelSearch.emptyHint') }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.model-search {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
  gap: 1rem;
  min-height: 0;
  height: 100%;
}

.model-search-list {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid var(--border-default);
  border-radius: 0.5rem;
  overflow: hidden;
  background: var(--surface-card, var(--surface-input));
}

.model-search-preview {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  min-height: 0;
  overflow-y: auto;
}

.model-search-viewer {
  width: 100%;
  /* Cap the (square) preview so it doesn't fill the column height and push the
     name / display id / tags / action button out of view. */
  max-width: 300px;
  /* Center the (capped) preview horizontally within the column. */
  align-self: center;
}

.model-search-facts {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.model-search-name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.model-search-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-search-id {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.model-search-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.1rem;
}

.model-search-tag {
  font-size: 0.75rem;
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid var(--accent-focus, var(--border-default));
  border-radius: 999px;
  padding: 0.1rem 0.6rem;
}

.model-search-use {
  flex-shrink: 0;
  white-space: nowrap;
}

.model-search-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  min-height: 12rem;
  padding: 1rem;
  text-align: center;
  color: var(--text-muted);
  border: 1px dashed var(--border-input);
  border-radius: 0.5rem;
  background: var(--surface-input);
}

.model-search-empty-icon {
  font-size: 2rem;
  color: var(--text-placeholder);
}

@media (max-width: 720px) {
  .model-search {
    grid-template-columns: 1fr;
  }
}
</style>

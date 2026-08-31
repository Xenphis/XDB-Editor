<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SelectButton from 'primevue/selectbutton'
import ModelSearchPanel from '@/modules/model_search/components/ModelSearchPanel.vue'
import type { ModelKind } from '@/modules/model_search/types'
import { copyToClipboard } from '@core/utils/clipboard'

const { t } = useI18n()

const kind = ref<ModelKind>('creature')
const kindOptions = [
  { label: t('modelSearch.kindCreature'), value: 'creature' as ModelKind },
  { label: t('modelSearch.kindGameObject'), value: 'gameobject' as ModelKind },
]

const copiedId = ref<number | null>(null)
let copiedTimer: ReturnType<typeof setTimeout> | undefined

async function onSelect(displayId: number) {
  await copyToClipboard(String(displayId))
  copiedId.value = displayId
  clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => { copiedId.value = null }, 2500)
}
</script>

<template>
  <div class="model-search-page">
    <div class="model-search-header">
      <div>
        <h2 class="model-search-title">{{ t('modelSearch.title') }}</h2>
        <p class="model-search-desc">{{ t('modelSearch.description') }}</p>
      </div>
      <SelectButton
        v-model="kind"
        :options="kindOptions"
        optionLabel="label"
        optionValue="value"
        :allowEmpty="false"
      />
    </div>

    <div v-if="copiedId != null" class="model-search-copied">
      <i class="pi pi-check-circle"></i>
      <span>{{ t('modelSearch.copied', { id: copiedId }) }}</span>
    </div>

    <div class="model-search-body">
      <ModelSearchPanel :kind="kind" @select="onSelect" />
    </div>
  </div>
</template>

<style scoped>
.model-search-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  gap: 1rem;
}

.model-search-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.model-search-title {
  font-size: 1.6rem;
  font-weight: 700;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.25rem;
}

.model-search-desc {
  color: var(--text-muted);
  font-size: 0.9rem;
  max-width: 42rem;
}

.model-search-copied {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  align-self: flex-start;
  font-size: 0.85rem;
  color: var(--success, #22c55e);
  background: color-mix(in srgb, var(--success, #22c55e) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--success, #22c55e) 35%, transparent);
  border-radius: var(--radius);
  padding: 0.35rem 0.75rem;
}

.model-search-body {
  flex: 1;
  min-height: 0;
}
</style>

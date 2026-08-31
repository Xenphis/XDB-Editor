<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Dialog from 'primevue/dialog'
import ModelSearchPanel from '@/modules/model_search/components/ModelSearchPanel.vue'
import type { ModelKind } from '@/modules/model_search/types'

const props = defineProps<{
  visible: boolean
  kind: ModelKind
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'select', displayId: number): void
}>()

const { t } = useI18n()

function onSelect(displayId: number) {
  emit('select', displayId)
  emit('update:visible', false)
}
</script>

<template>
  <Dialog
    :visible="props.visible"
    modal
    :header="kind === 'creature' ? t('modelSearch.dialogTitleCreature') : t('modelSearch.dialogTitleGameObject')"
    :style="{ width: '56rem' }"
    :breakpoints="{ '768px': '95vw' }"
    :dismissableMask="true"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="model-search-dialog-body">
      <ModelSearchPanel :kind="kind" @select="onSelect" />
    </div>
  </Dialog>
</template>

<style scoped>
.model-search-dialog-body {
  height: min(70vh, 32rem);
  min-height: 0;
}
</style>

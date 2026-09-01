<script setup lang="ts">
/**
 * Spell selection dialog, backed by the client's Spell.dbc index.
 *
 * Every `spell_*` table is keyed on a raw SpellID, so this is the component
 * that makes those editors readable. It degrades on purpose: with no WoW client
 * configured it says so instead of failing, and the caller's field stays
 * editable as a plain number.
 */
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Column from 'primevue/column'
import StyledDataTable from '@core/components/StyledDataTable.vue'
import { blpTextureUrl } from '@core/wow/assetHost'
import type { SpellInfo } from '@core/wow/spellDbc'
import { useSpellSearch } from '@core/composables/useSpellSearch'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'select', spellId: number): void
}>()

const { t } = useI18n()

const RESULT_LIMIT = 200
const { query, results, loading, noClient, refresh } = useSpellSearch({ limit: RESULT_LIMIT })

// Opening the dialog lists the table from the top, so there is always something
// browsable before the first keystroke. Indexing the DBC on the very first open
// takes a moment, hence the loading state rather than an empty flash.
watch(
  () => props.visible,
  open => {
    if (open) refresh()
  },
  { immediate: true },
)

function onSelect(spell: SpellInfo) {
  emit('select', spell.id)
  emit('update:visible', false)
}

/** Spells with no icon, or a BLP the decoder choked on, just show no image. */
function hideBrokenIcon(event: Event) {
  ;(event.target as HTMLImageElement).style.visibility = 'hidden'
}
</script>

<template>
  <Dialog
    :visible="props.visible"
    modal
    :header="t('spellPicker.title')"
    :style="{ width: '46rem' }"
    :breakpoints="{ '768px': '95vw' }"
    :dismissableMask="true"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="spell-picker">
      <span class="spell-picker-search">
        <i class="pi pi-search"></i>
        <InputText
          v-model="query"
          :placeholder="t('spellPicker.searchPlaceholder')"
          autofocus
          fluid
        />
      </span>

      <div v-if="noClient" class="spell-picker-state">
        <i class="pi pi-folder-open"></i>
        <p class="spell-picker-state-title">{{ t('spellPicker.noClient') }}</p>
        <p class="spell-picker-state-hint">{{ t('spellPicker.noClientHint') }}</p>
      </div>

      <div v-else-if="loading" class="spell-picker-state">
        <i class="pi pi-spin pi-spinner"></i>
        <p class="spell-picker-state-title">{{ t('spellPicker.loading') }}</p>
      </div>

      <div v-else-if="results.length === 0" class="spell-picker-state">
        <i class="pi pi-inbox"></i>
        <p class="spell-picker-state-title">{{ t('spellPicker.empty') }}</p>
      </div>

      <div v-else class="spell-picker-results">
        <StyledDataTable
          :data="results"
          dataKey="id"
          :rows="RESULT_LIMIT"
          @row-click="onSelect($event.data as SpellInfo)"
        >
          <Column :header="''" style="width: 3rem">
            <template #body="{ data }">
              <img
                v-if="data.icon"
                class="spell-picker-icon"
                :src="blpTextureUrl(data.icon)"
                alt=""
                @error="hideBrokenIcon"
              />
            </template>
          </Column>
          <Column field="id" :header="t('spellPicker.columns.id')" style="width: 6rem" />
          <Column field="name" :header="t('spellPicker.columns.name')" />
          <Column field="rank" :header="t('spellPicker.columns.rank')" style="width: 10rem" />
        </StyledDataTable>
      </div>
    </div>
  </Dialog>
</template>

<style scoped>
.spell-picker {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: min(70vh, 34rem);
  min-height: 0;
}

/* Search field with a leading icon. */
.spell-picker-search {
  position: relative;
  display: block;
}

.spell-picker-search > i {
  position: absolute;
  left: 0.85rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-placeholder);
  pointer-events: none;
  z-index: 1;
}

.spell-picker-search :deep(.p-inputtext) {
  padding-left: 2.4rem;
}

.spell-picker-results {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.spell-picker-icon {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.25rem;
  display: block;
}

/* Whole row is the click target, so say so. */
.spell-picker-results :deep(.p-datatable-tbody > tr) {
  cursor: pointer;
}

.spell-picker-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: var(--text-muted);
  text-align: center;
}

.spell-picker-state > i {
  font-size: 1.75rem;
  color: var(--text-placeholder);
}

.spell-picker-state-title {
  margin: 0;
  color: var(--text-soft);
}

.spell-picker-state-hint {
  margin: 0;
  font-size: 0.85rem;
  max-width: 26rem;
}
</style>

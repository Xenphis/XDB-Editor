<script setup lang="ts">
/**
 * Spells module: browse the client's spell catalog (there is no `spell`
 * table — see `@core/wow/spellDbc`) and tune the three world-database
 * overlays a spell can carry: `spell_bonus_data`, `spell_threat`,
 * `spell_custom_attr`. More `spell_*` tables get their own sections here
 * later (spell_ranks, spell_linked_spell…).
 */
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import EntityWorkspace from '@core/components/workspace/EntityWorkspace.vue'
import InspectorPanel from '@core/components/workspace/InspectorPanel.vue'
import WorkspaceEmptyState from '@core/components/workspace/WorkspaceEmptyState.vue'
import EditorHeader from '@core/components/EditorHeader.vue'
import EditorField from '@core/components/EditorField.vue'
import BitmaskField from '@core/components/BitmaskField.vue'
import SectionTabs, { type SectionTabItem } from '@core/components/SectionTabs.vue'
import { useSpellSearch } from '@core/composables/useSpellSearch'
import { fetchSpellDetail, type SpellDetail, type SpellInfo, type SpellKind } from '@core/wow/spellDbc'
import { useSpellTuningStore } from '@/modules/spells/store'
import { useSpellTuningFieldModifiers } from './useSpellTuningFieldModifiers'
import { useSpellCustomAttrFlags } from './useSpellCustomAttrFlags'
import SpellGroupedListPanel from './SpellGroupedListPanel.vue'
import SpellInfoTab from './SpellInfoTab.vue'
import { groupSpellsByRank } from './useSpellRankGroups'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useSpellTuningStore()
const { isBonusModified, isThreatModified, isCustomAttrModified } = useSpellTuningFieldModifiers()
const bonusForm = store.bonus.newEntry
const threatForm = store.threat.newEntry
const customAttrForm = store.customAttr.newEntry
const customAttrFlags = useSpellCustomAttrFlags()

// --- Browsable list (client Spell.dbc) ---
const { query, kind, results, loading: listLoading, noClient, refresh } = useSpellSearch({ limit: 500 })
onMounted(refresh)

function onSearch(value: string) {
  query.value = value
}

/** "Tous" / "Sorts" / "Auras" — `null` maps to `useSpellSearch`'s `undefined`
 *  (no filter) since PrimeVue's Select needs a real option value to select. */
const kindOptions = computed(() => [
  { value: null, label: t('spells.kindAll') },
  { value: 'spell' as const, label: t('spells.kindSpell') },
  { value: 'aura' as const, label: t('spells.kindAura') },
])

const kindFilter = computed<SpellKind | null>({
  get: () => kind.value ?? null,
  set: value => { kind.value = value ?? undefined },
})

const rankGroups = computed(() => groupSpellsByRank(results.value))

// --- Selection ---
/** undefined = no spell selected. */
const entryParam = computed<number | undefined>(() => {
  const raw = route.params.entry as string | undefined
  if (raw === undefined || raw === '') return undefined
  const n = Number(raw)
  return Number.isNaN(n) ? undefined : n
})

function onSelect(spell: SpellInfo) {
  router.push(`/spells/${spell.id}`)
}

// --- Selected spell's full DBC record — the header subtitle, the Info tab,
// and the inspector's rank fact all read from this one fetch. ---
const spellDetail = ref<SpellDetail | null>(null)
const detailLoading = ref(false)

watch(entryParam, async (entry) => {
  if (entry === undefined) {
    spellDetail.value = null
    return
  }
  detailLoading.value = true
  spellDetail.value = null
  try {
    spellDetail.value = await fetchSpellDetail(entry)
  } catch (e) {
    // No client configured, or the DBC lookup failed: the editor still works
    // on the raw id, it just can't show a name or the Info tab's contents.
    console.error('[SpellsWorkspace] failed to fetch spell detail:', e)
  } finally {
    detailLoading.value = false
  }
}, { immediate: true })

const editorSubtitle = computed(() => spellDetail.value?.name || t('spells.unknownSpell'))

const spellTabs = computed<SectionTabItem[]>(() => [
  { value: 'info', label: t('spells.tabs.info') },
  { value: 'tuning', label: t('spells.tabs.tuning'), modified: store.combinedHasChanges },
])

// --- Editor lifecycle ---
const editorLoading = ref(false)

watch(entryParam, async (entry) => {
  if (entry === undefined) {
    store.closeEditor()
    return
  }
  if (store.editorDataLoaded && store.editingId === entry) return
  editorLoading.value = true
  try {
    await store.openEditor(entry)
  } catch (e) {
    console.error('Failed to load spell tuning:', e)
  } finally {
    editorLoading.value = false
  }
}, { immediate: true })

async function onExecute() {
  try {
    await store.saveCurrent()
  } catch (e) {
    console.error('Failed to save spell tuning:', e)
  }
}

function onDiscard() {
  store.discardChanges()
}
</script>

<template>
  <EntityWorkspace storageKey="spells">
    <template #list>
      <SpellGroupedListPanel
        :groups="rankGroups"
        :selectedId="entryParam ?? null"
        :modifiedIds="store.modifiedIds"
        :loading="listLoading"
        :searchPlaceholder="t('spells.searchPlaceholder')"
        @select="onSelect"
        @search="onSearch"
      >
        <template #filters>
          <Select
            v-model="kindFilter"
            :options="kindOptions"
            optionLabel="label"
            optionValue="value"
            class="spell-kind-filter"
          />
        </template>
      </SpellGroupedListPanel>

      <div v-if="noClient" class="spells-list-noclient">
        <i class="pi pi-folder-open"></i>
        <p>{{ t('spellPicker.noClient') }}</p>
      </div>
    </template>

    <template #editor>
      <template v-if="entryParam !== undefined">
        <EditorHeader
          :subtitle="editorSubtitle"
          :id="entryParam"
          :showBack="false"
          :hasChanges="store.combinedHasChanges"
          :discardLabel="t('spells.discard')"
          :executeLabel="t('spells.execute')"
          @discard="onDiscard"
          @execute="onExecute"
        />

        <SectionTabs :tabs="spellTabs" variant="plain" defaultValue="info">
          <template #info>
            <SpellInfoTab :detail="spellDetail" :loading="detailLoading" />
          </template>

          <template #tuning>
            <div v-if="editorLoading" class="editor-loading">
              <i class="pi pi-spin pi-spinner"></i>
            </div>

            <template v-else>
              <!-- spell_bonus_data -->
              <div class="field-group">
                <div class="field-group-header">
                  <div>
                    <h4>{{ t('spells.groups.bonus') }}</h4>
                    <p>{{ t('spells.groups.bonusDesc') }}</p>
                  </div>
                  <button
                    class="clear-override-btn"
                    type="button"
                    v-tooltip.left="t('spells.clearOverrideTooltip')"
                    @click="store.clearBonus()"
                  >
                    <i class="pi pi-refresh"></i>
                    {{ t('spells.clearOverride') }}
                  </button>
                </div>
                <div class="field-grid">
                  <EditorField :label="t('spells.fields.direct_bonus')" :modified="isBonusModified('direct_bonus')">
                    <InputNumber v-model="bonusForm.direct_bonus" :minFractionDigits="1" :maxFractionDigits="5" :useGrouping="false" fluid />
                  </EditorField>
                  <EditorField :label="t('spells.fields.dot_bonus')" :modified="isBonusModified('dot_bonus')">
                    <InputNumber v-model="bonusForm.dot_bonus" :minFractionDigits="1" :maxFractionDigits="5" :useGrouping="false" fluid />
                  </EditorField>
                  <EditorField :label="t('spells.fields.ap_bonus')" :modified="isBonusModified('ap_bonus')">
                    <InputNumber v-model="bonusForm.ap_bonus" :minFractionDigits="1" :maxFractionDigits="5" :useGrouping="false" fluid />
                  </EditorField>
                  <EditorField :label="t('spells.fields.ap_dot_bonus')" :modified="isBonusModified('ap_dot_bonus')">
                    <InputNumber v-model="bonusForm.ap_dot_bonus" :minFractionDigits="1" :maxFractionDigits="5" :useGrouping="false" fluid />
                  </EditorField>
                  <EditorField :label="t('spells.fields.comments')" :modified="isBonusModified('comments')" :fullWidth="true">
                    <InputText v-model="bonusForm.comments" fluid />
                  </EditorField>
                </div>
              </div>

              <!-- spell_threat -->
              <div class="field-group">
                <div class="field-group-header">
                  <div>
                    <h4>{{ t('spells.groups.threat') }}</h4>
                    <p>{{ t('spells.groups.threatDesc') }}</p>
                  </div>
                  <button
                    class="clear-override-btn"
                    type="button"
                    v-tooltip.left="t('spells.clearOverrideTooltip')"
                    @click="store.clearThreat()"
                  >
                    <i class="pi pi-refresh"></i>
                    {{ t('spells.clearOverride') }}
                  </button>
                </div>
                <div class="field-grid">
                  <EditorField :label="t('spells.fields.flatMod')" :modified="isThreatModified('flatMod')">
                    <InputNumber v-model="threatForm.flatMod" :useGrouping="false" fluid />
                  </EditorField>
                  <EditorField :label="t('spells.fields.pctMod')" :modified="isThreatModified('pctMod')">
                    <InputNumber v-model="threatForm.pctMod" :minFractionDigits="1" :maxFractionDigits="5" :useGrouping="false" fluid />
                  </EditorField>
                  <EditorField :label="t('spells.fields.apPctMod')" :modified="isThreatModified('apPctMod')">
                    <InputNumber v-model="threatForm.apPctMod" :minFractionDigits="1" :maxFractionDigits="5" :useGrouping="false" fluid />
                  </EditorField>
                </div>
              </div>

              <!-- spell_custom_attr -->
              <div class="field-group">
                <div class="field-group-header">
                  <div>
                    <h4>{{ t('spells.groups.customAttr') }}</h4>
                    <p>{{ t('spells.groups.customAttrDesc') }}</p>
                  </div>
                  <button
                    class="clear-override-btn"
                    type="button"
                    v-tooltip.left="t('spells.clearOverrideTooltip')"
                    @click="store.clearCustomAttr()"
                  >
                    <i class="pi pi-refresh"></i>
                    {{ t('spells.clearOverride') }}
                  </button>
                </div>
                <div class="field-grid">
                  <EditorField :label="t('spells.fields.attributes')" :modified="isCustomAttrModified('attributes')" :fullWidth="true">
                    <BitmaskField
                      v-model="customAttrForm.attributes"
                      :options="customAttrFlags"
                      :label="t('spells.fields.attributes')"
                    />
                  </EditorField>
                </div>
              </div>
            </template>
          </template>
        </SectionTabs>
      </template>

      <WorkspaceEmptyState v-else />
    </template>

    <template #inspector>
      <InspectorPanel
        v-if="entryParam !== undefined"
        :title="t('workspace.inspector')"
        :subtitle="editorSubtitle"
        storageKey="spells"
        :changedFields="store.combinedChangedFields"
        :diffQuery="store.combinedDiffQuery"
        :fullQuery="store.combinedFullQuery"
        :hasChanges="store.combinedHasChanges"
      >
        <template #facts>
          <dl class="spell-facts">
            <div class="spell-facts-row">
              <dt>{{ t('spells.columns.entry') }}</dt>
              <dd>{{ entryParam }}</dd>
            </div>
            <div v-if="spellDetail?.rank" class="spell-facts-row">
              <dt>{{ t('spells.columns.rank') }}</dt>
              <dd>{{ spellDetail.rank }}</dd>
            </div>
          </dl>
        </template>
      </InspectorPanel>
    </template>
  </EntityWorkspace>
</template>

<style scoped>
@import './editor/spells-editor.css';

.editor-loading {
  display: flex;
  justify-content: center;
  padding: 3rem 0;
  color: var(--accent);
  font-size: 1.5rem;
}

.clear-override-btn {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
  padding: 0.35rem 0.7rem;
  background: transparent;
  border: 1px solid var(--border-input-soft);
  border-radius: 0.5rem;
  color: var(--text-muted);
  font-size: 0.78rem;
  cursor: pointer;
  transition: all 0.15s;
}

.clear-override-btn:hover {
  color: var(--text);
  border-color: var(--border-input);
  background: var(--surface-hover);
}

.spell-kind-filter {
  width: 5.5rem;
  height: var(--input-height-sm) !important;
  flex-shrink: 0;
}

.spell-kind-filter :deep(.p-select-label) {
  font-size: 0.72rem;
  padding: 0 0.4rem;
  line-height: calc(var(--input-height-sm) - 2px);
}

.spells-list-noclient {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem 1rem;
  color: var(--text-muted);
  text-align: center;
  font-size: 0.82rem;
}

.spells-list-noclient i {
  font-size: 1.5rem;
  color: var(--text-placeholder);
}

.spell-facts {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.spell-facts-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.78rem;
}

.spell-facts-row dt {
  color: var(--text-muted);
}

.spell-facts-row dd {
  margin: 0;
  color: var(--text);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
</style>

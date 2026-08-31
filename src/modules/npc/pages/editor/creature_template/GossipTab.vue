<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import EditorField from '@core/components/EditorField.vue'
import EditableDataTable, { type ColumnDef } from '@core/components/EditableDataTable.vue'
import SectionTabs, { type SectionTabItem } from '@core/components/SectionTabs.vue'
import { useNpcModuleStore, createDefaultNpcText, createDefaultNpcTextLocale, type GossipMenuEntry, type GossipOptionEntry, type GossipOptionLocaleEntry } from '@/modules/npc/store'
import type { NpcText } from '@/modules/npc/types/gossip/npc_text'
import type { NpcTextLocale } from '@/modules/npc/types/gossip/npc_text_locale'
import { creature_text_language_options } from '@/modules/npc/types/defines'
import { locale_options } from '@/modules/npc/types/creature_template/creature_text_locale'

const { t } = useI18n()
const store = useNpcModuleStore()
const form = store.formData

const gossipMenuEntries = computed<GossipMenuEntry[]>(() => store.gossipMenus.getNewEntries())
const gossipOptionEntries = computed<GossipOptionEntry[]>(() => store.gossipOptions.getNewEntries())
const gossipOptionLocaleEntries = computed<GossipOptionLocaleEntry[]>(() => store.gossipOptionLocales.getNewEntries())
const linkedTextIds = computed(() => new Set(gossipMenuEntries.value.map(row => Number(row.TextID)).filter(id => Number.isFinite(id) && id > 0)))
const npcTextLocaleEntries = computed<NpcTextLocale[]>(() => store.npcTextLocales.getNewEntries().filter(row => linkedTextIds.value.has(row.ID)))

const localeSelectOptions = locale_options.map(o => ({ value: o.value, label: `${o.value} - ${o.name}` }))
const languageOptions = creature_text_language_options.map(o => ({ value: o.value, label: o.name }))

const yesNoOptions = computed(() => [
  { value: 0, label: t('creature_template.gossip.no') },
  { value: 1, label: t('creature_template.gossip.yes') },
])

const detailDialogPt = {
  root: { style: 'background: var(--surface-base); border: 1px solid var(--border-input); border-radius: 0.75rem; overflow: hidden; color: var(--text);' },
  header: { style: 'background: var(--surface-base); border-bottom: 1px solid var(--border-default); padding: 1.25rem 1.5rem; color: var(--text);' },
  content: { style: 'background: var(--surface-base); padding: 1.5rem; color: var(--text);' },
  headerActions: { style: 'color: var(--text-muted);' },
  mask: { style: 'background: rgba(0,0,0,0.6);' },
}

const gossipIconOptions = [
  { value: 0, label: 'Chat' },
  { value: 1, label: 'Vendor' },
  { value: 2, label: 'Taxi' },
  { value: 3, label: 'Trainer' },
  { value: 4, label: 'Interact 1' },
  { value: 5, label: 'Interact 2' },
  { value: 6, label: 'Money Bag' },
  { value: 7, label: 'Talk' },
  { value: 8, label: 'Tabard' },
  { value: 9, label: 'Battle' },
  { value: 10, label: 'Dot' },
]

const gossipTypeOptions = [
  { value: 0, label: 'None' },
  { value: 1, label: 'Gossip' },
  { value: 2, label: 'Questgiver' },
  { value: 3, label: 'Vendor' },
  { value: 4, label: 'Taxi' },
  { value: 5, label: 'Trainer' },
  { value: 6, label: 'Spirit Healer' },
  { value: 7, label: 'Spirit Guide' },
  { value: 8, label: 'Innkeeper' },
  { value: 9, label: 'Banker' },
  { value: 10, label: 'Petitioner' },
  { value: 11, label: 'Tabard Designer' },
  { value: 12, label: 'Battleground' },
  { value: 13, label: 'Auctioneer' },
  { value: 14, label: 'Stable Pet' },
  { value: 15, label: 'Armorer' },
  { value: 16, label: 'Unlearn Talents' },
  { value: 17, label: 'Unlearn Pet Talents' },
  { value: 18, label: 'Learn Dual Spec' },
  { value: 19, label: 'Outdoor PvP' },
  { value: 20, label: 'Dual Spec Info' },
]

const gossipOptionColumns = computed<ColumnDef[]>(() => [
  { field: 'OptionID', header: t('creature_template.gossip.fields.OptionID'), type: 'number', width: '7rem' },
  { field: 'OptionIcon', header: t('creature_template.gossip.fields.OptionIcon'), type: 'select', width: '10rem', options: gossipIconOptions },
  { field: 'OptionText', header: t('creature_template.gossip.fields.OptionText'), type: 'text' },
  { field: 'OptionType', header: t('creature_template.gossip.fields.OptionType'), type: 'select', width: '11rem', options: gossipTypeOptions },
])

const gossipOptionLocaleColumns = computed<ColumnDef[]>(() => [
  { field: 'OptionID', header: t('creature_template.gossip.fields.OptionID'), type: 'number', width: '7rem' },
  { field: 'Locale', header: t('creature_template.gossip.fields.Locale'), type: 'select', width: '10rem', options: localeSelectOptions },
  { field: 'OptionText', header: t('creature_template.gossip.fields.OptionText'), type: 'text' },
  { field: 'BoxText', header: t('creature_template.gossip.fields.BoxText'), type: 'text' },
])

const npcTextLocaleColumns = computed<ColumnDef[]>(() => [
  { field: 'ID', header: t('creature_template.gossip.fields.ID'), type: 'number', width: '7rem' },
  { field: 'Locale', header: t('creature_template.gossip.fields.Locale'), type: 'select', width: '10rem', options: localeSelectOptions },
  { field: 'Text0_0', header: t('creature_template.gossip.fields.Text0_0'), type: 'text' },
  { field: 'Text0_1', header: t('creature_template.gossip.fields.Text0_1'), type: 'text' },
])

const hasGossipMenuChanges = computed(() => store.gossipMenus.getSqlDiff(form.gossip_menu_id) !== '')
const hasNpcTextChanges = computed(() => store.npcTexts.getSqlDiff(0) !== '')
const hasGossipTextChanges = computed(() => hasGossipMenuChanges.value || hasNpcTextChanges.value)
const hasGossipOptionChanges = computed(() => store.gossipOptions.getSqlDiff(form.gossip_menu_id) !== '')
const hasGossipOptionLocaleChanges = computed(() => store.gossipOptionLocales.getSqlDiff(form.gossip_menu_id) !== '')
const hasNpcTextLocaleChanges = computed(() => store.npcTextLocales.getSqlDiff(0) !== '')

const selectedTextId = ref<number | null>(null)
const selectedOptionId = ref<number | null>(null)

const detailText = computed(() => {
  if (selectedTextId.value == null) return null
  return store.npcTexts.getNewEntries().find(row => row.ID === selectedTextId.value) ?? null
})

const detailOption = computed(() => {
  if (selectedOptionId.value == null) return null
  return store.gossipOptions.getNewEntries().find(row => row.OptionID === selectedOptionId.value) ?? null
})

const textSlots = Array.from({ length: 8 }, (_value, index) => ({
  index,
  male: `text${index}_0`,
  female: `text${index}_1`,
  broadcast: `BroadcastTextID${index}`,
  lang: `lang${index}`,
  probability: `Probability${index}`,
  emotes: [0, 1, 2].map(emoteIndex => ({
    delay: `EmoteDelay${index}_${emoteIndex}`,
    emote: `Emote${index}_${emoteIndex}`,
  })),
}))

function getField(row: object | null, field: string) {
  return row ? (row as Record<string, any>)[field] : null
}

function setField(row: object | null, field: string, value: unknown) {
  if (!row) return
  ;(row as Record<string, any>)[field] = value
}

function ensureNpcText(textId: number) {
  if (textId <= 0) return
  if (!store.npcTexts.getNewEntries().some(row => row.ID === textId)) {
    store.npcTexts.pushNewEntry(createDefaultNpcText(textId))
  }
}

function getNpcText(textId: number) {
  return store.npcTexts.getNewEntries().find(row => row.ID === textId) ?? null
}

function updateGossipTextId(index: number, value: number | null) {
  const row = gossipMenuEntries.value[index]
  if (!row) return
  row.TextID = Number(value) || 0
  ensureNpcText(row.TextID)
  pruneUnlinkedDraftTexts()
}

function updateNpcTextField(textId: number, field: keyof NpcText, value: unknown) {
  ensureNpcText(textId)
  const text = getNpcText(textId)
  if (!text) return
  ;(text as unknown as Record<string, unknown>)[field] = value
}

function pruneUnlinkedDraftTexts() {
  const linkedIds = linkedTextIds.value
  const originalTextIds = new Set((store.npcTexts.getOriginalEntries() ?? []).map(row => row.ID))
  const originalLocaleIds = new Set((store.npcTextLocales.getOriginalEntries() ?? []).map(row => row.ID))
  store.npcTexts.setNewEntries(store.npcTexts.getNewEntries().filter(row => linkedIds.has(row.ID) || originalTextIds.has(row.ID)))
  store.npcTextLocales.setNewEntries(store.npcTextLocales.getNewEntries().filter(row => linkedIds.has(row.ID) || originalLocaleIds.has(row.ID)))
}

watch(
  () => [...linkedTextIds.value].join(','),
  () => {
    for (const textId of linkedTextIds.value) {
      ensureNpcText(textId)
    }
    pruneUnlinkedDraftTexts()
  },
  { immediate: true },
)

function getNextTextId() {
  const ids = [...linkedTextIds.value]
  const menuId = Number(form.gossip_menu_id) || 0
  const preferred = menuId > 0 && !ids.includes(menuId) ? menuId : Math.max(0, ...ids) + 1
  return preferred || 1
}

function addGossipMenuRow() {
  const textId = getNextTextId()
  store.gossipMenus.pushNewEntry({ TextID: textId, VerifiedBuild: 0 })
  ensureNpcText(textId)
}

function removeGossipMenuRow(index: number) {
  store.gossipMenus.removeNewEntry(index)
  pruneUnlinkedDraftTexts()
}

function openTextDetail(index: number) {
  const row = gossipMenuEntries.value[index]
  if (!row) return
  ensureNpcText(row.TextID)
  selectedTextId.value = row.TextID
}

function addGossipOption() {
  const nextOptionId = gossipOptionEntries.value.length > 0
    ? Math.max(...gossipOptionEntries.value.map(row => row.OptionID)) + 1
    : 0
  store.gossipOptions.pushNewEntry({
    OptionID: nextOptionId,
    OptionIcon: 0,
    OptionText: '',
    OptionBroadcastTextID: 0,
    OptionType: 1,
    OptionNpcFlag: 1,
    ActionMenuID: 0,
    ActionPoiID: 0,
    BoxCoded: 0,
    BoxMoney: 0,
    BoxText: null,
    BoxBroadcastTextID: 0,
    VerifiedBuild: 0,
  })
}

function removeGossipOption(index: number) {
  const option = gossipOptionEntries.value[index]
  store.gossipOptions.removeNewEntry(index)
  if (option) {
    store.gossipOptionLocales.setNewEntries(store.gossipOptionLocales.getNewEntries().filter(row => row.OptionID !== option.OptionID))
  }
}

function openOptionDetail(index: number) {
  const row = gossipOptionEntries.value[index]
  if (!row) return
  selectedOptionId.value = row.OptionID
}

function addGossipOptionLocale() {
  store.gossipOptionLocales.pushNewEntry({
    OptionID: gossipOptionEntries.value[0]?.OptionID ?? 0,
    Locale: '',
    OptionText: null,
    BoxText: null,
  })
}

function removeGossipOptionLocale(index: number) {
  store.gossipOptionLocales.removeNewEntry(index)
}

function addNpcTextLocale() {
  store.npcTextLocales.pushNewEntry(createDefaultNpcTextLocale([...linkedTextIds.value][0] ?? 0))
}

function removeNpcTextLocale(index: number) {
  store.npcTextLocales.removeNewEntry(index)
}

const menuTextSectionTabs = computed<SectionTabItem[]>(() => [
  {
    value: 'menu',
    label: t('creature_template.gossip.groups.menuTexts'),
    count: gossipMenuEntries.value.length,
    modified: hasGossipTextChanges.value,
  },
  {
    value: 'locale',
    label: t('creature_template.gossip.groups.npcTextLocales'),
    count: npcTextLocaleEntries.value.length,
    modified: hasNpcTextLocaleChanges.value,
  },
])

const optionSectionTabs = computed<SectionTabItem[]>(() => [
  {
    value: 'options',
    label: t('creature_template.gossip.groups.options'),
    count: gossipOptionEntries.value.length,
    modified: hasGossipOptionChanges.value,
  },
  {
    value: 'locale',
    label: t('creature_template.gossip.groups.optionLocales'),
    count: gossipOptionLocaleEntries.value.length,
    modified: hasGossipOptionLocaleChanges.value,
  },
])
</script>

<template>
  <div v-if="form.gossip_menu_id > 0">
    <div
      class="field-group gossip-menu-panel"
      :class="{ 'gossip-menu-panel-modified': hasGossipTextChanges || hasNpcTextLocaleChanges || hasGossipOptionChanges || hasGossipOptionLocaleChanges }"
    >
      <div class="field-group-header gossip-summary">
        <div>
          <h4>{{ t('creature_template.gossip.title') }}</h4>
          <p>{{ t('creature_template.gossip.desc') }}</p>
        </div>
        <span class="menu-id">#{{ form.gossip_menu_id }}</span>
      </div>

      <div class="gossip-menu-content">
        <SectionTabs
          :tabs="menuTextSectionTabs"
          defaultValue="menu"
          :modified="hasGossipTextChanges || hasNpcTextLocaleChanges"
        >
          <template #menu>
            <div class="embedded-gossip-table" :class="{ 'editable-table-modified': hasGossipTextChanges }">
              <div class="editable-table-header">
                <div class="editable-table-title-row">
                  <h4>
                    {{ t('creature_template.gossip.groups.menuTexts') }}
                    <span class="editable-table-count">({{ gossipMenuEntries.length }})</span>
                  </h4>
                  <Button
                    icon="pi pi-plus"
                    severity="secondary"
                    text
                    rounded
                    size="small"
                    class="header-add-btn"
                    @click="addGossipMenuRow"
                  />
                </div>
                <p class="editable-table-desc">{{ t('creature_template.gossip.groups.menuTextsDesc') }}</p>
              </div>

              <DataTable :value="gossipMenuEntries" dataKey="TextID" class="editable-datatable">
                <Column :header="t('creature_template.gossip.fields.TextID')" :style="{ width: '8rem' }">
                  <template #body="{ data, index }">
                    <InputNumber
                      :modelValue="data.TextID"
                      :useGrouping="false"
                      fluid
                      class="cell-input"
                      @update:modelValue="value => updateGossipTextId(index, value)"
                    />
                  </template>
                </Column>

                <Column :header="t('creature_template.gossip.fields.VerifiedBuild')" :style="{ width: '9rem' }">
                  <template #body="{ data }">
                    <InputNumber v-model="data.VerifiedBuild" :useGrouping="false" fluid class="cell-input" />
                  </template>
                </Column>

                <Column :header="t('creature_template.gossip.fields.text0_0')">
                  <template #body="{ data }">
                    <InputText
                      :modelValue="getNpcText(data.TextID)?.text0_0"
                      fluid
                      class="cell-input"
                      @update:modelValue="value => updateNpcTextField(data.TextID, 'text0_0', value)"
                    />
                  </template>
                </Column>

                <Column :header="t('creature_template.gossip.fields.text0_1')">
                  <template #body="{ data }">
                    <InputText
                      :modelValue="getNpcText(data.TextID)?.text0_1"
                      fluid
                      class="cell-input"
                      @update:modelValue="value => updateNpcTextField(data.TextID, 'text0_1', value)"
                    />
                  </template>
                </Column>

                <Column :header="t('creature_template.gossip.fields.Probability0')" :style="{ width: '8rem' }">
                  <template #body="{ data }">
                    <InputNumber
                      :modelValue="getNpcText(data.TextID)?.Probability0"
                      :minFractionDigits="0"
                      :maxFractionDigits="3"
                      :useGrouping="false"
                      fluid
                      class="cell-input"
                      @update:modelValue="value => updateNpcTextField(data.TextID, 'Probability0', value)"
                    />
                  </template>
                </Column>

                <Column header="" :style="{ width: '5.5rem' }" bodyStyle="text-align: center; padding: 0.25rem">
                  <template #body="{ index }">
                    <div class="action-buttons">
                      <Button
                        icon="pi pi-ellipsis-h"
                        severity="secondary"
                        text
                        rounded
                        size="small"
                        class="action-detail"
                        @click="openTextDetail(index)"
                      />
                      <Button
                        icon="pi pi-trash"
                        severity="danger"
                        text
                        rounded
                        size="small"
                        class="action-delete"
                        @click="removeGossipMenuRow(index)"
                      />
                    </div>
                  </template>
                </Column>

                <template #empty>
                  <div class="editable-table-empty">{{ t('common.noEntries', 'Aucune entrée') }}</div>
                </template>
              </DataTable>
            </div>
          </template>

          <template #locale>
            <EditableDataTable
              :entries="npcTextLocaleEntries"
              :columns="npcTextLocaleColumns"
              :hasChanges="hasNpcTextLocaleChanges"
              :description="t('creature_template.gossip.groups.npcTextLocalesDesc')"
              dataKey="Locale"
              showHeaderAdd
              embedded
              @add="addNpcTextLocale"
              @remove="removeNpcTextLocale"
            />
          </template>
        </SectionTabs>

        <SectionTabs
          :tabs="optionSectionTabs"
          defaultValue="options"
          :modified="hasGossipOptionChanges || hasGossipOptionLocaleChanges"
        >
          <template #options>
            <EditableDataTable
              :entries="gossipOptionEntries"
              :columns="gossipOptionColumns"
              :hasChanges="hasGossipOptionChanges"
              :description="t('creature_template.gossip.groups.optionsDesc')"
              dataKey="OptionID"
              showHeaderAdd
              showDetailButton
              embedded
              @add="addGossipOption"
              @remove="removeGossipOption"
              @detail="openOptionDetail"
            />
          </template>

          <template #locale>
            <EditableDataTable
              :entries="gossipOptionLocaleEntries"
              :columns="gossipOptionLocaleColumns"
              :hasChanges="hasGossipOptionLocaleChanges"
              :description="t('creature_template.gossip.groups.optionLocalesDesc')"
              dataKey="Locale"
              showHeaderAdd
              embedded
              @add="addGossipOptionLocale"
              @remove="removeGossipOptionLocale"
            />
          </template>
        </SectionTabs>
      </div>
    </div>

    <Dialog
      :visible="selectedTextId != null"
      :header="detailText ? `${t('creature_template.gossip.dialogs.npcText')} #${detailText.ID}` : ''"
      modal
      :style="{ width: '58rem', maxWidth: '95vw' }"
      :pt="detailDialogPt"
      @update:visible="visible => { if (!visible) selectedTextId = null }"
      @hide="selectedTextId = null"
    >
      <div v-if="detailText" class="detail-stack">
        <div class="detail-grid compact-grid">
          <EditorField :label="t('creature_template.gossip.fields.ID')">
            <InputNumber :modelValue="detailText.ID" :useGrouping="false" disabled fluid />
          </EditorField>
          <EditorField :label="t('creature_template.gossip.fields.VerifiedBuild')">
            <InputNumber :modelValue="detailText.VerifiedBuild" :useGrouping="false" fluid @update:modelValue="value => setField(detailText, 'VerifiedBuild', value)" />
          </EditorField>
        </div>

        <div v-for="slot in textSlots" :key="slot.index" class="field-group nested-group">
          <div class="field-group-header">
            <h4>{{ t('creature_template.gossip.textSlot') }} {{ slot.index }}</h4>
          </div>
          <div class="detail-grid">
            <EditorField :label="t('creature_template.gossip.fields.maleText')" fullWidth>
              <Textarea :modelValue="getField(detailText, slot.male)" rows="2" fluid @update:modelValue="value => setField(detailText, slot.male, value)" />
            </EditorField>
            <EditorField :label="t('creature_template.gossip.fields.femaleText')" fullWidth>
              <Textarea :modelValue="getField(detailText, slot.female)" rows="2" fluid @update:modelValue="value => setField(detailText, slot.female, value)" />
            </EditorField>
            <EditorField :label="t('creature_template.gossip.fields.BroadcastTextID')">
              <InputNumber :modelValue="getField(detailText, slot.broadcast)" :useGrouping="false" fluid @update:modelValue="value => setField(detailText, slot.broadcast, value)" />
            </EditorField>
            <EditorField :label="t('creature_template.gossip.fields.lang')">
              <Select :modelValue="getField(detailText, slot.lang)" :options="languageOptions" optionLabel="label" optionValue="value" fluid @update:modelValue="value => setField(detailText, slot.lang, value)" />
            </EditorField>
            <EditorField :label="t('creature_template.gossip.fields.Probability')">
              <InputNumber :modelValue="getField(detailText, slot.probability)" :minFractionDigits="0" :maxFractionDigits="3" :useGrouping="false" fluid @update:modelValue="value => setField(detailText, slot.probability, value)" />
            </EditorField>
            <template v-for="(emote, emoteIndex) in slot.emotes" :key="`${slot.index}-${emoteIndex}`">
              <EditorField :label="`${t('creature_template.gossip.fields.EmoteDelay')} ${emoteIndex}`">
                <InputNumber :modelValue="getField(detailText, emote.delay)" :useGrouping="false" fluid @update:modelValue="value => setField(detailText, emote.delay, value)" />
              </EditorField>
              <EditorField :label="`${t('creature_template.gossip.fields.Emote')} ${emoteIndex}`">
                <InputNumber :modelValue="getField(detailText, emote.emote)" :useGrouping="false" fluid @update:modelValue="value => setField(detailText, emote.emote, value)" />
              </EditorField>
            </template>
          </div>
        </div>
      </div>
    </Dialog>

    <Dialog
      :visible="selectedOptionId != null"
      :header="detailOption ? `${t('creature_template.gossip.dialogs.option')} #${detailOption.OptionID}` : ''"
      modal
      :style="{ width: '46rem', maxWidth: '95vw' }"
      :pt="detailDialogPt"
      @update:visible="visible => { if (!visible) selectedOptionId = null }"
      @hide="selectedOptionId = null"
    >
      <div v-if="detailOption" class="detail-grid">
        <EditorField :label="t('creature_template.gossip.fields.OptionID')">
          <InputNumber v-model="detailOption.OptionID" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('creature_template.gossip.fields.OptionIcon')">
          <Select v-model="detailOption.OptionIcon" :options="gossipIconOptions" optionLabel="label" optionValue="value" fluid />
        </EditorField>
        <EditorField :label="t('creature_template.gossip.fields.OptionText')" fullWidth>
          <Textarea v-model="detailOption.OptionText" rows="3" fluid />
        </EditorField>
        <EditorField :label="t('creature_template.gossip.fields.OptionBroadcastTextID')">
          <InputNumber v-model="detailOption.OptionBroadcastTextID" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('creature_template.gossip.fields.OptionType')">
          <Select v-model="detailOption.OptionType" :options="gossipTypeOptions" optionLabel="label" optionValue="value" fluid />
        </EditorField>
        <EditorField :label="t('creature_template.gossip.fields.OptionNpcFlag')">
          <InputNumber v-model="detailOption.OptionNpcFlag" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('creature_template.gossip.fields.ActionMenuID')">
          <InputNumber v-model="detailOption.ActionMenuID" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('creature_template.gossip.fields.ActionPoiID')">
          <InputNumber v-model="detailOption.ActionPoiID" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('creature_template.gossip.fields.BoxCoded')">
          <Select v-model="detailOption.BoxCoded" :options="yesNoOptions" optionLabel="label" optionValue="value" fluid />
        </EditorField>
        <EditorField :label="t('creature_template.gossip.fields.BoxMoney')">
          <InputNumber v-model="detailOption.BoxMoney" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('creature_template.gossip.fields.BoxText')" fullWidth>
          <Textarea v-model="detailOption.BoxText" rows="3" fluid />
        </EditorField>
        <EditorField :label="t('creature_template.gossip.fields.BoxBroadcastTextID')">
          <InputNumber v-model="detailOption.BoxBroadcastTextID" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('creature_template.gossip.fields.VerifiedBuild')">
          <InputNumber v-model="detailOption.VerifiedBuild" :useGrouping="false" fluid />
        </EditorField>
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
@import '../npc-editor.css';

.gossip-summary {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.menu-id {
  color: var(--accent);
  font-weight: 700;
  font-size: 1rem;
}

.gossip-menu-panel-modified {
  border-color: var(--accent-focus);
}

.gossip-menu-content {
  display: grid;
  gap: 1.25rem;
  border-top: 1px solid var(--border-default);
  padding-top: 1.25rem;
}

.embedded-gossip-table {
  background: transparent;
  border-color: transparent;
  border-radius: 0;
  margin-bottom: 0;
  overflow: visible;
}

.embedded-gossip-table.editable-table-modified {
  border-color: transparent;
}

.embedded-gossip-table .editable-table-header {
  padding: 0 0 0.75rem;
}

.embedded-gossip-table .editable-datatable {
  margin: 0;
  width: 100%;
}

.editable-table-wrapper {
  background: var(--surface-1);
  border-radius: 0.75rem;
  border: 1px solid var(--border-default);
  overflow: hidden;
  transition: border-color 0.2s;
  margin-bottom: 1.5rem;
}

.editable-table-modified {
  border-color: var(--accent-focus);
}

.editable-table-header {
  padding: 1.25rem 1.25rem 0.75rem;
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

.editable-table-modified .editable-table-header h4 {
  color: var(--accent);
}

.editable-table-count {
  font-weight: 400;
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-left: 0.5rem;
}

.editable-table-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: 0.25rem 0 0 0;
}

.editable-datatable {
  background: transparent;
  margin: 0 1rem 1rem;
  width: calc(100% - 2rem);
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

:deep(.p-datatable-tbody > tr:last-child > td) {
  border-bottom: none !important;
}

.header-add-btn {
  color: var(--text-muted) !important;
  width: 2rem !important;
  height: 2rem !important;
}

.header-add-btn:hover {
  color: var(--accent) !important;
  background: var(--accent-ring-soft) !important;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 0.125rem;
}

.action-detail,
.action-delete {
  width: 2rem !important;
  height: 2rem !important;
}

.action-detail {
  color: var(--text-muted) !important;
}

.action-detail:hover {
  color: var(--accent) !important;
  background: var(--accent-ring-soft) !important;
}

.action-delete {
  color: var(--danger) !important;
}

.action-delete:hover {
  background: color-mix(in srgb, var(--danger) 10%, transparent) !important;
}

.editable-table-empty {
  color: var(--text-muted);
  padding: 2rem;
  text-align: center;
}

.detail-stack {
  display: grid;
  gap: 1rem;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.compact-grid {
  grid-template-columns: repeat(2, minmax(0, 14rem));
}

.nested-group {
  margin-bottom: 0;
}

:deep(.p-dialog) {
  background: var(--surface-input) !important;
  color: var(--text) !important;
}

:deep(.p-dialog-header),
:deep(.p-dialog-content) {
  background: var(--surface-input) !important;
  color: var(--text) !important;
}


@media (max-width: 720px) {
  .detail-grid,
  .compact-grid {
    grid-template-columns: 1fr;
  }
}
</style>
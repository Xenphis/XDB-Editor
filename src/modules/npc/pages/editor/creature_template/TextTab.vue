<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import EditorField from '@core/components/EditorField.vue'
import EditableDataTable, { type ColumnDef } from '@core/components/EditableDataTable.vue'
import SectionTabs, { type SectionTabItem } from '@core/components/SectionTabs.vue'
import { useNpcModuleStore, type TextEntry, type TextLocaleEntry } from '@/modules/npc/store'
import NpcTabGossip from './GossipTab.vue'
import {
  creature_text_type_options,
  creature_text_language_options,
  creature_text_range_options
} from '@/modules/npc/types/defines'
import { locale_options } from '@/modules/npc/types/creature_template/creature_text_locale'

const { t } = useI18n()
const store = useNpcModuleStore()

const hasGossipMenu = computed(() => store.formData.gossip_menu_id > 0)

const textEntries = computed<TextEntry[]>(() => store.texts.getNewEntries())
const textLocaleEntries = computed<TextLocaleEntry[]>(() => store.textLocales.getNewEntries())

const textTypeOptions = creature_text_type_options.map(o => ({ value: o.value, label: o.name }))
const textLanguageOptions = creature_text_language_options.map(o => ({ value: o.value, label: o.name }))
const textRangeOptions = creature_text_range_options.map(o => ({ value: o.value, label: o.name }))

const textColumns: ColumnDef[] = [
  { field: 'GroupID', header: t('creature_template.fields.text_groupid'), type: 'number', width: '5rem' },
  { field: 'ID', header: t('creature_template.fields.text_id'), type: 'number', width: '4rem' },
  { field: 'Text', header: t('creature_template.fields.text_text'), type: 'text' },
  { field: 'Type', header: t('creature_template.fields.text_type'), type: 'select', width: '9rem', options: textTypeOptions },
]

const localeSelectOptions = locale_options.map(o => ({ value: o.value, label: `${o.value} — ${o.name}` }))

const textLocaleColumns: ColumnDef[] = [
  { field: 'GroupID', header: t('creature_template.fields.text_groupid'), type: 'number', width: '5rem' },
  { field: 'ID', header: t('creature_template.fields.text_id'), type: 'number', width: '4rem' },
  { field: 'Locale', header: t('creature_template.fields.text_locale_locale'), type: 'select', width: '10rem', options: localeSelectOptions },
  { field: 'Text', header: t('creature_template.fields.text_locale_text'), type: 'text' },
]

// Detail dialog
const detailDialogVisible = ref(false)
const detailIndex = ref<number | null>(null)

const detailEntry = computed(() => {
  if (detailIndex.value == null) return null
  return textEntries.value[detailIndex.value] ?? null
})

function openDetail(index: number) {
  detailIndex.value = index
  detailDialogVisible.value = true
}

function addText() {
  const maxGroup = textEntries.value.length > 0 ? Math.max(...textEntries.value.map((t: TextEntry) => t.GroupID)) : -1
  store.texts.pushNewEntry({
    GroupID: maxGroup + 1,
    ID: 0,
    Text: '',
    Type: 0,
    Language: 0,
    Probability: 100,
    Emote: 0,
    Duration: 0,
    Sound: 0,
    BroadcastTextId: 0,
    TextRange: 0,
    comment: '',
  })
}

function removeText(index: number) {
  store.texts.removeNewEntry(index)
}

const hasChanges = computed(() => store.texts.getSqlDiff(store.formData.entry) !== '')

// ─── Text Locale logic ───────────────────────────────────────────────

const hasLocaleChanges = computed(() => store.textLocales.getSqlDiff(store.formData.entry) !== '')

function addTextLocale() {
  store.textLocales.pushNewEntry({ GroupID: 0, ID: 0, Locale: '', Text: null })
}

function removeTextLocale(index: number) {
  store.textLocales.removeNewEntry(index)
}

const textSectionTabs = computed<SectionTabItem[]>(() => [
  {
    value: 'text',
    label: t('creature_template.groups.creatureText'),
    count: textEntries.value.length,
    modified: hasChanges.value,
  },
  {
    value: 'locale',
    label: t('creature_template.groups.creatureTextLocale'),
    count: textLocaleEntries.value.length,
    modified: hasLocaleChanges.value,
  },
])
</script>

<template>
  <div>
    <SectionTabs
      :tabs="textSectionTabs"
      defaultValue="text"
      :modified="hasChanges || hasLocaleChanges"
    >
      <template #text>
        <EditableDataTable
          :entries="textEntries"
          :columns="textColumns"
          :hasChanges="hasChanges"
          :description="t('creature_template.groups.creatureTextDesc')"
          showHeaderAdd
          showDetailButton
          embedded
          @add="addText"
          @remove="removeText"
          @detail="openDetail"
        />
      </template>

      <template #locale>
        <EditableDataTable
          :entries="textLocaleEntries"
          :columns="textLocaleColumns"
          :hasChanges="hasLocaleChanges"
          :description="t('creature_template.groups.creatureTextLocaleDesc')"
          showHeaderAdd
          embedded
          @add="addTextLocale"
          @remove="removeTextLocale"
        />
      </template>
    </SectionTabs>

    <div v-if="hasGossipMenu" class="gossip-section">
      <NpcTabGossip />
    </div>

    <!-- Creature Text Detail Dialog -->
    <Dialog
      v-model:visible="detailDialogVisible"
      :header="detailEntry ? `${t('creature_template.groups.creatureText')} — ${t('creature_template.fields.text_groupid')} ${detailEntry.GroupID}, ID ${detailEntry.ID}` : ''"
      modal
      :style="{ width: '40rem' }"
      :dt="{
        background: 'var(--surface-input)',
        borderColor: 'var(--border-input-soft)',
        color: 'var(--text)',
        header: {
          background: 'var(--surface-input)',
          color: 'var(--text)',
          borderColor: 'var(--border-default)',
        },
      }"
    >
      <div v-if="detailEntry" class="detail-grid">
        <EditorField :label="t('creature_template.fields.text_groupid')">
          <InputNumber v-model="detailEntry.GroupID" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('creature_template.fields.text_id')">
          <InputNumber v-model="detailEntry.ID" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('creature_template.fields.text_text')" fullWidth>
          <InputText v-model="detailEntry.Text" fluid />
        </EditorField>
        <EditorField :label="t('creature_template.fields.text_type')">
          <Select v-model="detailEntry.Type" :options="textTypeOptions" optionLabel="label" optionValue="value" fluid />
        </EditorField>
        <EditorField :label="t('creature_template.fields.text_language')">
          <Select v-model="detailEntry.Language" :options="textLanguageOptions" optionLabel="label" optionValue="value" fluid />
        </EditorField>
        <EditorField :label="t('creature_template.fields.text_probability')">
          <InputNumber v-model="detailEntry.Probability" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('creature_template.fields.text_emote')">
          <InputNumber v-model="detailEntry.Emote" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('creature_template.fields.text_duration')">
          <InputNumber v-model="detailEntry.Duration" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('creature_template.fields.text_sound')">
          <InputNumber v-model="detailEntry.Sound" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('creature_template.fields.text_broadcasttextid')">
          <InputNumber v-model="detailEntry.BroadcastTextId" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('creature_template.fields.text_range')">
          <Select v-model="detailEntry.TextRange" :options="textRangeOptions" optionLabel="label" optionValue="value" fluid />
        </EditorField>
        <EditorField :label="t('creature_template.fields.text_comment')" fullWidth>
          <InputText v-model="detailEntry.comment" fluid />
        </EditorField>
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.gossip-section {
  margin-top: 1.5rem;
}

</style>

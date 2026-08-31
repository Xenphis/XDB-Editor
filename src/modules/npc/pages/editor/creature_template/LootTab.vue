<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import InputNumber from 'primevue/inputnumber'
import Button from 'primevue/button'
import EditorField from '@core/components/EditorField.vue'
import EditableDataTable, { type ColumnDef } from '@core/components/EditableDataTable.vue'
import { useNpcModuleStore } from '@/modules/npc/store'
import { useNpcFieldModifiers } from '@/modules/npc/pages/useNpcFieldModifiers'

const { t } = useI18n()
const store = useNpcModuleStore()
const { isFieldModified } = useNpcFieldModifiers()

const form = store.formData

const MAX_QUEST_ITEMS = 6

const questItemEntries = computed(() => store.questItems.getNewEntries())
const questItemHasChanges = computed(() => store.questItems.getSqlDiff(form.entry).length > 0)

const questItemColumns: ColumnDef[] = [
  { field: 'Idx', header: t('creature_template.fields.questItem_idx'), type: 'readonly', width: '5rem' },
  { field: 'ItemId', header: t('creature_template.fields.questItem_itemId'), type: 'number' },
]

function addQuestItem() {
  if (questItemEntries.value.length >= MAX_QUEST_ITEMS) return
  const usedIdx = new Set(questItemEntries.value.map(e => e.Idx))
  let nextIdx = 0
  while (usedIdx.has(nextIdx) && nextIdx < MAX_QUEST_ITEMS) nextIdx++
  if (nextIdx >= MAX_QUEST_ITEMS) return
  store.questItems.pushNewEntry({ Idx: nextIdx, ItemId: 0 })
}

function removeQuestItem(index: number) {
  store.questItems.removeNewEntry(index)
}

// --- Quest relations ---
const questStarterEntries = computed(() => store.questStarters.getNewEntries())
const questEnderEntries = computed(() => store.questEnders.getNewEntries())
const questRelHasChanges = computed(() =>
  store.questStarters.getSqlDiff(form.entry).length > 0 ||
  store.questEnders.getSqlDiff(form.entry).length > 0
)

function addQuestStarter() { store.questStarters.pushNewEntry({ id: form.entry, quest: 0 }) }
function removeQuestStarter(idx: number) { store.questStarters.removeNewEntry(idx) }
function addQuestEnder() { store.questEnders.pushNewEntry({ id: form.entry, quest: 0 }) }
function removeQuestEnder(idx: number) { store.questEnders.removeNewEntry(idx) }
</script>

<template>
  <div class="field-group">
    <div class="field-group-header">
      <h4>{{ t('creature_template.groups.lootConfig') }}</h4>
      <p>{{ t('creature_template.groups.lootConfigDesc') }}</p>
    </div>
    <div class="field-grid">
      <EditorField :label="t('creature_template.fields.lootid')" :modified="isFieldModified('lootid')">
        <InputNumber v-model="form.lootid" :useGrouping="false" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.pickpocketloot')" :modified="isFieldModified('pickpocketloot')">
        <InputNumber v-model="form.pickpocketloot" :useGrouping="false" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.skinloot')" :modified="isFieldModified('skinloot')">
        <InputNumber v-model="form.skinloot" :useGrouping="false" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.mingold')" :modified="isFieldModified('mingold')">
        <InputNumber v-model="form.mingold" :useGrouping="false" fluid />
      </EditorField>
      <EditorField :label="t('creature_template.fields.maxgold')" :modified="isFieldModified('maxgold')">
        <InputNumber v-model="form.maxgold" :useGrouping="false" fluid />
      </EditorField>
    </div>
  </div>

  <div class="field-group" :class="{ 'field-group-modified': questItemHasChanges }">
    <EditableDataTable
      :entries="questItemEntries"
      :columns="questItemColumns"
      :hasChanges="questItemHasChanges"
      :maxRows="MAX_QUEST_ITEMS"
      :title="t('creature_template.groups.questItems')"
      :description="t('creature_template.groups.questItemsDesc')"
      dataKey="Idx"
      embedded
      @add="addQuestItem"
      @remove="removeQuestItem"
    />
  </div>

  <div class="field-group" :class="{ 'field-group-modified': questRelHasChanges }">
    <div class="field-group-header">
      <h4>{{ t('creature_quests.sectionTitle') }}</h4>
    </div>
    <div class="quest-rel-grid">
      <div class="quest-rel-col">
        <div class="quest-col-title">{{ t('creature_quests.starters') }}</div>
        <div class="quest-col-desc">{{ t('creature_quests.startersDesc') }}</div>
        <div v-if="questStarterEntries.length === 0" class="qrel-empty">{{ t('creature_quests.empty') }}</div>
        <div v-for="(entry, idx) in questStarterEntries" :key="idx" class="qrel-row">
          <span class="qrel-tag">{{ t('creature_quests.quest') }}</span>
          <InputNumber v-model="entry.quest" :useGrouping="false" :min="0" :placeholder="t('creature_quests.questPlaceholder')" fluid />
          <Button icon="pi pi-trash" severity="danger" text size="small" @click="removeQuestStarter(idx)" />
        </div>
        <div class="qrel-add-row">
          <Button icon="pi pi-plus" :label="t('creature_quests.add')" severity="secondary" size="small" @click="addQuestStarter" />
        </div>
      </div>
      <div class="quest-rel-col">
        <div class="quest-col-title">{{ t('creature_quests.enders') }}</div>
        <div class="quest-col-desc">{{ t('creature_quests.endersDesc') }}</div>
        <div v-if="questEnderEntries.length === 0" class="qrel-empty">{{ t('creature_quests.empty') }}</div>
        <div v-for="(entry, idx) in questEnderEntries" :key="idx" class="qrel-row">
          <span class="qrel-tag">{{ t('creature_quests.quest') }}</span>
          <InputNumber v-model="entry.quest" :useGrouping="false" :min="0" :placeholder="t('creature_quests.questPlaceholder')" fluid />
          <Button icon="pi pi-trash" severity="danger" text size="small" @click="removeQuestEnder(idx)" />
        </div>
        <div class="qrel-add-row">
          <Button icon="pi pi-plus" :label="t('creature_quests.add')" severity="secondary" size="small" @click="addQuestEnder" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '../npc-editor.css';

.quest-rel-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.quest-col-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--p-text-color);
  margin-bottom: 0.25rem;
}

.quest-col-desc {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  margin-bottom: 0.75rem;
}

.qrel-empty {
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
  padding: 0.5rem 0;
  text-align: center;
}

.qrel-row {
  display: grid;
  grid-template-columns: 5rem 1fr 2.5rem;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.4rem;
}

.qrel-tag {
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
  font-weight: 500;
}

.qrel-add-row {
  margin-top: 0.5rem;
}

.field-group-modified {
  border-color: var(--accent-focus);
}
</style>

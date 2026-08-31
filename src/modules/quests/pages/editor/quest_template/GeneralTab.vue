<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import EditorField from '@core/components/EditorField.vue'
import BitmaskField from '@core/components/BitmaskField.vue'
import { useQuestModuleStore } from '@/modules/quests/store'
import { quest_flags_options } from '@/modules/quests/types/quest_template'

const { t } = useI18n()
const store = useQuestModuleStore()
const form = store.formData
const orig = computed(() => store.originalValue)

const detailsForm = store.details.newEntry
const origDetails = computed(() => store.details.getOriginalEntry())

function isModified(field: keyof typeof form): boolean {
  if (!orig.value) return false
  return (orig.value as any)[field] !== (form as any)[field]
}

function isDetailsModified(field: keyof typeof detailsForm): boolean {
  if (!origDetails.value) return false
  return (origDetails.value as any)[field] !== (detailsForm as any)[field]
}

const questTypeOptions = [
  { value: 0, label: t('quest.types.0') },
  { value: 1, label: t('quest.types.1') },
  { value: 2, label: t('quest.types.2') },
  { value: 3, label: t('quest.types.3') },
]

// ─── Quest givers / enders ──────────────────────────────────────────────────

type GiverKind = 'creature' | 'gameobject'

const kindOptions: { value: GiverKind; label: string }[] = [
  { value: 'creature', label: t('quest_givers.creature') },
  { value: 'gameobject', label: t('quest_givers.gameobject') },
]

const newStarterKind = ref<GiverKind>('creature')
const newStarterId = ref(0)
const newEnderKind = ref<GiverKind>('creature')
const newEnderId = ref(0)

const starterHasChanges = computed(() =>
  store.creatureStarters.getSqlDiff(form.ID).length > 0 ||
  store.gameobjectStarters.getSqlDiff(form.ID).length > 0
)
const enderHasChanges = computed(() =>
  store.creatureEnders.getSqlDiff(form.ID).length > 0 ||
  store.gameobjectEnders.getSqlDiff(form.ID).length > 0
)

function addStarter() {
  const mgr = newStarterKind.value === 'creature' ? store.creatureStarters : store.gameobjectStarters
  mgr.pushNewEntry({ id: newStarterId.value, quest: form.ID })
  newStarterId.value = 0
}

function addEnder() {
  const mgr = newEnderKind.value === 'creature' ? store.creatureEnders : store.gameobjectEnders
  mgr.pushNewEntry({ id: newEnderId.value, quest: form.ID })
  newEnderId.value = 0
}
</script>

<template>
  <div class="tab-content">
    <!-- Identification -->
    <div class="field-group">
      <div class="field-group-header">
        <h4>{{ t('quest_template.groups.identification') }}</h4>
        <p>{{ t('quest_template.groups.identificationDesc') }}</p>
      </div>
      <div class="field-grid">
        <EditorField :label="t('quest_template.fields.ID')" :modified="isModified('ID')">
          <InputNumber v-model="form.ID" :useGrouping="false" disabled fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.QuestType')" :modified="isModified('QuestType')">
          <Select v-model="form.QuestType" :options="questTypeOptions" optionValue="value" optionLabel="label" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.StartItem')" :modified="isModified('StartItem')">
          <InputNumber v-model="form.StartItem" :useGrouping="false" fluid />
        </EditorField>
      </div>
    </div>

    <!-- Parameters -->
    <div class="field-group">
      <div class="field-group-header">
        <h4>{{ t('quest_template.groups.parameters') }}</h4>
        <p>{{ t('quest_template.groups.parametersDesc') }}</p>
      </div>
      <div class="field-grid">
        <EditorField :label="t('quest_template.fields.QuestLevel')" :modified="isModified('QuestLevel')">
          <InputNumber v-model="form.QuestLevel" :useGrouping="false" :min="-1" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.MinLevel')" :modified="isModified('MinLevel')">
          <InputNumber v-model="form.MinLevel" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.SuggestedGroupNum')" :modified="isModified('SuggestedGroupNum')">
          <InputNumber v-model="form.SuggestedGroupNum" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.QuestSortID')" :modified="isModified('QuestSortID')">
          <InputNumber v-model="form.QuestSortID" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.QuestInfoID')" :modified="isModified('QuestInfoID')">
          <InputNumber v-model="form.QuestInfoID" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.TimeAllowed')" :modified="isModified('TimeAllowed')">
          <InputNumber v-model="form.TimeAllowed" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.AllowableRaces')" :modified="isModified('AllowableRaces')">
          <InputNumber v-model="form.AllowableRaces" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.RewardNextQuest')" :modified="isModified('RewardNextQuest')">
          <InputNumber v-model="form.RewardNextQuest" :useGrouping="false" fluid />
        </EditorField>
      </div>
    </div>

    <!-- Flags -->
    <div class="field-group">
      <div class="field-group-header">
        <h4>{{ t('quest_template.groups.flags') }}</h4>
        <p>{{ t('quest_template.groups.flagsDesc') }}</p>
      </div>
      <div class="field-grid">
        <EditorField :label="t('quest_template.fields.Flags')" :modified="isModified('Flags')" :fullWidth="true">
          <BitmaskField
            v-model="form.Flags"
            :options="quest_flags_options"
            :label="t('quest_template.fields.Flags')"
          />
        </EditorField>
      </div>
    </div>

    <!-- Texts -->
    <div class="field-group">
      <div class="field-group-header">
        <h4>{{ t('quest_template.groups.texts') }}</h4>
        <p>{{ t('quest_template.groups.textsDesc') }}</p>
      </div>
      <div class="field-grid">
        <EditorField :label="t('quest_template.fields.LogTitle')" :modified="isModified('LogTitle')" :fullWidth="true">
          <InputText v-model="form.LogTitle" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.LogDescription')" :modified="isModified('LogDescription')" :fullWidth="true">
          <Textarea v-model="form.LogDescription" rows="3" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.QuestDescription')" :modified="isModified('QuestDescription')" :fullWidth="true">
          <Textarea v-model="form.QuestDescription" rows="4" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.AreaDescription')" :modified="isModified('AreaDescription')" :fullWidth="true">
          <InputText v-model="form.AreaDescription" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.QuestCompletionLog')" :modified="isModified('QuestCompletionLog')" :fullWidth="true">
          <Textarea v-model="form.QuestCompletionLog" rows="2" fluid />
        </EditorField>
      </div>
    </div>

    <!-- Offer Emotes (quest_details) -->
    <div class="field-group">
      <div class="field-group-header">
        <h4>{{ t('quest_template.groups.details_emotes') }}</h4>
        <p>{{ t('quest_template.groups.details_emotesDesc') }}</p>
      </div>
      <div class="field-grid">
        <template v-for="i in 4" :key="i">
          <EditorField :label="`${t('quest_template.fields.emote')} ${i}`" :modified="isDetailsModified((`Emote${i}`) as any)">
            <InputNumber v-model="(detailsForm as any)[`Emote${i}`]" :useGrouping="false" fluid />
          </EditorField>
          <EditorField :label="`${t('quest_template.fields.emoteDelay')} ${i}`" :modified="isDetailsModified((`EmoteDelay${i}`) as any)">
            <InputNumber v-model="(detailsForm as any)[`EmoteDelay${i}`]" :useGrouping="false" fluid />
          </EditorField>
        </template>
      </div>
    </div>

    <!-- Quest Givers / Starters (Donneur) -->
    <div class="field-group" :class="{ 'field-group-modified': starterHasChanges }">
      <div class="field-group-header">
        <h4>{{ t('quest_givers.givers') }}</h4>
        <p>{{ t('quest_givers.giversDesc') }}</p>
      </div>

      <div v-if="store.creatureStarters.getNewEntries().length === 0 && store.gameobjectStarters.getNewEntries().length === 0" class="giver-empty">
        {{ t('quest_givers.empty') }}
      </div>

      <div v-for="(entry, idx) in store.creatureStarters.getNewEntries()" :key="`cs-${idx}`" class="giver-row">
        <span class="giver-kind creature">{{ t('quest_givers.creature') }}</span>
        <InputNumber v-model="entry.id" :useGrouping="false" :min="0" fluid />
        <Button icon="pi pi-trash" severity="danger" text size="small" @click="store.creatureStarters.removeNewEntry(idx)" />
      </div>
      <div v-for="(entry, idx) in store.gameobjectStarters.getNewEntries()" :key="`gs-${idx}`" class="giver-row">
        <span class="giver-kind gameobject">{{ t('quest_givers.gameobject') }}</span>
        <InputNumber v-model="entry.id" :useGrouping="false" :min="0" fluid />
        <Button icon="pi pi-trash" severity="danger" text size="small" @click="store.gameobjectStarters.removeNewEntry(idx)" />
      </div>

      <div class="giver-add-form">
        <Select v-model="newStarterKind" :options="kindOptions" optionValue="value" optionLabel="label" class="giver-kind-select" />
        <InputNumber v-model="newStarterId" :useGrouping="false" :min="0" :placeholder="t('quest_givers.entryPlaceholder')" fluid />
        <Button icon="pi pi-plus" :label="t('quest_givers.add')" severity="secondary" size="small" @click="addStarter" />
      </div>
    </div>

    <!-- Quest Enders / Receivers (Receveur) -->
    <div class="field-group" :class="{ 'field-group-modified': enderHasChanges }">
      <div class="field-group-header">
        <h4>{{ t('quest_givers.enders') }}</h4>
        <p>{{ t('quest_givers.endersDesc') }}</p>
      </div>

      <div v-if="store.creatureEnders.getNewEntries().length === 0 && store.gameobjectEnders.getNewEntries().length === 0" class="giver-empty">
        {{ t('quest_givers.empty') }}
      </div>

      <div v-for="(entry, idx) in store.creatureEnders.getNewEntries()" :key="`ce-${idx}`" class="giver-row">
        <span class="giver-kind creature">{{ t('quest_givers.creature') }}</span>
        <InputNumber v-model="entry.id" :useGrouping="false" :min="0" fluid />
        <Button icon="pi pi-trash" severity="danger" text size="small" @click="store.creatureEnders.removeNewEntry(idx)" />
      </div>
      <div v-for="(entry, idx) in store.gameobjectEnders.getNewEntries()" :key="`ge-${idx}`" class="giver-row">
        <span class="giver-kind gameobject">{{ t('quest_givers.gameobject') }}</span>
        <InputNumber v-model="entry.id" :useGrouping="false" :min="0" fluid />
        <Button icon="pi pi-trash" severity="danger" text size="small" @click="store.gameobjectEnders.removeNewEntry(idx)" />
      </div>

      <div class="giver-add-form">
        <Select v-model="newEnderKind" :options="kindOptions" optionValue="value" optionLabel="label" class="giver-kind-select" />
        <InputNumber v-model="newEnderId" :useGrouping="false" :min="0" :placeholder="t('quest_givers.entryPlaceholder')" fluid />
        <Button icon="pi pi-plus" :label="t('quest_givers.add')" severity="secondary" size="small" @click="addEnder" />
      </div>
    </div>
  </div>
</template>

<style scoped>
@import './quest-editor.css';

.giver-empty {
  color: var(--text-muted);
  font-size: 0.875rem;
  padding: 0.75rem 0;
  text-align: center;
}

.giver-row {
  display: grid;
  grid-template-columns: 7rem 1fr 2.5rem;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 0.5rem;
}

.giver-kind {
  font-size: 0.78rem;
  font-weight: 600;
  text-align: center;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.giver-kind.creature {
  color: #86efac;
  background: rgba(134, 239, 172, 0.1);
}

.giver-kind.gameobject {
  color: #fcd34d;
  background: rgba(252, 211, 77, 0.1);
}

.giver-add-form {
  display: grid;
  grid-template-columns: 7rem 1fr auto;
  gap: 0.75rem;
  align-items: center;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-default);
}

.giver-kind-select {
  width: 100%;
}

.field-group-modified {
  border-color: var(--accent-focus);
}
</style>

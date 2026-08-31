<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import EditorField from '@core/components/EditorField.vue'
import { useQuestModuleStore } from '@/modules/quests/store'

const { t } = useI18n()
const store = useQuestModuleStore()
const form = store.formData
const orig = computed(() => store.originalValue)

const reqForm = store.requestItems.newEntry
const origReq = computed(() => store.requestItems.getOriginalEntry())

function isModified(field: keyof typeof form): boolean {
  if (!orig.value) return false
  return (orig.value as any)[field] !== (form as any)[field]
}

function isReqModified(field: keyof typeof reqForm): boolean {
  if (!origReq.value) return false
  return (origReq.value as any)[field] !== (reqForm as any)[field]
}
</script>

<template>
  <div class="tab-content">
    <!-- Required NPCs / GOs -->
    <div class="field-group">
      <div class="field-group-header">
        <h4>{{ t('quest_template.groups.required_npcs_gos') }}</h4>
        <p>{{ t('quest_template.groups.required_npcs_gosDesc') }}</p>
      </div>
      <div class="objective-table">
        <div class="obj-row obj-header">
          <span></span>
          <span>{{ t('quest_template.fields.RequiredNpcOrGo1') }}</span>
          <span>{{ t('quest_template.fields.RequiredNpcOrGoCount1') }}</span>
        </div>
        <div v-for="i in 4" :key="i" class="obj-row">
          <span class="obj-index">#{{ i }}</span>
          <EditorField :label="''" :modified="isModified((`RequiredNpcOrGo${i}`) as any)">
            <InputNumber v-model="(form as any)[`RequiredNpcOrGo${i}`]" :useGrouping="false" fluid />
          </EditorField>
          <EditorField :label="''" :modified="isModified((`RequiredNpcOrGoCount${i}`) as any)">
            <InputNumber v-model="(form as any)[`RequiredNpcOrGoCount${i}`]" :useGrouping="false" :min="0" fluid />
          </EditorField>
        </div>
      </div>
    </div>

    <!-- Required Items -->
    <div class="field-group">
      <div class="field-group-header">
        <h4>{{ t('quest_template.groups.required_items') }}</h4>
        <p>{{ t('quest_template.groups.required_itemsDesc') }}</p>
      </div>
      <div class="objective-table">
        <div class="obj-row obj-header">
          <span></span>
          <span>{{ t('quest_template.fields.RequiredItemId1') }}</span>
          <span>{{ t('quest_template.fields.RequiredItemCount1') }}</span>
        </div>
        <div v-for="i in 6" :key="i" class="obj-row">
          <span class="obj-index">#{{ i }}</span>
          <EditorField :label="''" :modified="isModified((`RequiredItemId${i}`) as any)">
            <InputNumber v-model="(form as any)[`RequiredItemId${i}`]" :useGrouping="false" fluid />
          </EditorField>
          <EditorField :label="''" :modified="isModified((`RequiredItemCount${i}`) as any)">
            <InputNumber v-model="(form as any)[`RequiredItemCount${i}`]" :useGrouping="false" :min="0" fluid />
          </EditorField>
        </div>
      </div>
    </div>

    <!-- Kills & Faction -->
    <div class="field-group">
      <div class="field-group-header">
        <h4>{{ t('quest_template.groups.required_kills_faction') }}</h4>
        <p>{{ t('quest_template.groups.required_kills_factionDesc') }}</p>
      </div>
      <div class="field-grid">
        <EditorField :label="t('quest_template.fields.RequiredPlayerKills')" :modified="isModified('RequiredPlayerKills')">
          <InputNumber v-model="form.RequiredPlayerKills" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.RequiredFactionId1')" :modified="isModified('RequiredFactionId1')">
          <InputNumber v-model="form.RequiredFactionId1" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.RequiredFactionValue1')" :modified="isModified('RequiredFactionValue1')">
          <InputNumber v-model="form.RequiredFactionValue1" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.RequiredFactionId2')" :modified="isModified('RequiredFactionId2')">
          <InputNumber v-model="form.RequiredFactionId2" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.RequiredFactionValue2')" :modified="isModified('RequiredFactionValue2')">
          <InputNumber v-model="form.RequiredFactionValue2" :useGrouping="false" fluid />
        </EditorField>
      </div>
    </div>

    <!-- Objective Texts -->
    <div class="field-group">
      <div class="field-group-header">
        <h4>{{ t('quest_template.groups.objective_texts') }}</h4>
        <p>{{ t('quest_template.groups.objective_textsDesc') }}</p>
      </div>
      <div class="field-grid">
        <EditorField
          v-for="i in 4" :key="i"
          :label="t(`quest_template.fields.ObjectiveText${i}`)"
          :modified="isModified((`ObjectiveText${i}`) as any)"
          :fullWidth="true"
        >
          <InputText v-model="(form as any)[`ObjectiveText${i}`]" fluid />
        </EditorField>
      </div>
    </div>

    <!-- Completion Text & Emotes (quest_request_items) -->
    <div class="field-group">
      <div class="field-group-header">
        <h4>{{ t('quest_template.groups.request_items') }}</h4>
        <p>{{ t('quest_template.groups.request_itemsDesc') }}</p>
      </div>
      <div class="field-grid">
        <EditorField :label="t('quest_template.fields.CompletionText')" :modified="isReqModified('CompletionText')" :fullWidth="true">
          <Textarea v-model="reqForm.CompletionText" rows="3" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.EmoteOnComplete')" :modified="isReqModified('EmoteOnComplete')">
          <InputNumber v-model="reqForm.EmoteOnComplete" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.EmoteOnCompleteDelay')" :modified="isReqModified('EmoteOnCompleteDelay')">
          <InputNumber v-model="reqForm.EmoteOnCompleteDelay" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.EmoteOnIncomplete')" :modified="isReqModified('EmoteOnIncomplete')">
          <InputNumber v-model="reqForm.EmoteOnIncomplete" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.EmoteOnIncompleteDelay')" :modified="isReqModified('EmoteOnIncompleteDelay')">
          <InputNumber v-model="reqForm.EmoteOnIncompleteDelay" :useGrouping="false" fluid />
        </EditorField>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import './quest-editor.css';

.objective-table {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.obj-row {
  display: grid;
  grid-template-columns: 2rem 1fr 8rem;
  gap: 0.75rem;
  align-items: end;
}

.obj-header {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-weight: 500;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--border-default);
}

.obj-index {
  font-size: 0.85rem;
  color: var(--text-muted);
  text-align: right;
  padding-bottom: 0.6rem;
}
</style>

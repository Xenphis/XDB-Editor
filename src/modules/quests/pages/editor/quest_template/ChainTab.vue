<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import InputNumber from 'primevue/inputnumber'
import EditorField from '@core/components/EditorField.vue'
import BitmaskField from '@core/components/BitmaskField.vue'
import { useQuestModuleStore } from '@/modules/quests/store'
import { quest_special_flags_options } from '@/modules/quests/types/quest_template_addon'

const { t } = useI18n()
const store = useQuestModuleStore()
const form = store.formData
const addonForm = store.addon.newEntry
const origAddon = computed(() => store.addon.getOriginalEntry())
const orig = computed(() => store.originalValue)

function isModified(field: keyof typeof form): boolean {
  if (!orig.value) return false
  return (orig.value as any)[field] !== (form as any)[field]
}

function isAddonModified(field: keyof typeof addonForm): boolean {
  if (!origAddon.value) return false
  return (origAddon.value as any)[field] !== (addonForm as any)[field]
}
</script>

<template>
  <div class="tab-content">
    <!-- Quest Chain -->
    <div class="field-group">
      <div class="field-group-header">
        <h4>{{ t('quest_template.groups.chain') }}</h4>
        <p>{{ t('quest_template.groups.chainDesc') }}</p>
      </div>
      <div class="field-grid">
        <EditorField :label="t('quest_template.fields.RewardNextQuest')" :modified="isModified('RewardNextQuest')">
          <InputNumber v-model="form.RewardNextQuest" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.PrevQuestID')" :modified="isAddonModified('PrevQuestID')">
          <InputNumber v-model="addonForm.PrevQuestID" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.NextQuestID')" :modified="isAddonModified('NextQuestID')">
          <InputNumber v-model="addonForm.NextQuestID" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.ExclusiveGroup')" :modified="isAddonModified('ExclusiveGroup')">
          <InputNumber v-model="addonForm.ExclusiveGroup" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.BreadcrumbForQuestId')" :modified="isAddonModified('BreadcrumbForQuestId')">
          <InputNumber v-model="addonForm.BreadcrumbForQuestId" :useGrouping="false" fluid />
        </EditorField>
      </div>
    </div>

    <!-- Player Restrictions (Addon) -->
    <div class="field-group">
      <div class="field-group-header">
        <h4>{{ t('quest_template.groups.addon_player') }}</h4>
        <p>{{ t('quest_template.groups.addon_playerDesc') }}</p>
      </div>
      <div class="field-grid">
        <EditorField :label="t('quest_template.fields.MaxLevel')" :modified="isAddonModified('MaxLevel')">
          <InputNumber v-model="addonForm.MaxLevel" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.AllowableClasses')" :modified="isAddonModified('AllowableClasses')">
          <InputNumber v-model="addonForm.AllowableClasses" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.SourceSpellID')" :modified="isAddonModified('SourceSpellID')">
          <InputNumber v-model="addonForm.SourceSpellID" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.ProvidedItemCount')" :modified="isAddonModified('ProvidedItemCount')">
          <InputNumber v-model="addonForm.ProvidedItemCount" :useGrouping="false" fluid />
        </EditorField>
      </div>
    </div>

    <!-- Required Skill (Addon) -->
    <div class="field-group">
      <div class="field-group-header">
        <h4>{{ t('quest_template.groups.addon_skill') }}</h4>
        <p>{{ t('quest_template.groups.addon_skillDesc') }}</p>
      </div>
      <div class="field-grid">
        <EditorField :label="t('quest_template.fields.RequiredSkillID')" :modified="isAddonModified('RequiredSkillID')">
          <InputNumber v-model="addonForm.RequiredSkillID" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.RequiredSkillPoints')" :modified="isAddonModified('RequiredSkillPoints')">
          <InputNumber v-model="addonForm.RequiredSkillPoints" :useGrouping="false" fluid />
        </EditorField>
      </div>
    </div>

    <!-- Required Reputation (Addon) -->
    <div class="field-group">
      <div class="field-group-header">
        <h4>{{ t('quest_template.groups.addon_reputation') }}</h4>
        <p>{{ t('quest_template.groups.addon_reputationDesc') }}</p>
      </div>
      <div class="field-grid">
        <EditorField :label="t('quest_template.fields.RequiredMinRepFaction')" :modified="isAddonModified('RequiredMinRepFaction')">
          <InputNumber v-model="addonForm.RequiredMinRepFaction" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.RequiredMinRepValue')" :modified="isAddonModified('RequiredMinRepValue')">
          <InputNumber v-model="addonForm.RequiredMinRepValue" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.RequiredMaxRepFaction')" :modified="isAddonModified('RequiredMaxRepFaction')">
          <InputNumber v-model="addonForm.RequiredMaxRepFaction" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.RequiredMaxRepValue')" :modified="isAddonModified('RequiredMaxRepValue')">
          <InputNumber v-model="addonForm.RequiredMaxRepValue" :useGrouping="false" fluid />
        </EditorField>
      </div>
    </div>

    <!-- Mail Reward (Addon) -->
    <div class="field-group">
      <div class="field-group-header">
        <h4>{{ t('quest_template.groups.addon_mail') }}</h4>
        <p>{{ t('quest_template.groups.addon_mailDesc') }}</p>
      </div>
      <div class="field-grid">
        <EditorField :label="t('quest_template.fields.RewardMailTemplateID')" :modified="isAddonModified('RewardMailTemplateID')">
          <InputNumber v-model="addonForm.RewardMailTemplateID" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.RewardMailDelay')" :modified="isAddonModified('RewardMailDelay')">
          <InputNumber v-model="addonForm.RewardMailDelay" :useGrouping="false" fluid />
        </EditorField>
      </div>
    </div>

    <!-- Special Flags (Addon) -->
    <div class="field-group">
      <div class="field-group-header">
        <h4>{{ t('quest_template.groups.addon_special') }}</h4>
        <p>{{ t('quest_template.groups.addon_specialDesc') }}</p>
      </div>
      <div class="field-grid">
        <EditorField :label="t('quest_template.fields.SpecialFlags')" :modified="isAddonModified('SpecialFlags')" :fullWidth="true">
          <BitmaskField
            v-model="addonForm.SpecialFlags"
            :options="quest_special_flags_options"
            :label="t('quest_template.fields.SpecialFlags')"
          />
        </EditorField>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import './quest-editor.css';
</style>

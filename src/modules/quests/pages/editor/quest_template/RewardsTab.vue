<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import EditorField from '@core/components/EditorField.vue'
import { useQuestModuleStore } from '@/modules/quests/store'

const { t } = useI18n()
const store = useQuestModuleStore()
const form = store.formData
const orig = computed(() => store.originalValue)

const offerForm = store.offerReward.newEntry
const origOffer = computed(() => store.offerReward.getOriginalEntry())

function isModified(field: keyof typeof form): boolean {
  if (!orig.value) return false
  return (orig.value as any)[field] !== (form as any)[field]
}

function isOfferModified(field: keyof typeof offerForm): boolean {
  if (!origOffer.value) return false
  return (origOffer.value as any)[field] !== (offerForm as any)[field]
}
</script>

<template>
  <div class="tab-content">
    <!-- XP & Honor -->
    <div class="field-group">
      <div class="field-group-header">
        <h4>{{ t('quest_template.groups.xp_honor') }}</h4>
        <p>{{ t('quest_template.groups.xp_honorDesc') }}</p>
      </div>
      <div class="field-grid">
        <EditorField :label="t('quest_template.fields.RewardXPDifficulty')" :modified="isModified('RewardXPDifficulty')">
          <InputNumber v-model="form.RewardXPDifficulty" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.RewardHonor')" :modified="isModified('RewardHonor')">
          <InputNumber v-model="form.RewardHonor" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.RewardKillHonor')" :modified="isModified('RewardKillHonor')">
          <InputNumber v-model="form.RewardKillHonor" :useGrouping="false" :minFractionDigits="2" fluid />
        </EditorField>
      </div>
    </div>

    <!-- Money & Spells -->
    <div class="field-group">
      <div class="field-group-header">
        <h4>{{ t('quest_template.groups.money_spells') }}</h4>
        <p>{{ t('quest_template.groups.money_spellsDesc') }}</p>
      </div>
      <div class="field-grid">
        <EditorField :label="t('quest_template.fields.RewardMoney')" :modified="isModified('RewardMoney')">
          <InputNumber v-model="form.RewardMoney" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.RewardBonusMoney')" :modified="isModified('RewardBonusMoney')">
          <InputNumber v-model="form.RewardBonusMoney" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.RewardDisplaySpell')" :modified="isModified('RewardDisplaySpell')">
          <InputNumber v-model="form.RewardDisplaySpell" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.RewardSpell')" :modified="isModified('RewardSpell')">
          <InputNumber v-model="form.RewardSpell" :useGrouping="false" fluid />
        </EditorField>
      </div>
    </div>

    <!-- Title & Talents -->
    <div class="field-group">
      <div class="field-group-header">
        <h4>{{ t('quest_template.groups.title_talents') }}</h4>
        <p>{{ t('quest_template.groups.title_talentsDesc') }}</p>
      </div>
      <div class="field-grid">
        <EditorField :label="t('quest_template.fields.RewardTitle')" :modified="isModified('RewardTitle')">
          <InputNumber v-model="form.RewardTitle" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.RewardTalents')" :modified="isModified('RewardTalents')">
          <InputNumber v-model="form.RewardTalents" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.RewardArenaPoints')" :modified="isModified('RewardArenaPoints')">
          <InputNumber v-model="form.RewardArenaPoints" :useGrouping="false" fluid />
        </EditorField>
      </div>
    </div>

    <!-- Forced Items -->
    <div class="field-group">
      <div class="field-group-header">
        <h4>{{ t('quest_template.groups.reward_items') }}</h4>
        <p>{{ t('quest_template.groups.reward_itemsDesc') }}</p>
      </div>
      <div class="objective-table">
        <div class="obj-row obj-header">
          <span></span>
          <span>Item ID</span>
          <span>Quantité</span>
        </div>
        <div v-for="i in 4" :key="i" class="obj-row">
          <span class="obj-index">#{{ i }}</span>
          <EditorField :label="''" :modified="isModified((`RewardItem${i}`) as any)">
            <InputNumber v-model="(form as any)[`RewardItem${i}`]" :useGrouping="false" fluid />
          </EditorField>
          <EditorField :label="''" :modified="isModified((`RewardAmount${i}`) as any)">
            <InputNumber v-model="(form as any)[`RewardAmount${i}`]" :useGrouping="false" :min="0" fluid />
          </EditorField>
        </div>
      </div>
    </div>

    <!-- Choice Items -->
    <div class="field-group">
      <div class="field-group-header">
        <h4>{{ t('quest_template.groups.choice_items') }}</h4>
        <p>{{ t('quest_template.groups.choice_itemsDesc') }}</p>
      </div>
      <div class="objective-table">
        <div class="obj-row obj-header">
          <span></span>
          <span>Item ID</span>
          <span>Quantité</span>
        </div>
        <div v-for="i in 6" :key="i" class="obj-row">
          <span class="obj-index">#{{ i }}</span>
          <EditorField :label="''" :modified="isModified((`RewardChoiceItemID${i}`) as any)">
            <InputNumber v-model="(form as any)[`RewardChoiceItemID${i}`]" :useGrouping="false" fluid />
          </EditorField>
          <EditorField :label="''" :modified="isModified((`RewardChoiceItemQuantity${i}`) as any)">
            <InputNumber v-model="(form as any)[`RewardChoiceItemQuantity${i}`]" :useGrouping="false" :min="0" fluid />
          </EditorField>
        </div>
      </div>
    </div>

    <!-- Faction Reputation Rewards -->
    <div class="field-group">
      <div class="field-group-header">
        <h4>{{ t('quest_template.groups.reward_factions') }}</h4>
        <p>{{ t('quest_template.groups.reward_factionsDesc') }}</p>
      </div>
      <div class="objective-table">
        <div class="obj-row obj-header-3">
          <span></span>
          <span>Faction ID</span>
          <span>Valeur</span>
          <span>Override (×100)</span>
        </div>
        <div v-for="i in 5" :key="i" class="obj-row-3">
          <span class="obj-index">#{{ i }}</span>
          <EditorField :label="''" :modified="isModified((`RewardFactionID${i}`) as any)">
            <InputNumber v-model="(form as any)[`RewardFactionID${i}`]" :useGrouping="false" fluid />
          </EditorField>
          <EditorField :label="''" :modified="isModified((`RewardFactionValue${i}`) as any)">
            <InputNumber v-model="(form as any)[`RewardFactionValue${i}`]" :useGrouping="false" fluid />
          </EditorField>
          <EditorField :label="''" :modified="isModified((`RewardFactionOverride${i}`) as any)">
            <InputNumber v-model="(form as any)[`RewardFactionOverride${i}`]" :useGrouping="false" fluid />
          </EditorField>
        </div>
      </div>
      <div class="field-grid" style="margin-top: 0.75rem;">
        <EditorField :label="t('quest_template.fields.RewardFactionFlags')" :modified="isModified('RewardFactionFlags')">
          <InputNumber v-model="form.RewardFactionFlags" :useGrouping="false" fluid />
        </EditorField>
      </div>
    </div>

    <!-- POI -->
    <div class="field-group">
      <div class="field-group-header">
        <h4>{{ t('quest_template.groups.poi') }}</h4>
        <p>{{ t('quest_template.groups.poiDesc') }}</p>
      </div>
      <div class="field-grid">
        <EditorField :label="t('quest_template.fields.POIContinent')" :modified="isModified('POIContinent')">
          <InputNumber v-model="form.POIContinent" :useGrouping="false" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.POIx')" :modified="isModified('POIx')">
          <InputNumber v-model="form.POIx" :useGrouping="false" :minFractionDigits="2" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.POIy')" :modified="isModified('POIy')">
          <InputNumber v-model="form.POIy" :useGrouping="false" :minFractionDigits="2" fluid />
        </EditorField>
        <EditorField :label="t('quest_template.fields.POIPriority')" :modified="isModified('POIPriority')">
          <InputNumber v-model="form.POIPriority" :useGrouping="false" fluid />
        </EditorField>
      </div>
    </div>

    <!-- Item Drops -->
    <div class="field-group">
      <div class="field-group-header">
        <h4>{{ t('quest_template.groups.item_drops') }}</h4>
        <p>{{ t('quest_template.groups.item_dropsDesc') }}</p>
      </div>
      <div class="objective-table">
        <div class="obj-row obj-header">
          <span></span>
          <span>Item ID</span>
          <span>Quantité max</span>
        </div>
        <div v-for="i in 4" :key="i" class="obj-row">
          <span class="obj-index">#{{ i }}</span>
          <EditorField :label="''" :modified="isModified((`ItemDrop${i}`) as any)">
            <InputNumber v-model="(form as any)[`ItemDrop${i}`]" :useGrouping="false" fluid />
          </EditorField>
          <EditorField :label="''" :modified="isModified((`ItemDropQuantity${i}`) as any)">
            <InputNumber v-model="(form as any)[`ItemDropQuantity${i}`]" :useGrouping="false" :min="0" fluid />
          </EditorField>
        </div>
      </div>
    </div>

    <!-- Turn-in Text & Emotes (quest_offer_reward) -->
    <div class="field-group">
      <div class="field-group-header">
        <h4>{{ t('quest_template.groups.offer_reward') }}</h4>
        <p>{{ t('quest_template.groups.offer_rewardDesc') }}</p>
      </div>
      <div class="field-grid">
        <EditorField :label="t('quest_template.fields.RewardText')" :modified="isOfferModified('RewardText')" :fullWidth="true">
          <Textarea v-model="offerForm.RewardText" rows="3" fluid />
        </EditorField>
        <template v-for="i in 4" :key="i">
          <EditorField :label="`${t('quest_template.fields.emote')} ${i}`" :modified="isOfferModified((`Emote${i}`) as any)">
            <InputNumber v-model="(offerForm as any)[`Emote${i}`]" :useGrouping="false" fluid />
          </EditorField>
          <EditorField :label="`${t('quest_template.fields.emoteDelay')} ${i}`" :modified="isOfferModified((`EmoteDelay${i}`) as any)">
            <InputNumber v-model="(offerForm as any)[`EmoteDelay${i}`]" :useGrouping="false" fluid />
          </EditorField>
        </template>
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

.obj-row-3 {
  display: grid;
  grid-template-columns: 2rem 1fr 1fr 1fr;
  gap: 0.75rem;
  align-items: end;
}

.obj-header {
  display: grid;
  grid-template-columns: 2rem 1fr 8rem;
  gap: 0.75rem;
  font-size: 0.8rem;
  color: var(--text-muted);
  font-weight: 500;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--border-default);
}

.obj-header-3 {
  display: grid;
  grid-template-columns: 2rem 1fr 1fr 1fr;
  gap: 0.75rem;
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

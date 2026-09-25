<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import QuestPreviewItem from './QuestPreviewItem.vue'
import QuestPreviewMoney from './QuestPreviewMoney.vue'
import type { PreviewRewards } from './types'

/**
 * The "Rewards" block, laid out the way 3.3.5's `QuestInfo_ShowRewards` does:
 * the choice items, the spell, then "You will (also) receive:" with the money
 * beside it and the fixed items below, then honor / talents / title.
 */
const props = defineProps<{
  rewards: PreviewRewards
  /** Completion panel wording ("Choose your reward:") instead of the offer's. */
  choosing?: boolean
}>()

const { t } = useI18n()

const money = computed(() => Math.max(0, props.rewards.money))
const receives = computed(() => props.rewards.items.length > 0 || money.value > 0)
</script>

<template>
  <div class="qp-rewards">
    <h3 class="qp-header">{{ t('quest_preview.headers.rewards') }}</h3>

    <template v-if="rewards.choices.length">
      <p class="qp-line">{{ choosing ? t('quest_preview.rewards.choose') : t('quest_preview.rewards.choices') }}</p>
      <div class="qp-grid">
        <QuestPreviewItem v-for="slot in rewards.choices" :key="slot.key" :name="slot.name" :icon="slot.icon" :count="slot.count" :quality="slot.quality" :missing="slot.missing" />
      </div>
    </template>

    <template v-if="rewards.spell">
      <p class="qp-line">{{ rewards.spell.aura ? t('quest_preview.rewards.aura') : t('quest_preview.rewards.spell') }}</p>
      <div class="qp-grid">
        <QuestPreviewItem :name="rewards.spell.name" :icon="rewards.spell.icon" :missing="rewards.spell.missing" />
      </div>
    </template>

    <template v-if="receives">
      <p class="qp-line qp-receive">
        <span>{{ rewards.choices.length ? t('quest_preview.rewards.alsoReceive') : t('quest_preview.rewards.receive') }}</span>
        <QuestPreviewMoney v-if="money > 0" :copper="money" />
      </p>
      <div v-if="rewards.items.length" class="qp-grid">
        <QuestPreviewItem v-for="slot in rewards.items" :key="slot.key" :name="slot.name" :icon="slot.icon" :count="slot.count" :quality="slot.quality" :missing="slot.missing" />
      </div>
    </template>

    <p v-if="rewards.honor > 0" class="qp-line">{{ t('quest_preview.rewards.honor', { n: rewards.honor }) }}</p>
    <p v-if="rewards.arena > 0" class="qp-line">{{ t('quest_preview.rewards.arena', { n: rewards.arena }) }}</p>
    <p v-if="rewards.talents > 0" class="qp-line">{{ t('quest_preview.rewards.talents', { n: rewards.talents }) }}</p>
    <template v-if="rewards.title > 0">
      <p class="qp-line">{{ t('quest_preview.rewards.title') }}</p>
      <p class="qp-line qp-title-reward">{{ t('quest_preview.rewards.titleId', { id: rewards.title }) }}</p>
    </template>
  </div>
</template>

<style scoped>
/* .qp-line / .qp-receive / .qp-grid / .qp-header come from QuestPreview. */
.qp-title-reward {
  padding-left: 0.6rem;
  font-weight: 700;
}
</style>

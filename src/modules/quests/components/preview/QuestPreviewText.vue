<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { parseQuestText } from '@/modules/quests/utils/questText'

/**
 * One block of quest text as the client prints it: `$B` line breaks and the
 * `$N` / `$R` / `$C` / `$G…;` codes substituted for a sample player (hover a
 * substituted word to see its code). An empty text shows the name of the
 * column that would fill it, so a designer sees what is missing.
 */
const props = defineProps<{
  text?: string | null
  /** Column name shown when the text is empty. */
  field: string
}>()

const { t } = useI18n()

const segments = computed(() => parseQuestText(props.text, {
  name: t('quest_preview.player.name'),
  race: t('quest_preview.player.race'),
  class: t('quest_preview.player.class'),
}))
</script>

<template>
  <p v-if="segments.length" class="qp-text">
    <template v-for="(seg, i) in segments" :key="i">
      <br v-if="seg.kind === 'break'" />
      <span v-else-if="seg.kind === 'var'" class="qp-var" :title="seg.code">{{ seg.value }}</span>
      <template v-else>{{ seg.value }}</template>
    </template>
  </p>
  <p v-else class="qp-text qp-empty">{{ t('quest_preview.empty', { field }) }}</p>
</template>

<style scoped>
.qp-text {
  margin: 0 0 0.7rem;
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.qp-var {
  border-bottom: 1px dotted rgba(60, 35, 10, 0.55);
  cursor: help;
}

.qp-empty {
  font-style: italic;
  opacity: 0.5;
}
</style>

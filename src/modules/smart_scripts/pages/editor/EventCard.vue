<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import EditorField from '@core/components/EditorField.vue'
import BitmaskField from '@core/components/BitmaskField.vue'
import type { SmartScript } from '../../types/smart_scripts'
import { describeAction, describeEvent, describeTarget } from '../../types/describe'
import {
  SAI_ACTION_CALL_TIMED_ACTIONLIST,
  SAI_PHASE_COUNT,
  sai_event_flags,
} from '../../types/sai'
import SegmentForm from './SegmentForm.vue'

const props = defineProps<{
  /** Chain head + its linked rows, in execution order. */
  chain: SmartScript[]
  expanded: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle'): void
  (e: 'remove'): void
  (e: 'addLinked'): void
  (e: 'removeLinked', row: SmartScript): void
}>()

const { t } = useI18n()

const head = computed(() => props.chain[0]!)

const phaseBadge = computed(() => {
  const mask = head.value.event_phase_mask
  if (mask === 0) return ''
  const phases: number[] = []
  for (let phase = 1; phase <= SAI_PHASE_COUNT; phase++) {
    if (mask & (1 << (phase - 1))) phases.push(phase)
  }
  return `P${phases.join(' P')}`
})

const callsActionlist = computed(() =>
  props.chain.some(row => row.action_type === SAI_ACTION_CALL_TIMED_ACTIONLIST),
)

function isPhaseActive(phase: number): boolean {
  return (head.value.event_phase_mask & (1 << (phase - 1))) !== 0
}

function togglePhase(phase: number): void {
  head.value.event_phase_mask ^= 1 << (phase - 1)
}
</script>

<template>
  <div class="sai-card" :class="{ expanded }">
    <button class="sai-card-summary" @click="emit('toggle')">
      <i :class="expanded ? 'pi pi-chevron-down' : 'pi pi-chevron-right'" class="sai-chevron"></i>
      <span class="sai-card-id">#{{ head.id }}</span>
      <span class="sai-phrase">
        <span class="sai-seg sai-seg-event">{{ describeEvent(head) }}</span>
        <span>→</span>
        <span class="sai-seg sai-seg-action">{{ describeAction(head) }}</span>
        <span>{{ t('smartScripts.on') }}</span>
        <span class="sai-seg sai-seg-target">{{ describeTarget(head) }}</span>
      </span>
      <span v-if="chain.length > 1" class="sai-badge">
        <i class="pi pi-link"></i> {{ chain.length - 1 }}
      </span>
      <span v-if="callsActionlist" class="sai-badge">
        <i class="pi pi-list"></i> {{ t('smartScripts.actionlist') }}
      </span>
      <span v-if="phaseBadge" class="sai-badge">{{ phaseBadge }}</span>
      <span v-if="head.event_chance < 100" class="sai-badge">{{ head.event_chance }}%</span>
      <span v-if="head.event_flags & 1" class="sai-badge">{{ t('smartScripts.once') }}</span>
    </button>

    <div v-if="expanded" class="sai-card-body">
      <!-- Event -->
      <div class="sai-section-event">
        <p class="sai-section-title sai-section-event"><span class="dot"></span>{{ t('smartScripts.sections.event') }}</p>
        <SegmentForm :row="head" part="event" />
        <div class="sai-grid sai-common-grid">
          <EditorField :label="t('smartScripts.common.phases')" :tooltip="t('smartScripts.common.phasesTooltip')">
            <div class="sai-phase-chips">
              <button
                v-for="phase in SAI_PHASE_COUNT"
                :key="phase"
                class="sai-phase-chip"
                :class="{ active: isPhaseActive(phase) }"
                @click="togglePhase(phase)"
              >{{ phase }}</button>
            </div>
          </EditorField>
          <EditorField :label="t('smartScripts.common.chance')">
            <InputNumber v-model="head.event_chance" :min="0" :max="100" suffix=" %" :useGrouping="false" fluid />
          </EditorField>
          <EditorField :label="t('smartScripts.common.flags')">
            <BitmaskField v-model="head.event_flags" :options="sai_event_flags" :label="t('smartScripts.common.flags')" />
          </EditorField>
        </div>
      </div>

      <!-- Action + target per chain row -->
      <div v-for="(row, index) in chain" :key="row.id" class="sai-chain-block">
        <div class="sai-chain-header">
          <template v-if="index > 0">
            <i class="pi pi-link"></i>
            <span>{{ t('smartScripts.linkedAction') }} · #{{ row.id }}</span>
          </template>
          <span class="spacer"></span>
          <Button
            v-if="index > 0"
            icon="pi pi-trash"
            severity="danger"
            text
            size="small"
            v-tooltip.left="t('smartScripts.removeLinked')"
            @click="emit('removeLinked', row)"
          />
        </div>
        <div class="sai-chain-forms">
          <div>
            <p class="sai-section-title sai-section-action"><span class="dot"></span>{{ t('smartScripts.sections.action') }}</p>
            <SegmentForm :row="row" part="action" />
          </div>
          <div>
            <p class="sai-section-title sai-section-target"><span class="dot"></span>{{ t('smartScripts.sections.target') }}</p>
            <SegmentForm :row="row" part="target" />
          </div>
          <EditorField :label="t('smartScripts.common.comment')" :tooltip="t('smartScripts.common.commentTooltip')" fullWidth>
            <InputText v-model="row.comment" fluid :placeholder="t('smartScripts.common.commentPlaceholder')" />
          </EditorField>
        </div>
      </div>

      <div class="sai-card-actions">
        <Button
          icon="pi pi-link"
          :label="t('smartScripts.addLinked')"
          severity="secondary"
          size="small"
          @click="emit('addLinked')"
        />
        <span class="spacer"></span>
        <Button
          icon="pi pi-trash"
          :label="t('smartScripts.removeEvent')"
          severity="danger"
          text
          size="small"
          @click="emit('remove')"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '../smart-scripts-editor.css';

.sai-chevron {
  font-size: 0.7rem;
  color: var(--text-placeholder);
  flex-shrink: 0;
}

.sai-common-grid {
  margin-top: 0.75rem;
}

.sai-chain-forms {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.sai-card-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sai-card-actions .spacer {
  flex: 1;
}
</style>

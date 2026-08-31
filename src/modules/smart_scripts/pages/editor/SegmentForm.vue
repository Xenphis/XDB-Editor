<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import EditorField from '@core/components/EditorField.vue'
import type { SmartScript } from '../../types/smart_scripts'
import {
  getSaiActionDef,
  getSaiEventDef,
  getSaiTargetDef,
  isEventValidForSourceType,
  sai_action_type_options,
  sai_event_type_options,
  sai_target_type_options,
  type SaiParamDef,
  type SaiParamKey,
} from '../../types/sai'
import ParamField from './ParamField.vue'

const props = defineProps<{
  row: SmartScript
  part: 'event' | 'action' | 'target'
}>()

const { t } = useI18n()

const PART_KEYS: Record<'event' | 'action' | 'target', SaiParamKey[]> = {
  event: ['event_param1', 'event_param2', 'event_param3', 'event_param4'],
  action: ['action_param1', 'action_param2', 'action_param3', 'action_param4', 'action_param5', 'action_param6'],
  target: ['target_param1', 'target_param2', 'target_param3'],
}

const typeField = computed(() => `${props.part}_type` as 'event_type' | 'action_type' | 'target_type')

const typeValue = computed({
  get: () => props.row[typeField.value],
  set: (value: number) => {
    props.row[typeField.value] = value
    // Params are meaningless across types: reset this part only.
    for (const key of PART_KEYS[props.part]) {
      (props.row as Record<SaiParamKey, number>)[key] = 0
    }
  },
})

const def = computed(() => {
  switch (props.part) {
    case 'event': return getSaiEventDef(typeValue.value)
    case 'action': return getSaiActionDef(typeValue.value)
    case 'target': return getSaiTargetDef(typeValue.value)
  }
})

const options = computed(() => {
  const all = props.part === 'event'
    ? sai_event_type_options
    : props.part === 'action' ? sai_action_type_options : sai_target_type_options
  return all.filter(option => {
    if (option.value === typeValue.value) return true
    if (option.unused) return false
    if (props.part === 'event' && !isEventValidForSourceType(option.value, props.row.source_type)) return false
    return true
  })
})

// Uncurated types still get editable fields: one generic input per param,
// with the raw C++ header comment shown as a hint.
const fallbackParams = computed<SaiParamDef[]>(() =>
  PART_KEYS[props.part].map((key, index) => ({ key, label: `param${index + 1}` })),
)

const params = computed<SaiParamDef[]>(() => def.value?.curated ? def.value.params : fallbackParams.value)

const showRawHint = computed(() =>
  def.value !== undefined && !def.value.curated && def.value.rawComment !== '' && def.value.rawComment !== 'NONE',
)

const isPositionTarget = computed(() => props.part === 'target' && typeValue.value === 8)
</script>

<template>
  <div class="sai-segment">
    <div class="sai-grid">
      <EditorField :label="t(`smartScripts.parts.${part}`)" class="sai-grid-wide">
        <Select
          v-model="typeValue"
          :options="options"
          optionLabel="name"
          optionValue="value"
          filter
          fluid
        >
          <template #option="{ option }">
            <div class="sai-option">
              <span class="sai-option-name">
                {{ option.name }}
                <span v-if="option.unused" class="unused">{{ t('smartScripts.unused') }}</span>
              </span>
              <span v-if="option.comment" class="sai-option-comment">{{ option.comment }}</span>
            </div>
          </template>
        </Select>
      </EditorField>

      <ParamField v-for="param in params" :key="param.key" :row="row" :def="param" />

      <template v-if="isPositionTarget">
        <EditorField label="X"><InputNumber v-model="row.target_x" :maxFractionDigits="4" :useGrouping="false" fluid /></EditorField>
        <EditorField label="Y"><InputNumber v-model="row.target_y" :maxFractionDigits="4" :useGrouping="false" fluid /></EditorField>
        <EditorField label="Z"><InputNumber v-model="row.target_z" :maxFractionDigits="4" :useGrouping="false" fluid /></EditorField>
        <EditorField label="O"><InputNumber v-model="row.target_o" :maxFractionDigits="4" :useGrouping="false" fluid /></EditorField>
      </template>
    </div>
    <p v-if="showRawHint" class="sai-hint">{{ def?.rawComment }}</p>
  </div>
</template>

<style scoped>
@import '../smart-scripts-editor.css';
</style>

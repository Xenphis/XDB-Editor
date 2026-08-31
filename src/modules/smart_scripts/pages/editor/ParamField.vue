<script setup lang="ts">
import { computed } from 'vue'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import ToggleSwitch from 'primevue/toggleswitch'
import EditorField from '@core/components/EditorField.vue'
import BitmaskField from '@core/components/BitmaskField.vue'
import type { SmartScript } from '../../types/smart_scripts'
import type { SaiParamDef, SaiParamKey } from '../../types/sai'

const props = defineProps<{
  row: SmartScript
  def: SaiParamDef
}>()

const value = computed({
  get: () => props.row[props.def.key],
  set: (v: number | null) => {
    (props.row as Record<SaiParamKey, number>)[props.def.key] = v ?? 0
  },
})

const boolValue = computed({
  get: () => value.value !== 0,
  set: (v: boolean) => { value.value = v ? 1 : 0 },
})

const suffix = computed(() => {
  switch (props.def.kind) {
    case 'ms': return ' ms'
    case 'percent': return ' %'
    case 'seconds': return ' s'
    default: return undefined
  }
})

const tooltip = computed(() => {
  const parts: string[] = []
  if (props.def.tooltip) parts.push(props.def.tooltip)
  if (props.def.ref) parts.push(`(${props.def.ref.replace('_', ' ')} id)`)
  return parts.length > 0 ? parts.join(' ') : undefined
})
</script>

<template>
  <EditorField :label="def.label" :tooltip="tooltip">
    <ToggleSwitch v-if="def.kind === 'bool'" v-model="boolValue" />
    <BitmaskField
      v-else-if="def.kind === 'flags' && def.flags"
      v-model="value"
      :options="def.flags"
      :label="def.label"
    />
    <Select
      v-else-if="def.kind === 'enum' && def.options"
      v-model="value"
      :options="def.options"
      optionLabel="name"
      optionValue="value"
      fluid
    >
      <template #option="{ option }">
        <div class="sai-option">
          <span class="sai-option-name">{{ option.name }}</span>
          <span v-if="option.comment" class="sai-option-comment">{{ option.comment }}</span>
        </div>
      </template>
    </Select>
    <InputNumber
      v-else
      v-model="value"
      :useGrouping="false"
      :suffix="suffix"
      :min="def.kind === 'int' ? undefined : 0"
      fluid
    />
  </EditorField>
</template>

<style scoped>
@import '../smart-scripts-editor.css';
</style>

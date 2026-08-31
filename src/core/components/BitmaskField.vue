<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import InputNumber from 'primevue/inputnumber'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import ToggleSwitch from 'primevue/toggleswitch'
import type { BitmaskOption } from '@core/types/common'

const { t } = useI18n()

const props = defineProps<{
  modelValue: number
  options: BitmaskOption[]
  label: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
}>()

const dialogVisible = ref(false)
const localValue = ref(0)

function openDialog() {
  localValue.value = props.modelValue ?? 0
  dialogVisible.value = true
}

function isFlagActive(flag: number): boolean {
  return (localValue.value & flag) !== 0
}

function toggleFlag(flag: number, active: boolean) {
  if (active) {
    localValue.value = localValue.value | flag
  } else {
    localValue.value = localValue.value & ~flag
  }
}

function onDone() {
  emit('update:modelValue', localValue.value)
  dialogVisible.value = false
}

</script>

<template>
  <div class="bitmask-field">
    <div class="bitmask-input-wrapper">
      <InputNumber
        :modelValue="modelValue"
        :useGrouping="false"
        readonly
        fluid
        class="bitmask-input"
      />
      <Button
        label="..."
        class="bitmask-browse-btn"
        severity="secondary"
        @click="openDialog"
      />
    </div>

    <Dialog
      v-model:visible="dialogVisible"
      :header="label"
      modal
      :closable="true"
      :draggable="false"
      :style="{ width: '36rem' }"
      :pt="{
        root: { style: 'background: var(--surface-base); border: 1px solid var(--border-input); border-radius: 0.75rem; overflow: hidden;' },
        header: { style: 'background: var(--surface-base); border-bottom: 1px solid var(--border-default); padding: 1.25rem 1.5rem;' },
        content: { style: 'background: var(--surface-base); padding: 0;' },
        footer: { style: 'background: var(--surface-base); border-top: 1px solid var(--border-default); padding: 1rem 1.5rem;' },
        headerActions: { style: 'color: var(--text-muted);' },
        mask: { style: 'background: rgba(0,0,0,0.6);' },
      }"
    >
      <template #header>
        <div class="bitmask-dialog-header">
          <span class="bitmask-dialog-title">{{ label }}</span>
          <span class="bitmask-dialog-value">
            {{ t('bitmaskField.currentValue') }} <span class="value-number">{{ localValue }}</span>
          </span>
        </div>
      </template>

      <div class="bitmask-options-list">
        <div
          v-for="option in options"
          :key="option.value"
          class="bitmask-option"
          :class="{ 'bitmask-option-active': isFlagActive(option.value) }"
        >
          <ToggleSwitch
            :modelValue="isFlagActive(option.value)"
            @update:modelValue="(val: boolean) => toggleFlag(option.value, val)"
          />
          <div class="bitmask-option-info">
            <div class="bitmask-option-header">
              <span class="bitmask-option-name">{{ option.name }}</span>
              <span class="bitmask-option-hex">{{ option.hex }}</span>
            </div>
            <p v-if="option.comment" class="bitmask-option-comment">{{ option.comment }}</p>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="bitmask-dialog-footer">
          <Button
            :label="t('bitmaskField.done')"
            @click="onDone"
            class="bitmask-done-btn"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.bitmask-input-wrapper {
  display: flex;
  gap: 0.5rem;
  align-items: stretch;
  height: var(--input-height);
}

.bitmask-input {
  flex: 1;
  height: 100%;
}

.bitmask-input :deep(.p-inputnumber) {
  height: 100%;
}

.bitmask-input :deep(.p-inputnumber-input) {
  cursor: default;
  height: 100%;
}

.bitmask-browse-btn {
  min-width: var(--input-height) !important;
  width: var(--input-height) !important;
  height: 100% !important;
  padding: 0 !important;
  font-weight: 700;
  font-size: 0.85rem;
  letter-spacing: 0.1em;
  background: var(--surface-elevated) !important;
  border: 1px solid var(--border-input) !important;
  color: var(--text-muted) !important;
}

.bitmask-browse-btn:hover {
  background: var(--surface-strong) !important;
  color: var(--text) !important;
  border-color: var(--accent-focus) !important;
}

.bitmask-dialog-header {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.bitmask-dialog-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text);
}

.bitmask-dialog-value {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.bitmask-dialog-value .value-number {
  color: var(--accent);
  font-weight: 600;
}

/* Options list */
.bitmask-options-list {
  max-height: 28rem;
  overflow-y: auto;
  padding: 0.5rem 0;
}

.bitmask-options-list::-webkit-scrollbar {
  width: 6px;
}

.bitmask-options-list::-webkit-scrollbar-track {
  background: var(--surface-1);
}

.bitmask-options-list::-webkit-scrollbar-thumb {
  background: var(--surface-strong);
  border-radius: 3px;
}

.bitmask-options-list::-webkit-scrollbar-thumb:hover {
  background: rgba(71, 85, 105, 0.9);
}

.bitmask-option {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-default);
  transition: background 0.15s ease;
}

.bitmask-option:last-child {
  border-bottom: none;
}

.bitmask-option:hover {
  background: var(--surface-hover);
}

.bitmask-option-active {
  background: var(--accent-soft);
}

.bitmask-option-active:hover {
  background: var(--accent-soft);
}

.bitmask-option :deep(.p-toggleswitch) {
  margin-top: 0.15rem;
  flex-shrink: 0;
}

/* ToggleSwitch OFF state styling */
.bitmask-option :deep(.p-toggleswitch:not(.p-toggleswitch-checked) .p-toggleswitch-slider) {
  background: var(--surface-strong) !important;
  border: 1px solid rgba(71, 85, 105, 0.8) !important;
}

.bitmask-option :deep(.p-toggleswitch:not(.p-toggleswitch-checked) .p-toggleswitch-slider:hover) {
  background: rgba(71, 85, 105, 0.9) !important;
  border-color: rgba(100, 116, 139, 0.9) !important;
}

/* ToggleSwitch ON state styling - bleu ciel clair */
.bitmask-option :deep(.p-toggleswitch.p-toggleswitch-checked .p-toggleswitch-slider) {
  background: linear-gradient(135deg, var(--accent-strong), var(--accent)) !important;
  border: 1px solid var(--accent) !important;
}

.bitmask-option :deep(.p-toggleswitch.p-toggleswitch-checked .p-toggleswitch-slider:hover) {
  background: linear-gradient(135deg, var(--accent), var(--accent)) !important;
  border-color: var(--accent) !important;
}

.bitmask-option-info {
  flex: 1;
  min-width: 0;
}

.bitmask-option-header {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.bitmask-option-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text);
}

.bitmask-option-hex {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-family: monospace;
}

.bitmask-option-comment {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin: 0.25rem 0 0 0;
  line-height: 1.4;
}

/* Footer */
.bitmask-dialog-footer {
  display: flex;
  justify-content: flex-end;
}

.bitmask-done-btn {
  background: var(--accent-gradient) !important;
  border: none !important;
  color: var(--accent-contrast) !important;
  font-weight: 600 !important;
  padding: 0.5rem 1.5rem !important;
  border-radius: 0.5rem !important;
}

.bitmask-done-btn:hover {
  background: linear-gradient(135deg, var(--accent), var(--accent-strong)) !important;
}
</style>

<script setup lang="ts">
defineProps<{
  label: string
  tooltip?: string
  modified?: boolean
  fullWidth?: boolean
}>()
</script>

<template>
  <div class="field" :class="{ 'field-modified': modified, 'full-width': fullWidth }">
    <label>
      {{ label }}
      <i 
        v-if="tooltip" 
        class="pi pi-question-circle" 
        v-tooltip.top="tooltip"
      ></i>
    </label>
    <slot />
  </div>
</template>

<style scoped>
.field label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: var(--font-label);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  margin-bottom: 0.3rem;
}

.field label i {
  font-size: 0.8rem;
  color: var(--text-muted);
  cursor: help;
  transition: color 0.2s;
}

.field label i:hover {
  color: var(--text-soft);
}

.field.full-width {
  grid-column: 1 / -1;
}

.field.field-modified {
  position: relative;
}

.field.field-modified label {
  color: var(--accent);
}

.field.field-modified::before {
  content: '';
  position: absolute;
  left: -0.5rem;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--accent);
  border-radius: 2px;
}

.field.field-modified :deep(.p-inputtext),
.field.field-modified :deep(.p-inputnumber-input),
.field.field-modified :deep(.p-select) {
  border-color: var(--accent-focus) !important;
  background: var(--accent-soft) !important;
}
</style>

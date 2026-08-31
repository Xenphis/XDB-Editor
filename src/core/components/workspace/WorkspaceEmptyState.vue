<script setup lang="ts">
import { useI18n } from 'vue-i18n'

withDefaults(defineProps<{
  icon?: string
  message?: string
}>(), {
  icon: 'pi pi-arrow-left',
})

const { t } = useI18n()
</script>

<template>
  <div class="workspace-empty">
    <i :class="icon"></i>
    <p>{{ message ?? t('workspace.selectEntity') }}</p>
  </div>
</template>

<style scoped>
.workspace-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: var(--text-placeholder);
  min-height: 12rem;
}

.workspace-empty i {
  font-size: 1.75rem;
}

.workspace-empty p {
  font-size: 0.9rem;
  margin: 0;
}
</style>

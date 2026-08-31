<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps<{ moduleId: string }>()
</script>

<template>
  <div class="placeholder-module">
    <div class="content-header">
      <h1 class="content-title">{{ t(`modules.${moduleId}.title`) }}</h1>
      <p class="content-description">{{ t(`modules.${moduleId}.description`) }}</p>
    </div>
    <div class="content-placeholder">
      <i class="pi pi-wrench" style="font-size: 3rem; color: var(--text-placeholder)"></i>
      <p>{{ t('modules.placeholder') }}</p>
    </div>
  </div>
</template>

<style scoped>
.content-header {
  margin-bottom: 2rem;
}

.content-title {
  font-size: 2rem;
  font-weight: 700;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.5rem;
}

.content-description {
  color: var(--text-muted);
  font-size: 0.95rem;
}

.content-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  height: 50vh;
  border: 2px dashed var(--border-input-soft);
  border-radius: 1rem;
  color: var(--text-placeholder);
  font-size: 0.95rem;
}
</style>

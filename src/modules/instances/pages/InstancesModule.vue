<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()

const submodules = [
  {
    key: 'instances',
    icon: 'pi pi-building',
    gradient: 'linear-gradient(135deg, #6d28d9, #8b5cf6)',
    shadow: 'rgba(139, 92, 246, 0.25)',
    route: '/instances/instance-template',
  },
  {
    key: 'accessRequirement',
    icon: 'pi pi-lock',
    gradient: 'linear-gradient(135deg, #be123c, #f43f5e)',
    shadow: 'rgba(244, 63, 94, 0.25)',
    route: '/instances/access-requirement',
  },
]
</script>

<template>
  <div class="instances-module">
    <div class="module-header">
      <div class="module-header-icon">
        <i class="pi pi-building"></i>
      </div>
      <div>
        <h1 class="module-title">{{ t('instancesHub.title') }}</h1>
        <p class="module-description">{{ t('instancesHub.description') }}</p>
      </div>
    </div>

    <div class="submodule-grid">
      <div
        v-for="mod in submodules"
        :key="mod.key"
        class="submodule-card"
        @click="router.push(mod.route)"
      >
        <div class="card-icon-wrapper" :style="{ background: mod.gradient, boxShadow: `0 4px 16px ${mod.shadow}` }">
          <i :class="mod.icon" class="card-icon"></i>
        </div>

        <div class="card-content">
          <h2 class="card-title">{{ t(`instancesHub.submodules.${mod.key}.title`) }}</h2>
          <p class="card-desc">{{ t(`instancesHub.submodules.${mod.key}.description`) }}</p>
        </div>

        <div class="card-footer">
          <span class="badge-open">
            <i class="pi pi-arrow-right"></i>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.instances-module {
  padding: 2rem;
  height: 100%;
  overflow-y: auto;
}

.module-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2.5rem;
}

.module-header-icon {
  width: 3rem;
  height: 3rem;
  background: var(--accent-gradient);
  border-radius: 0.875rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(37, 99, 235, 0.3);
  flex-shrink: 0;
}

.module-header-icon .pi {
  font-size: 1.4rem;
  color: white;
}

.module-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text);
  line-height: 1.2;
  margin: 0;
}

.module-description {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin: 0.25rem 0 0;
}

.submodule-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.25rem;
}

.submodule-card {
  position: relative;
  background: var(--surface-1);
  border: 1px solid var(--border-input-soft);
  border-radius: 1rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  cursor: pointer;
  transition: all 0.25s ease;
  overflow: hidden;
}

.submodule-card:hover {
  border-color: var(--accent-focus);
  background: var(--surface-input);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.card-icon-wrapper {
  width: 3rem;
  height: 3rem;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-icon {
  font-size: 1.25rem;
  color: white;
}

.card-content {
  flex: 1;
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 0.375rem;
  line-height: 1.3;
}

.card-desc {
  font-size: 0.8125rem;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.5;
}

.card-footer {
  display: flex;
  align-items: center;
}

.badge-open {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  background: var(--accent-ring-soft);
  border: 1px solid var(--accent-ring);
  border-radius: 0.5rem;
  color: var(--accent);
  font-size: 0.875rem;
  margin-left: auto;
  transition: all 0.2s;
}

.submodule-card:hover .badge-open {
  background: var(--accent-ring);
  border-color: var(--accent-focus);
}
</style>

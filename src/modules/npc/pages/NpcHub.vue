<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()

const submodules = [
  {
    key: 'creatureTemplate',
    icon: 'pi pi-users',
    color: '#06b6d4',
    gradient: 'linear-gradient(135deg, #0e7490, #06b6d4)',
    shadow: 'rgba(6, 182, 212, 0.25)',
    available: true,
    route: '/npc/creature-template',
  },
  {
    key: 'trainer',
    icon: 'pi pi-graduation-cap',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #6d28d9, #8b5cf6)',
    shadow: 'rgba(139, 92, 246, 0.25)',
    available: true,
    route: '/npc/trainer',
  },
  {
    key: 'vendor',
    icon: 'pi pi-shopping-cart',
    color: '#f472b6',
    gradient: 'linear-gradient(135deg, #be185d, #f472b6)',
    shadow: 'rgba(244, 114, 182, 0.25)',
    available: true,
    route: '/npc/vendor',
  },
  {
    key: 'formation',
    icon: 'pi pi-sitemap',
    color: '#4ade80',
    gradient: 'linear-gradient(135deg, #15803d, #4ade80)',
    shadow: 'rgba(74, 222, 128, 0.25)',
    available: true,
    route: '/npc/formation',
  },
]

function onCardClick(mod: typeof submodules[number]) {
  if (mod.available && mod.route) {
    router.push(mod.route)
  }
}
</script>

<template>
  <div class="npc-hub-module">
    <div class="module-header">
      <div class="module-header-icon">
        <i class="pi pi-users"></i>
      </div>
      <div>
        <h1 class="module-title">{{ t('npc.hub.title') }}</h1>
        <p class="module-description">{{ t('npc.hub.description') }}</p>
      </div>
    </div>

    <div class="submodule-grid">
      <div
        v-for="mod in submodules"
        :key="mod.key"
        class="submodule-card"
        :class="{ 'card-disabled': !mod.available, 'card-available': mod.available }"
        @click="onCardClick(mod)"
      >
        <div
          class="card-icon-wrapper"
          :style="{ background: mod.gradient, boxShadow: `0 4px 16px ${mod.shadow}` }"
        >
          <i :class="mod.icon" class="card-icon"></i>
        </div>

        <div class="card-content">
          <h2 class="card-title">{{ t(`npc.hub.submodules.${mod.key}.title`) }}</h2>
          <p class="card-desc">{{ t(`npc.hub.submodules.${mod.key}.description`) }}</p>
        </div>

        <div class="card-footer">
          <span v-if="!mod.available" class="badge-soon">
            <i class="pi pi-clock"></i>
            {{ t('npc.hub.comingSoon') }}
          </span>
          <span v-else class="badge-open">
            <i class="pi pi-arrow-right"></i>
          </span>
        </div>

        <div v-if="!mod.available" class="card-overlay"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.npc-hub-module {
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
  transition: all 0.25s ease;
  overflow: hidden;
}

.card-available {
  cursor: pointer;
}

.card-disabled {
  cursor: default;
}

.card-available:hover {
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

.badge-soon {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-placeholder);
  background: var(--border-default);
  border: 1px solid var(--border-input-soft);
  padding: 0.25rem 0.625rem;
  border-radius: 0.375rem;
}

.badge-soon .pi {
  font-size: 0.7rem;
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

.card-available:hover .badge-open {
  background: var(--accent-ring);
  border-color: var(--accent-focus);
}

.card-overlay {
  position: absolute;
  inset: 0;
  background: var(--surface-veil);
  border-radius: inherit;
  pointer-events: none;
}
</style>

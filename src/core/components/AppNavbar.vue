<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useSessionTrackerStore } from '@core/stores/sessionTracker'
import { useConnectionStore } from '@core/stores/connectionStore'
import SettingsDialog from '@core/components/SettingsDialog.vue'
import { moduleNavigationItems } from '@/modules/registry'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const settingsVisible = ref(false)

const emit = defineEmits<{
  (e: 'disconnect'): void
}>()

const session = useSessionTrackerStore()
const connection = useConnectionStore()
const modules = moduleNavigationItems

function isActive(path: string): boolean {
  return route.path === path || route.path.startsWith(path + '/')
}

const connectionTooltip = () =>
  `${t('navbar.host')} ${connection.connectionInfo.host}:${connection.connectionInfo.port}\n` +
  `${t('navbar.database')} ${connection.connectionInfo.database}\n` +
  `${t('navbar.user')} ${connection.connectionInfo.username}`
</script>

<template>
  <header class="navbar">
    <!-- Logo -->
    <div class="navbar-logo">
      <div class="navbar-logo-icon">
        <i class="pi pi-database"></i>
      </div>
      <span class="navbar-logo-title">{{ t('navbar.appTitle') }}</span>
    </div>

    <div class="navbar-separator"></div>

    <!-- Modules -->
    <nav class="navbar-modules">
      <button
        v-for="mod in modules"
        :key="mod.id"
        class="navbar-module"
        :class="{ active: isActive(mod.path) }"
        v-tooltip.bottom="{ value: t(`navbar.modules.${mod.id}`), showDelay: 500 }"
        @click="router.push(mod.path)"
      >
        <i :class="mod.icon"></i>
        <span class="navbar-module-label">{{ t(`navbar.modules.${mod.id}`) }}</span>
      </button>
    </nav>

    <!-- Right cluster -->
    <div class="navbar-right">
      <button
        class="navbar-session"
        :class="{ 'has-changes': session.totalChanges > 0, active: isActive('/sql-session') }"
        @click="router.push('/sql-session')"
      >
        <i class="pi pi-code"></i>
        <span class="navbar-session-label">
          {{ t('navbar.session') }}<template v-if="session.totalChanges > 0"> : {{ t('navbar.sessionCount', session.totalChanges, { named: { n: session.totalChanges } }) }}</template>
        </span>
      </button>

      <button
        class="navbar-icon-btn"
        v-tooltip.bottom="t('navbar.settings')"
        @click="settingsVisible = true"
      >
        <i class="pi pi-cog"></i>
      </button>

      <div class="navbar-connection" v-tooltip.bottom="connectionTooltip()">
        <span class="connection-dot"></span>
        <span class="navbar-connection-label">{{ connection.connectionInfo.host }}:{{ connection.connectionInfo.port }} / {{ connection.connectionInfo.database }}</span>
      </div>

      <button
        class="navbar-icon-btn navbar-disconnect"
        v-tooltip.bottom="t('navbar.disconnect')"
        @click="emit('disconnect')"
      >
        <i class="pi pi-sign-out"></i>
      </button>
    </div>

    <SettingsDialog v-model:visible="settingsVisible" />
  </header>
</template>

<style scoped>
.navbar {
  height: var(--nav-height);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0 1rem;
  background: var(--nav-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--nav-border);
  box-shadow: var(--nav-shadow);
}

.navbar-logo {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-shrink: 0;
}

.navbar-logo-icon {
  width: 1.9rem;
  height: 1.9rem;
  border-radius: 0.5rem;
  background: var(--nav-logo-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--nav-logo-color);
  font-size: 0.95rem;
}

.navbar-logo-title {
  font-size: 0.9rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--nav-text);
  white-space: nowrap;
}

.navbar-separator {
  width: 1px;
  height: 1.6rem;
  background: var(--nav-separator);
  flex-shrink: 0;
}

.navbar-modules {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
  height: 100%;
}

.navbar-modules::-webkit-scrollbar {
  display: none;
}

.navbar-module {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  height: 100%;
  padding: 0 0.85rem;
  border: none;
  border-bottom: 2px solid transparent;
  border-top: 2px solid transparent;
  background: none;
  color: var(--nav-text-muted);
  font-size: 0.85rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: color 0.15s, background 0.15s, border-color 0.15s;
  white-space: nowrap;
}

.navbar-module:hover {
  background: var(--nav-hover);
  color: var(--nav-text);
}

.navbar-module.active {
  background: var(--nav-active-bg);
  color: var(--nav-active-text);
  border-bottom-color: var(--nav-active-border);
  font-weight: 600;
}

.navbar-module i {
  font-size: 0.9rem;
}

.navbar-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.navbar-session {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  height: 2.1rem;
  padding: 0 0.75rem;
  border: 1px solid var(--nav-btn-border);
  border-radius: var(--radius);
  background: transparent;
  color: var(--nav-text-muted);
  font-size: 0.8rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.navbar-session:hover {
  background: var(--nav-hover);
  color: var(--nav-text);
}

.navbar-session.has-changes {
  border-color: var(--nav-active-border);
  background: var(--nav-active-bg);
  color: var(--nav-active-text);
  font-weight: 600;
}

.navbar-session.active {
  border-color: var(--nav-active-border);
}

.navbar-icon-btn {
  width: 2.1rem;
  height: 2.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--nav-btn-border);
  border-radius: var(--radius);
  background: transparent;
  color: var(--nav-text-muted);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.15s;
}

.navbar-icon-btn:hover {
  background: var(--nav-hover);
  color: var(--nav-text);
}

.navbar-disconnect:hover {
  border-color: var(--nav-active-border);
  color: var(--nav-text);
  background: var(--nav-hover);
}

.navbar-connection {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0 0.6rem;
  height: 2.1rem;
  cursor: default;
}

.connection-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 6px color-mix(in srgb, var(--success) 60%, transparent);
  flex-shrink: 0;
}

.navbar-connection-label {
  font-size: 0.75rem;
  color: var(--nav-text-muted);
  white-space: nowrap;
  max-width: 16rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Narrow windows: icon-only modules, then hide connection details */
@media (max-width: 1280px) {
  .navbar-module-label {
    display: none;
  }

  .navbar-module i {
    font-size: 1.05rem;
  }
}

@media (max-width: 1000px) {
  .navbar-connection-label {
    display: none;
  }

  .navbar-session-label {
    display: none;
  }
}
</style>

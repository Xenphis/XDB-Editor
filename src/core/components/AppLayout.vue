<script setup lang="ts">
import AppNavbar from '@core/components/AppNavbar.vue'
import SqlDebugViewer from '@core/components/SqlDebugViewer.vue'
import { useConnectionStore } from '@core/stores/connectionStore'
import { useDebugStore } from '@core/stores/debugStore'
import { useRouter } from 'vue-router'

const connection = useConnectionStore()
const debug = useDebugStore()
const router = useRouter()

async function handleDisconnect() {
  await connection.disconnect()
  router.push('/login')
}
</script>

<template>
  <div class="app-layout">
    <AppNavbar @disconnect="handleDisconnect" />

    <main class="main-content">
      <router-view />
    </main>

    <!-- SQL Debug FAB -->
    <button
      v-if="debug.enabled"
      class="debug-fab"
      :title="$t('sqlDebug.openViewer')"
      @click="debug.viewerVisible = true"
    >
      <i class="pi pi-database"></i>
      <span v-if="debug.logs.length" class="debug-fab-badge">{{ debug.logs.length }}</span>
    </button>

    <SqlDebugViewer />
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.main-content {
  flex: 1;
  min-height: 0;
  min-width: 0;
  padding: 1rem 1.25rem;
  overflow-y: auto;
}

.debug-fab {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: var(--accent-gradient);
  border: none;
  color: white;
  font-size: 1.25rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
  transition: all 0.2s;
  z-index: 1000;
}

.debug-fab:hover {
  box-shadow: 0 6px 20px rgba(37, 99, 235, 0.6);
  transform: scale(1.05);
}

.debug-fab-badge {
  position: absolute;
  top: -0.25rem;
  right: -0.25rem;
  background: var(--danger);
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  min-width: 1.25rem;
  height: 1.25rem;
  border-radius: 0.625rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 0.25rem;
}
</style>

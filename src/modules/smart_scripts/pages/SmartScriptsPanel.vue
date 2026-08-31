<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import type { SmartScript } from '../types/smart_scripts'
import { SAI_EVENT_LINK, SAI_SOURCE_TYPE_TIMED_ACTIONLIST } from '../types/sai'
import { encodeScriptKey } from '../stores/scriptSet'
import { useSmartScriptsStore } from '../stores/smartScriptsStore'
import EventCard from './editor/EventCard.vue'

// Editing is driven entirely by the host editor's header (discard / execute),
// which also saves the script — this panel only renders and mutates the rows.
const props = defineProps<{
  /** Creature/GO entry, or the negative spawn GUID for a per-spawn script. */
  entryorguid: number
  sourceType: number
}>()

const { t } = useI18n()
const store = useSmartScriptsStore()

const loading = ref(false)
const expandedIds = ref(new Set<number>())

const scriptKey = computed(() => encodeScriptKey(props.entryorguid, props.sourceType))

watch(scriptKey, async (key) => {
  if (!Number.isFinite(key) || props.entryorguid === 0) return
  if (store.editorDataLoaded && store.editingId === key) return
  loading.value = true
  expandedIds.value = new Set()
  try {
    await store.openEditor(key)
  } catch (e) {
    console.error('Failed to load smart script:', e)
  } finally {
    loading.value = false
  }
}, { immediate: true })

/** Chains of the owner's script: each head row plus its linked (event 61) rows. */
const chains = computed<SmartScript[][]>(() => {
  const rows = [...store.rowsOf(props.entryorguid, props.sourceType)].sort((a, b) => a.id - b.id)
  const byId = new Map(rows.map(row => [row.id, row]))
  const linkedIds = new Set<number>()
  for (const row of rows) {
    if (row.link === 0) continue
    const next = byId.get(row.link)
    if (next && next.event_type === SAI_EVENT_LINK) linkedIds.add(next.id)
  }
  return rows
    .filter(row => !linkedIds.has(row.id))
    .map(head => {
      const chain = [head]
      const guard = new Set([head.id])
      let current = head
      while (current.link !== 0) {
        const next = byId.get(current.link)
        if (!next || next.event_type !== SAI_EVENT_LINK || guard.has(next.id)) break
        chain.push(next)
        guard.add(next.id)
        current = next
      }
      return chain
    })
})

const actionlists = computed(() => {
  const ids = new Set(
    store.scriptSet.rows
      .filter(row => row.source_type === SAI_SOURCE_TYPE_TIMED_ACTIONLIST)
      .map(row => row.entryorguid),
  )
  return [...ids].sort((a, b) => a - b)
})

const hookPending = computed(() => store.scriptSet.hookStatements.length > 0)

defineExpose({ chains, actionlists })

function toggleCard(head: SmartScript) {
  if (expandedIds.value.has(head.id)) {
    expandedIds.value.delete(head.id)
  } else {
    expandedIds.value.add(head.id)
  }
}

function onAddEvent() {
  const row = store.addRow(props.entryorguid, props.sourceType)
  expandedIds.value.add(row.id)
}
</script>

<template>
  <div class="sai-panel">
    <div v-if="loading" class="sai-panel-loading">
      <i class="pi pi-spin pi-spinner"></i>
    </div>

    <template v-else>
      <div v-if="hookPending" class="sai-hook-banner">
        <i class="pi pi-exclamation-triangle"></i>
        {{ t('smartScripts.hookWarning') }}
      </div>

      <div class="sai-toolbar">
        <Button
          icon="pi pi-plus"
          :label="t('smartScripts.addEvent')"
          severity="secondary"
          size="small"
          @click="onAddEvent"
        />
      </div>

      <EventCard
        v-for="chain in chains"
        :key="chain[0]!.id"
        :chain="chain"
        :expanded="expandedIds.has(chain[0]!.id)"
        @toggle="toggleCard(chain[0]!)"
        @remove="store.removeRow(chain[0]!)"
        @addLinked="store.addLinkedRow(chain[0]!)"
        @removeLinked="store.removeRow($event)"
      />

      <p v-if="chains.length === 0" class="sai-panel-empty">
        {{ t('smartScripts.noEvents') }}
      </p>
    </template>
  </div>
</template>

<style scoped>
@import './smart-scripts-editor.css';

.sai-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.sai-toolbar-spacer {
  flex: 1;
}

.sai-panel-loading {
  display: flex;
  justify-content: center;
  padding: 3rem 0;
  color: var(--accent);
  font-size: 1.5rem;
}

.sai-panel-empty {
  padding: 2rem 0;
  text-align: center;
  color: var(--text-placeholder);
  font-style: italic;
  font-size: 0.85rem;
}
</style>

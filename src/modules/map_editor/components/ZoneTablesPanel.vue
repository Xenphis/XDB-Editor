<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import SelectButton from 'primevue/selectbutton'
import EntityListPanel from '@core/components/workspace/EntityListPanel.vue'
import type { CreatureSpawnMarker, GameTele } from '../types'
import {
  loadCreatureSpawnsByMap,
  loadGameTelesByMap,
  loadZoneWorldBounds,
  type WorldBounds,
} from '../service'

/**
 * Docked right panel listing the DB tables tied to the selected zone:
 * teleports (game_tele) and creature spawns. Both are scoped spatially by the
 * zone's WorldMapArea rectangle when the client provides it, else map-wide —
 * neither table has a reliable zone column (`creature.zoneId` is 0 on stock
 * rows; the server computes it at runtime). Clicking a row flies the view
 * there. Teleports are edited in place (this module owns `game_tele`): the row
 * link opens the teleport dialog, the + button creates one; spawns still link
 * out to the NPC editor.
 */

const props = defineProps<{
  /** DB map id driving both tables. */
  map: number
  /** AreaTable id keying the WorldMapArea bounds lookup. */
  zoneId?: number
}>()

const emit = defineEmits<{
  /** Fly the current view to a row's position. */
  (e: 'fly', target: { x: number; y: number; z: number }): void
  /** Create a teleport on this map (the module owns the dialog). */
  (e: 'add-teleport'): void
  /** Edit an existing teleport. */
  (e: 'edit-teleport', row: GameTele): void
}>()

const { t } = useI18n()
const router = useRouter()

const KEY = 'workspace:mapEditor:tables'
const collapsed = ref(localStorage.getItem(KEY) === '1')

function toggle() {
  collapsed.value = !collapsed.value
  localStorage.setItem(KEY, collapsed.value ? '1' : '0')
}

/** Hard cap per query; past it the list shows the "refine" hint. */
const ROW_LIMIT = 500

type TableKind = 'teleports' | 'spawns'
type TableRow = GameTele | CreatureSpawnMarker

const activeTable = ref<TableKind>('teleports')
const tableOptions = computed(() => [
  { label: t('mapEditor.tables.teleports'), value: 'teleports' as TableKind },
  { label: t('mapEditor.tables.spawns'), value: 'spawns' as TableKind },
])

const rows = ref<TableRow[]>([])
const loading = ref(false)
const error = ref('')
const search = ref('')

/** Guards against out-of-order responses when switching tables fast. */
let requestId = 0

/** Zone world rectangle, fetched once per zone (null = map-wide fallback:
 * no zoneId, no client loaded, or no WorldMapArea entry for the zone). */
let boundsZoneId: number | null = null
let bounds: WorldBounds | null = null

async function zoneBounds(): Promise<WorldBounds | null> {
  if (props.zoneId == null) return null
  if (boundsZoneId !== props.zoneId) {
    try {
      bounds = await loadZoneWorldBounds(props.zoneId)
    } catch {
      bounds = null
    }
    boundsZoneId = props.zoneId
  }
  return bounds
}

async function load() {
  const id = ++requestId
  loading.value = true
  error.value = ''
  try {
    const query = search.value.trim() || undefined
    const scope = await zoneBounds()
    const result =
      activeTable.value === 'teleports'
        ? await loadGameTelesByMap(props.map, query, ROW_LIMIT, scope)
        : await loadCreatureSpawnsByMap(props.map, query, ROW_LIMIT, scope)
    if (id !== requestId) return
    rows.value = result
  } catch (e) {
    if (id !== requestId) return
    rows.value = []
    error.value = String(e)
  } finally {
    if (id === requestId) loading.value = false
  }
}

watch([activeTable, () => props.map, () => props.zoneId], () => void load(), { immediate: true })

function onSearch(query: string) {
  search.value = query
  void load()
}

/** Spawns are keyed by guid (their PK); teleports by id. */
function rowKey(row: TableRow): number {
  return 'guid' in row ? row.guid : row.id
}

function rowTitle(row: TableRow): string {
  return row.name || `#${rowKey(row)}`
}

function rowMeta(row: TableRow): string {
  const coords = `${row.position_x.toFixed(1)} · ${row.position_y.toFixed(1)} · ${row.position_z.toFixed(1)}`
  return `#${rowKey(row)} — ${coords}`
}

function onSelect(row: TableRow) {
  emit('fly', { x: row.position_x, y: row.position_y, z: row.position_z })
}

/** Teleports open the module's own dialog; spawns route to the NPC editor. */
function openInEditor(row: TableRow) {
  if (activeTable.value === 'teleports') {
    emit('edit-teleport', row as GameTele)
  } else {
    void router.push(`/npc/creature-template/${(row as CreatureSpawnMarker).id1}`)
  }
}

/** Show a fresh teleport list — called by the module after a save/delete. */
function showTeleports() {
  // The activeTable watch reloads; assigning the same value would not.
  if (activeTable.value === 'teleports') void load()
  else activeTable.value = 'teleports'
}

defineExpose({ showTeleports })
</script>

<template>
  <div class="tables-panel" :class="{ collapsed }">
    <!-- Collapsed rail -->
    <button v-if="collapsed" class="tables-rail" @click="toggle">
      <i class="pi pi-angle-double-left"></i>
      <span class="tables-rail-label">{{ t('mapEditor.tables.title') }}</span>
    </button>

    <template v-else>
      <div class="tables-header">
        <span class="tables-title">{{ t('mapEditor.tables.title') }}</span>
        <button class="tables-toggle" @click="toggle">
          <i class="pi pi-angle-double-right"></i>
        </button>
      </div>

      <div class="tables-switch">
        <SelectButton
          v-model="activeTable"
          :options="tableOptions"
          optionLabel="label"
          optionValue="value"
          :allowEmpty="false"
          size="small"
        />
      </div>

      <p v-if="error" class="tables-error">{{ t('mapEditor.tables.error', { message: error }) }}</p>

      <EntityListPanel
        :items="rows"
        :idOf="rowKey"
        :loading="loading"
        :showAdd="activeTable === 'teleports'"
        :searchPlaceholder="t('mapEditor.tables.searchPlaceholder')"
        @search="onSearch"
        @select="onSelect"
        @add="emit('add-teleport')"
      >
        <template #item="{ item }">
          <span class="row-main">
            <span class="row-title">{{ rowTitle(item) }}</span>
            <span class="row-meta">{{ rowMeta(item) }}</span>
          </span>
          <span
            class="row-open"
            role="button"
            v-tooltip.left="activeTable === 'teleports'
              ? t('mapEditor.tables.editTeleport')
              : t('mapEditor.tables.openEditor')"
            @click.stop="openInEditor(item)"
          >
            <i :class="activeTable === 'teleports' ? 'pi pi-pencil' : 'pi pi-external-link'"></i>
          </span>
        </template>
      </EntityListPanel>

      <p v-if="rows.length >= ROW_LIMIT" class="tables-truncated">
        {{ t('mapEditor.tables.truncated', { limit: ROW_LIMIT }) }}
      </p>
    </template>
  </div>
</template>

<style scoped>
.tables-panel {
  width: 320px;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--surface-1);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: width 0.15s ease;
}

.tables-panel.collapsed {
  width: 2.25rem;
}

.tables-rail {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0;
  border: none;
  background: none;
  color: var(--text-muted);
  cursor: pointer;
  font-family: inherit;
}

.tables-rail:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.tables-rail-label {
  writing-mode: vertical-rl;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.tables-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid var(--border-default);
  flex-shrink: 0;
}

.tables-title {
  font-size: var(--font-label);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.tables-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  border: none;
  border-radius: var(--radius);
  background: transparent;
  color: var(--text-placeholder);
  font-size: 0.75rem;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}

.tables-toggle:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.tables-switch {
  padding: 0.6rem 0.6rem 0;
  flex-shrink: 0;
}

.tables-switch :deep(.p-selectbutton) {
  display: flex;
  width: 100%;
}

.tables-switch :deep(.p-togglebutton) {
  flex: 1;
}

.tables-error {
  padding: 0.5rem 0.75rem 0;
  color: var(--danger);
  font-size: 0.8rem;
}

/* Slot content is styled here (the parent scope), not by EntityListPanel. */
.row-main {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
  flex: 1;
}

.row-title {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row-meta {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row-open {
  display: none;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: var(--radius);
  color: var(--text-placeholder);
  font-size: 0.7rem;
  flex-shrink: 0;
}

.tables-panel :deep(.entity-row:hover) .row-open {
  display: flex;
}

.row-open:hover {
  color: var(--accent);
  background: var(--accent-soft);
}

.tables-truncated {
  padding: 0.45rem 0.75rem;
  border-top: 1px solid var(--border-default);
  color: var(--text-muted);
  font-size: 0.72rem;
  flex-shrink: 0;
}
</style>

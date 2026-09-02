<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import ContextMenu from 'primevue/contextmenu'
import SelectButton from 'primevue/selectbutton'
import Select from 'primevue/select'
import EntityWorkspace from '@core/components/workspace/EntityWorkspace.vue'
import EntityListPanel from '@core/components/workspace/EntityListPanel.vue'
import { useMapEditorStore } from '../store'
import { ensureClientLoaded } from '../service'
import { ZONES, ZONE_BY_ID } from '../data/zones'
import type {
  CreatureSpawnMarker,
  FocusPosition,
  GameTele,
  MinimapMapInfo,
  PickedPosition,
  WorldPosition,
  ZoneDefinition,
} from '../types'
import WorldMap from '../components/WorldMap.vue'
import WorldScene3D from '../components/WorldScene3D.vue'
import SpawnInfoPanel from '../components/SpawnInfoPanel.vue'
import TeleportEditorDialog from '../components/TeleportEditorDialog.vue'
import ZoneTablesPanel from '../components/ZoneTablesPanel.vue'

const { t, te } = useI18n()
const store = useMapEditorStore()
const route = useRoute()
const router = useRouter()

const loading = ref(false)
const error = ref('')
const cursor = ref<WorldPosition | null>(null)
const viewMode = ref<'2d' | '3d'>('2d')
const viewModes = [
  { label: '2D', value: '2d' as const },
  { label: '3D', value: '3d' as const },
]
/** Last 2D view center; seeds the 3D camera when toggling. */
const viewCenter = ref<WorldPosition | null>(null)
/** Position picked with right-click, shown in the toolbar with a copy action. */
const picked = ref<PickedPosition | null>(null)
const copied = ref(false)

// ── Zones ──────────────────────────────────────────────────────────────
// The zone list is the only navigation: selecting a zone switches the map.
const zoneSearch = ref('')

/** Localized zone name; a zone without a translation shows its raw id. */
function zoneName(zone: ZoneDefinition): string {
  const key = `mapEditor.zones.names.${zone.id}`
  return te(key) ? t(key) : zone.id
}

const filteredZones = computed(() => {
  const query = zoneSearch.value.trim().toLowerCase()
  const zones = query
    ? ZONES.filter(zone => zoneName(zone).toLowerCase().includes(query))
    : [...ZONES]
  // Continents in map order, zones alphabetically within each (per locale).
  return zones.sort((a, b) => a.map - b.map || zoneName(a).localeCompare(zoneName(b)))
})
const selectedZone = computed(() => ZONE_BY_ID.get(store.lastZoneId) ?? null)
/** Camera/view target; each assignment is a fresh object so the views re-trigger. */
const focusTarget = ref<FocusPosition | null>(null)
/** Selected table row position, shown as a dot on the 2D map. */
const rowMarker = ref<FocusPosition | null>(null)

/** A table row was selected: fly there and mark the spot. */
function onFly(target: { x: number; y: number; z: number }) {
  focusTarget.value = { ...target }
  rowMarker.value = { ...target }
}

/**
 * Reads focusMap/focusX/focusY/focusZ from the route query — set by other
 * modules linking here (e.g. the NPC editor's spawn list) — and, if they
 * match a map in the loaded client, switches to it and flies/marks the
 * position. Runs once per mount, after the client is loaded, then clears
 * the query so it doesn't reapply on a later re-render.
 */
async function applyPendingFocus() {
  const { focusMap, focusX, focusY, focusZ } = route.query
  if (focusMap == null || focusX == null || focusY == null || focusZ == null) return
  const mapId = Number(focusMap)
  const x = Number(focusX)
  const y = Number(focusY)
  const z = Number(focusZ)
  if (![mapId, x, y, z].every(Number.isFinite)) return
  const info = store.maps.find(m => m.mapId === mapId)
  if (!info) return
  store.lastZoneId = ''
  store.lastMapId = info.id
  // The lastMapId watch below clears rowMarker on a map switch; let it flush
  // before setting the marker so it isn't wiped out.
  await nextTick()
  focusTarget.value = { x, y, z }
  rowMarker.value = { x, y, z }
  void router.replace({ query: {} })
}

function selectZone(zone: ZoneDefinition) {
  store.lastZoneId = zone.id
  focusTarget.value = { ...zone.origin }
  rowMarker.value = null
  // May remount the 3D view; initialPosition then reads focusTarget. A zone
  // whose map has no minimap data clears the map (dedicated empty state).
  const info = store.maps.find(m => m.mapId === zone.map)
  store.lastMapId = info?.id ?? ''
}

function onCenter(center: WorldPosition) {
  viewCenter.value = center
  // Panning away from the focused spot dissolves the focus: the 2D center
  // seeds the 3D camera again (the focus only carried its exact height).
  const focus = focusTarget.value
  if (focus && Math.hypot(center.x - focus.x, center.y - focus.y) > 5) {
    focusTarget.value = null
  }
}

function formatCoord(value: number): string {
  return value.toFixed(2)
}

const pickedText = computed(() => {
  if (!picked.value) return ''
  const parts = [formatCoord(picked.value.x), formatCoord(picked.value.y)]
  if (picked.value.z !== null) parts.push(formatCoord(picked.value.z))
  return parts.join(' ')
})

async function copyPicked() {
  if (!picked.value) return
  try {
    await navigator.clipboard.writeText(pickedText.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    /* clipboard unavailable: the value stays visible for manual copy */
  }
}

const selectedMap = computed<MinimapMapInfo | null>(
  () => store.maps.find(m => m.id === store.lastMapId) ?? null,
)

/** DB map id of what is on screen — `game_tele.map` for a new teleport. */
const dbMapId = computed<number | null>(
  () => selectedMap.value?.mapId ?? selectedZone.value?.map ?? null,
)

// ── Teleports (game_tele) ──────────────────────────────────────────────
// This module owns the table: right-clicking the 2D map (or the picked-chip
// button, which also works from 3D where the pick carries a height) drops a
// new point, and the zone tables panel opens existing ones.
const tablesPanel = ref<InstanceType<typeof ZoneTablesPanel> | null>(null)
const mapMenu = ref<InstanceType<typeof ContextMenu> | null>(null)
const teleportDialog = ref(false)
const teleportDraft = ref<GameTele | null>(null)
const teleportIsNew = ref(false)

const mapMenuItems = computed(() => [
  {
    label: t('mapEditor.picked.copy'),
    icon: 'pi pi-copy',
    command: () => void copyPicked(),
  },
  {
    label: t('mapEditor.teleports.addHere'),
    icon: 'pi pi-map-marker',
    disabled: dbMapId.value == null,
    command: () => openNewTeleport(picked.value),
  },
])

function onMapContext(payload: { position: PickedPosition; event: MouseEvent }) {
  picked.value = payload.position
  mapMenu.value?.show(payload.event)
}

/** Seed for the panel's + button: last picked spot, else the view, else the zone. */
function defaultTeleportPosition(): PickedPosition | null {
  if (picked.value) return picked.value
  if (viewCenter.value) return { ...viewCenter.value, z: null }
  const origin = selectedZone.value?.origin
  return origin ? { x: origin.x, y: origin.y, z: origin.z } : null
}

function openNewTeleport(position: PickedPosition | null) {
  const map = dbMapId.value
  if (!position || map == null) return
  teleportDraft.value = {
    id: 0, // the dialog fills in MAX(id) + 1
    name: '',
    map,
    position_x: position.x,
    position_y: position.y,
    // A 2D pick has no height; the dialog flags the 0 it starts from.
    position_z: position.z ?? 0,
    orientation: 0,
  }
  teleportIsNew.value = true
  teleportDialog.value = true
}

function openTeleport(row: GameTele) {
  teleportDraft.value = { ...row }
  teleportIsNew.value = false
  teleportDialog.value = true
}

function onTeleportSaved(row: GameTele) {
  // Mark where it landed and pull the panel back to a fresh teleport list.
  rowMarker.value = { x: row.position_x, y: row.position_y, z: row.position_z }
  tablesPanel.value?.showTeleports()
}

function onTeleportDeleted() {
  rowMarker.value = null
  tablesPanel.value?.showTeleports()
}

// Spawns need the DB map id (creature.map); a directory with no Map.dbc match
// can't be linked to spawns, so the toggle is disabled there.
const spawnsAvailable = computed(() => selectedMap.value?.mapId != null)

/**
 * Phase filter options for the spawn stream. phaseMask is a bitmask, so the
 * values are powers of two; ten covers what 3.3.5 content actually uses while
 * keeping the dropdown readable. `null` disables the filter.
 */
const phaseOptions = computed(() => [
  { label: t('mapEditor.spawns.phase.all'), value: null },
  ...Array.from({ length: 10 }, (_, i) => {
    const mask = 1 << i
    return { label: t('mapEditor.spawns.phase.one', { n: i + 1, mask }), value: mask }
  }),
])

/**
 * Render quality for the 3D view. Mostly the streaming radius, which is very
 * nearly the draw-call count in this renderer (see `QUALITY_PRESETS` in
 * `WorldScene3D.vue`), so it is the one control that trades horizon for frame
 * rate. Persisted per user: what a machine sustains at 60 FPS is a property of
 * the machine, not of the data being edited.
 */
const qualityOptions = computed(() => [
  { label: t('mapEditor.quality.low'), value: 'low' as const },
  { label: t('mapEditor.quality.medium'), value: 'medium' as const },
  { label: t('mapEditor.quality.high'), value: 'high' as const },
])

/** Spawn clicked in the 3D view; its repositioning drives the migration output. */
const selectedSpawn = ref<CreatureSpawnMarker | null>(null)
/** When armed, the next terrain right-click relocates the selected spawn. */
const moveArmed = ref(false)
/** New position captured after a move, kept for the UPDATE statement. */
const movedPosition = ref<{ x: number; y: number; z: number } | null>(null)
const sqlCopied = ref(false)

const migrationSql = computed(() => {
  if (!selectedSpawn.value || !movedPosition.value) return ''
  const p = movedPosition.value
  return `UPDATE creature SET position_x = ${p.x.toFixed(4)}, position_y = ${p.y.toFixed(4)}, position_z = ${p.z.toFixed(4)} WHERE guid = ${selectedSpawn.value.guid};`
})

function onSelectSpawn(spawn: CreatureSpawnMarker | null) {
  selectedSpawn.value = spawn
  moveArmed.value = false
  movedPosition.value = null
}

function onMoveSpawn(move: { guid: number; x: number; y: number; z: number }) {
  movedPosition.value = { x: move.x, y: move.y, z: move.z }
  moveArmed.value = false
}

function clearSelectedSpawn() {
  selectedSpawn.value = null
  moveArmed.value = false
  movedPosition.value = null
}

async function copyMigration() {
  if (!migrationSql.value) return
  try {
    await navigator.clipboard.writeText(migrationSql.value)
    sqlCopied.value = true
    setTimeout(() => (sqlCopied.value = false), 1500)
  } catch {
    /* clipboard unavailable: the statement stays visible for manual copy */
  }
}

// A center from another map would teleport the 3D camera into the void.
watch(() => store.lastMapId, () => {
  viewCenter.value = null
  cursor.value = null
  picked.value = null
  rowMarker.value = null
  clearSelectedSpawn()
})

// Leaving 3D invalidates any current spawn selection.
watch(viewMode, () => {
  if (viewMode.value !== '3d') clearSelectedSpawn()
})

async function load() {
  const path = store.clientPath.trim()
  if (!path || loading.value) return
  loading.value = true
  error.value = ''
  try {
    store.maps = await ensureClientLoaded(path)
    if (selectedZone.value) {
      // Restore the persisted zone: map + camera back at its origin.
      selectZone(selectedZone.value)
    } else {
      // No zone yet: nothing to display (the map only follows the zone).
      store.lastMapId = ''
    }
  } catch (e) {
    store.maps = []
    error.value = String(e)
  } finally {
    loading.value = false
  }
}

// The path is set in Settings; reload when it changes while the module is
// open. Debounced so typing in the Settings input doesn't spam the backend.
let pathReloadTimer: ReturnType<typeof setTimeout> | undefined
watch(() => store.clientPath, () => {
  clearTimeout(pathReloadTimer)
  pathReloadTimer = setTimeout(() => void load(), 800)
})

onMounted(async () => {
  if (store.clientPath && store.maps.length === 0) {
    await load()
  }
  await applyPendingFocus()
})
</script>

<template>
  <div class="map-editor">
    <div class="editor-header">
      <div>
        <h2 class="editor-title">{{ t('mapEditor.title') }}</h2>
        <p class="editor-description">{{ t('mapEditor.description') }}</p>
      </div>
    </div>

    <EntityWorkspace storageKey="mapEditor" listWidth="240px" class="editor-workspace">
      <!-- Curated zones (data/zones.ts); selecting one drives map + camera. -->
      <template #list>
        <EntityListPanel
          :items="filteredZones"
          :idOf="zone => zone.id"
          :titleOf="zoneName"
          :metaOf="zone => t('mapEditor.zones.mapMeta', { map: zone.map })"
          :selectedId="store.lastZoneId || null"
          :showAdd="false"
          :searchPlaceholder="t('mapEditor.zones.searchPlaceholder')"
          @search="zoneSearch = $event"
          @select="selectZone"
        />
      </template>

      <template #editor>
        <p v-if="error" class="editor-error">{{ t('mapEditor.states.error', { message: error }) }}</p>

        <div class="map-stage">
          <WorldMap
            v-if="selectedMap && viewMode === '2d'"
            :map="selectedMap"
            :focus="focusTarget"
            :marker="rowMarker"
            class="editor-map"
            @cursor="cursor = $event"
            @center="onCenter"
            @pick="picked = $event"
            @context="onMapContext"
          />
          <!-- Keyed on the quality too: `MapManager` reads its view distance
               once in the constructor and the renderer's MSAA is fixed at
               context creation, so switching preset has to remount. -->
          <WorldScene3D
            v-else-if="selectedMap"
            :key="`${selectedMap.id}:${store.renderQuality}`"
            :map="selectedMap"
            :initialPosition="focusTarget ?? viewCenter"
            :focus="focusTarget"
            :showSpawns="spawnsAvailable"
            :spawnPhase="store.spawnPhase"
            :moveArmed="moveArmed"
            :quality="store.renderQuality"
            class="editor-map"
            @pick="picked = $event"
            @select-spawn="onSelectSpawn"
            @move-spawn="onMoveSpawn"
          />
          <div v-else class="editor-empty">
            <i class="pi pi-map" style="font-size: 3rem; color: var(--text-placeholder)"></i>
            <p>
              {{
                loading
                  ? t('mapEditor.states.loading')
                  : store.maps.length === 0
                    ? t('mapEditor.states.noClient')
                    : selectedZone
                      ? t('mapEditor.states.noMinimap', { map: selectedZone.map })
                      : t('mapEditor.states.noZone')
              }}
            </p>
          </div>

          <!-- View controls float top-right, the same corner treatment as the
               2D view's zoom control; the spawn panel stacks below them. -->
          <div v-if="selectedMap" class="stage-top-right">
            <div class="stage-controls">
              <SelectButton
                v-model="viewMode"
                :options="viewModes"
                optionLabel="label"
                optionValue="value"
                :allowEmpty="false"
                size="small"
              />
              <Select
                v-if="viewMode === '3d' && spawnsAvailable"
                v-model="store.spawnPhase"
                :options="phaseOptions"
                optionLabel="label"
                optionValue="value"
                :placeholder="t('mapEditor.spawns.phase.label')"
                v-tooltip.bottom="t('mapEditor.spawns.phase.hint')"
                class="phase-select"
                size="small"
              />
              <Select
                v-if="viewMode === '3d'"
                v-model="store.renderQuality"
                :options="qualityOptions"
                optionLabel="label"
                optionValue="value"
                v-tooltip.bottom="t('mapEditor.quality.hint')"
                class="quality-select"
                size="small"
              />
            </div>

            <div v-if="viewMode === '3d' && selectedSpawn" class="spawn-overlay">
              <SpawnInfoPanel
                :spawn="selectedSpawn"
                v-model:moveArmed="moveArmed"
                :movedPosition="movedPosition"
                :migrationSql="migrationSql"
                :sqlCopied="sqlCopied"
                @copy-sql="copyMigration"
                @close="clearSelectedSpawn"
              />
            </div>
          </div>

          <!-- Coordinates float bottom-left: live cursor position, then the
               right-clicked/picked point with its actions. -->
          <div v-if="(cursor && viewMode === '2d') || picked" class="stage-bottom-left">
            <span v-if="cursor && viewMode === '2d'" class="cursor-coords">
              X {{ cursor.x.toFixed(1) }} · Y {{ cursor.y.toFixed(1) }}
            </span>
            <span v-if="picked" class="picked-chip">
              <i class="pi pi-map-marker"></i>
              <span class="picked-value">{{ pickedText }}</span>
              <Button
                :icon="copied ? 'pi pi-check' : 'pi pi-copy'"
                text
                size="small"
                :aria-label="t('mapEditor.picked.copy')"
                v-tooltip.bottom="t('mapEditor.picked.copy')"
                @click="copyPicked"
              />
              <Button
                icon="pi pi-plus"
                text
                size="small"
                :disabled="dbMapId == null"
                :aria-label="t('mapEditor.teleports.addHere')"
                v-tooltip.bottom="dbMapId == null ? t('mapEditor.teleports.noMapId') : t('mapEditor.teleports.addHere')"
                @click="openNewTeleport(picked)"
              />
              <Button
                icon="pi pi-times"
                text
                size="small"
                :aria-label="t('mapEditor.picked.clear')"
                @click="picked = null"
              />
            </span>
          </div>
        </div>
      </template>

      <!-- Zone tables live off the DB map id alone, minimap or not. -->
      <template v-if="selectedZone" #inspector>
        <ZoneTablesPanel
          ref="tablesPanel"
          :map="selectedZone.map"
          :zoneId="selectedZone.zoneId"
          @fly="onFly"
          @add-teleport="openNewTeleport(defaultTeleportPosition())"
          @edit-teleport="openTeleport"
        />
      </template>
    </EntityWorkspace>

    <ContextMenu ref="mapMenu" :model="mapMenuItems" />

    <TeleportEditorDialog
      v-model:visible="teleportDialog"
      :draft="teleportDraft"
      :isNew="teleportIsNew"
      @saved="onTeleportSaved"
      @deleted="onTeleportDeleted"
    />
  </div>
</template>

<style scoped>
.map-editor {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  min-height: 0;
}

.editor-title {
  font-size: 2rem;
  font-weight: 700;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.5rem;
}

.editor-description {
  color: var(--text-muted);
  font-size: 0.95rem;
}

/* Flex sizing beats the workspace's own height: 100% inside this column. */
.editor-workspace {
  flex: 1;
  min-height: 0;
}

/* forms.css forces every .p-select to a fixed default height, which would
   override the stretch below — height: auto hands sizing back to the
   .stage-controls flex row, so this matches the toggle's height exactly
   instead of guessing a number that drifts whenever the toggle is resized. */
.phase-select {
  min-width: 11rem;
  height: auto;
}

.quality-select {
  min-width: 8rem;
  height: auto;
}

/* The label's height still needs to actually reach the stretched box: block
   text sizes to line-height (forms.css sets one for the *default* height),
   so flex-center the label instead of trusting a line-height to land right,
   and reset line-height itself so it stops dictating the natural height. */
.phase-select :deep(.p-select-label),
.quality-select :deep(.p-select-label) {
  display: flex;
  align-items: center;
  padding: 0 0.75rem !important;
  line-height: normal !important;
}

.cursor-coords {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  border: 1px solid var(--surface-strong);
  background: var(--surface-elevated);
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
  font-size: 0.7rem;
  white-space: nowrap;
}

.picked-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.1rem 0.15rem 0.1rem 0.5rem;
  border-radius: 999px;
  border: 1px solid var(--surface-strong);
  background: var(--surface-elevated);
  color: var(--text);
  font-size: 0.7rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.picked-chip .pi-map-marker {
  color: var(--accent);
  font-size: 0.7rem;
}

.picked-chip :deep(.p-button.p-button-icon-only) {
  width: 1.15rem;
  height: 1.15rem;
}

.picked-chip :deep(.p-button .p-button-icon) {
  font-size: 0.7rem;
}

.editor-error {
  color: var(--danger);
  font-size: 0.9rem;
}

.map-stage {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
}

/* Isolates a stacking context: Leaflet always creates all four control
   corners (even empty ones) at z-index 1000, which would otherwise outrank
   the overlays below regardless of their own z-index — only the 2D view is
   affected, since only Leaflet adds those phantom corners. */
.editor-map {
  position: relative;
  z-index: 0;
  flex: 1;
  min-height: 0;
}

/* View controls float over the map's top-right corner, the same treatment as
   the 2D view's zoom control. The spawn panel stacks below them and scrolls
   internally instead of pushing anything. */
.stage-top-right {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  bottom: 0.75rem;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.75rem;
  pointer-events: none;
  z-index: 5;
}

.stage-top-right > * {
  pointer-events: auto;
}

/* stretch (not center) so the select below can match the toggle's height by
   filling it, rather than both hardcoding a height and hoping they agree;
   nowrap because align-items: stretch silently no-ops in a wrapping flex
   container whose own cross size isn't otherwise fixed. */
.stage-controls {
  display: flex;
  align-items: stretch;
  gap: 0.5rem;
  flex-wrap: nowrap;
  justify-content: flex-end;
}

/* No gap here: SelectButton's segments are meant to touch (each has its own
   1px border and only the outer corners are rounded) — a gap leaves a
   transparent strip between them with nothing behind it but the map. */

/* ToggleButton nests a separate .p-togglebutton-content box (it carries its
   own checked-state background, independent of the root's), so both need
   the same shrink — resizing only the root leaves content at its original
   padding, and the two mismatched boxes render as a visible split. */
.stage-controls :deep(.p-togglebutton) {
  padding: 0.2rem;
  font-size: 0.8rem;
}

.stage-controls :deep(.p-togglebutton-content) {
  padding: 0.2rem 0.4rem;
}

.spawn-overlay {
  display: flex;
  align-items: flex-start;
  flex: 1;
  min-height: 0;
}

.spawn-overlay > * {
  max-height: 100%;
}

/* Coordinates float over the map's bottom-left corner instead of a toolbar. */
.stage-bottom-left {
  position: absolute;
  left: 0.75rem;
  bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  z-index: 5;
}

.editor-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  flex: 1;
  border: 2px dashed var(--border-input-soft);
  border-radius: 1rem;
  color: var(--text-placeholder);
  font-size: 0.95rem;
}
</style>

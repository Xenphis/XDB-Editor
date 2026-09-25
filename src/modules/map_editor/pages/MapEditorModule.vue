<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import ContextMenu from 'primevue/contextmenu'
import Popover from 'primevue/popover'
import SelectButton from 'primevue/selectbutton'
import Select from 'primevue/select'
import ToggleButton from 'primevue/togglebutton'
import ToggleSwitch from 'primevue/toggleswitch'
import EntityWorkspace from '@core/components/workspace/EntityWorkspace.vue'
import EntityListPanel from '@core/components/workspace/EntityListPanel.vue'
import { useMapEditorStore } from '../store'
import { deleteCreatureSpawn } from '@/modules/npc/service'
import { ensureClientLoaded, loadAreatriggerTeleportTargets, loadMapRecords } from '../service'
import { ZONES, ZONE_BY_ID } from '../data/zones'
import { useSpawnTransform } from '../spawnTransform'
import { trackSpawnDelete, trackSpawnTransform } from '../spawnTracking'
import {
  INSTANCE_TYPE_DUNGEON,
  INSTANCE_TYPE_RAID,
  type CreatureSpawnMarker,
  type FocusPosition,
  type GameTele,
  type GizmoMode,
  type MapCategory,
  type MapRecord,
  type MinimapMapInfo,
  type MinimapMarker,
  type PickedPosition,
  type SavedView,
  type SpawnTransform,
  type WorldPosition,
  type ZoneDefinition,
} from '../types'
import MapCategorySelect from '../components/MapCategorySelect.vue'
import WorldMap from '../components/WorldMap.vue'
import WorldScene3D from '../components/WorldScene3D.vue'
import SceneMinimap from '../components/SceneMinimap.vue'
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
const viewModes = [
  { label: '2D', value: '2d' as const },
  { label: '3D', value: '3d' as const },
]
/**
 * What the stage shows. Instances are 3D only: most have no usable 2D map —
 * their minimaps are drawn per WMO, which the tile index doesn't serve, and
 * the ones built from WMOs only have no tiles at all. `store.viewMode` keeps
 * the open world's own choice for when its list comes back.
 */
const activeViewMode = computed(() => (store.mapCategory === 'instances' ? '3d' : store.viewMode))
/**
 * Where the view was left on the map shown: the 2D center and zoom, the 3D
 * camera. Starts whichever view mounts when nothing is focused — after a
 * 2D/3D toggle, and when coming back to the editor (it is persisted).
 */
const savedView = computed(() => (store.view?.map === store.lastMapId ? store.view : null))
/** Yards the view can drift off a spot and still be on it. */
const SAME_SPOT_YARDS = 5
/** Position picked with right-click, shown in the toolbar with a copy action. */
const picked = ref<PickedPosition | null>(null)
const copied = ref(false)

// ── Zones ──────────────────────────────────────────────────────────────
// The sidebar list is the only navigation: selecting a zone (or, in the
// instances category, a dungeon/raid) switches the map.
/** Search of whichever list is shown; a category switch clears it. */
const listSearch = ref('')

/** Localized zone name; a zone without a translation shows its raw id. */
function zoneName(zone: ZoneDefinition): string {
  const key = `mapEditor.zones.names.${zone.id}`
  return te(key) ? t(key) : zone.id
}

const filteredZones = computed(() => {
  const query = listSearch.value.trim().toLowerCase()
  const zones = query
    ? ZONES.filter(zone => zoneName(zone).toLowerCase().includes(query))
    : [...ZONES]
  // Continents in map order, zones alphabetically within each (per locale).
  return zones.sort((a, b) => a.map - b.map || zoneName(a).localeCompare(zoneName(b)))
})
const selectedZone = computed(() =>
  store.mapCategory === 'world' ? ZONE_BY_ID.get(store.lastZoneId) ?? null : null,
)
/** Camera/view target; each assignment is a fresh object so the views re-trigger. */
const focusTarget = ref<FocusPosition | null>(null)
/** Selected table row position, shown as a dot on the 2D map. */
const rowMarker = ref<FocusPosition | null>(null)

/** A table row was selected: fly there and mark the spot. */
function onFly(target: { x: number; y: number; z: number }) {
  focusTarget.value = { ...target }
  rowMarker.value = { ...target }
}

// ── Instances ──────────────────────────────────────────────────────────
// Dungeons and raids come from the client's Map.dbc, and open on their
// entrance: the map's first areatrigger_teleport landing (DB).
const mapRecordsLoading = ref(false)
/** Entrance per DB map id; null until the DB has answered. */
const entrances = ref<Map<number, FocusPosition> | null>(null)
let entrancesLoad: Promise<Map<number, FocusPosition>> | null = null

/** Fetched once per visit; a failure leaves every instance without one. */
function instanceEntrances(): Promise<Map<number, FocusPosition>> {
  entrancesLoad ??= loadAreatriggerTeleportTargets()
    .then(rows => new Map(rows.map((row): [number, FocusPosition] => [row.target_map, {
      x: row.target_position_x,
      y: row.target_position_y,
      z: row.target_position_z,
      orientation: row.target_orientation,
    }])))
    .catch(e => {
      console.error('Failed to load instance entrances:', e)
      return new Map<number, FocusPosition>()
    })
    .then(map => (entrances.value = map))
  return entrancesLoad
}

/** Map.dbc read of the current client. Showing a WMO-only instance waits on
 * it: its directory, which the 3D view loads it by, only comes from there. */
let instanceMapsLoad: Promise<void> = Promise.resolve()

async function loadInstanceMaps() {
  mapRecordsLoading.value = true
  try {
    const records = await loadMapRecords()
    store.instanceMaps = records.filter(
      record =>
        record.instanceType === INSTANCE_TYPE_DUNGEON || record.instanceType === INSTANCE_TYPE_RAID,
    )
  } catch (e) {
    store.instanceMaps = []
    console.error('Failed to read Map.dbc:', e)
  } finally {
    mapRecordsLoading.value = false
  }
}

const instancesLoading = computed(() => mapRecordsLoading.value || entrances.value === null)

/**
 * The dungeons and raids that can be shown (minimap tiles) or at least
 * entered (an entrance in the DB) — which drops the unused and test instances
 * Map.dbc still carries. Alphabetical; the search matches a name or a map id.
 */
const filteredInstances = computed(() => {
  const tiled = new Set(store.maps.map(info => info.mapId))
  const query = listSearch.value.trim().toLowerCase()
  return store.instanceMaps
    .filter(record => tiled.has(record.id) || entrances.value?.has(record.id))
    .filter(
      record =>
        !query || record.name.toLowerCase().includes(query) || String(record.id) === query,
    )
    .sort((a, b) => a.name.localeCompare(b.name))
})

function instanceMeta(record: MapRecord): string {
  const type = record.instanceType === INSTANCE_TYPE_RAID ? 'raid' : 'dungeon'
  return t('mapEditor.instances.meta', {
    type: t(`mapEditor.instances.types.${type}`),
    map: record.id,
  })
}

/**
 * Stand-ins for the dungeons and raids built from WMOs only: without minimap
 * tiles the index doesn't list them, but the 3D view renders them from their
 * WDT's global WMO. The bounds span the whole grid so spawns stream around
 * the camera wherever it goes; terrain, water and ADT buildings find no ADT
 * there and stay empty.
 */
const wmoOnlyMaps = computed<MinimapMapInfo[]>(() => {
  const tiled = new Set(store.maps.map(info => info.mapId))
  return store.instanceMaps
    .filter(record => !tiled.has(record.id))
    .map(record => ({
      id: record.directory.toLowerCase(),
      name: record.directory,
      mapId: record.id,
      tileCount: 0,
      minX: 0,
      maxX: 63,
      minY: 0,
      maxY: 63,
    }))
})

/** What the views load for a DB map id: its minimap index entry, else its WMO-only stand-in. */
function mapInfoByMapId(map: number): MinimapMapInfo | null {
  return (
    store.maps.find(info => info.mapId === map) ??
    wmoOnlyMaps.value.find(info => info.mapId === map) ??
    null
  )
}

/** DB map id of the selected dungeon/raid, while that list is shown. */
const selectedInstanceMap = computed(() =>
  store.mapCategory === 'instances' ? store.lastInstanceMap : null,
)
const selectedEntrance = computed(() => {
  const map = selectedInstanceMap.value
  return map == null ? null : entrances.value?.get(map) ?? null
})

/**
 * Same as `selectZone`, with the entrance as origin. An instance without one
 * opens centered on its tiles (only tiled ones are listed without one).
 */
async function selectInstance(map: number) {
  store.lastInstanceMap = map
  const tiled = store.maps.some(info => info.mapId === map)
  const [byMap] = await Promise.all([instanceEntrances(), tiled ? null : instanceMapsLoad])
  // Another pick, or a category switch, landed while this was loading.
  if (store.mapCategory !== 'instances' || store.lastInstanceMap !== map) return
  const entrance = byMap.get(map)
  focusTarget.value = entrance ? { ...entrance } : null
  rowMarker.value = null
  store.lastMapId = mapInfoByMapId(map)?.id ?? ''
}

function onSelectInstance(record: MapRecord) {
  void selectInstance(record.id)
}

/** Shows the current category's last selection, or nothing when it has none. */
async function showCategorySelection() {
  if (selectedInstanceMap.value != null) {
    await selectInstance(selectedInstanceMap.value)
  } else if (selectedZone.value) {
    selectZone(selectedZone.value)
  } else {
    focusTarget.value = null
    rowMarker.value = null
    store.lastMapId = ''
  }
}

function onCategoryChange(category: MapCategory) {
  store.mapCategory = category
  listSearch.value = ''
  void showCategorySelection()
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
  // A WMO-only instance is only known once Map.dbc is read.
  if (!store.maps.some(m => m.mapId === mapId)) await instanceMapsLoad
  const info = mapInfoByMapId(mapId)
  if (!info) return
  // Continents belong to the zone list, anything else to the instance list.
  if (ZONES.some(zone => zone.map === mapId)) {
    store.mapCategory = 'world'
    store.lastZoneId = ''
  } else {
    store.mapCategory = 'instances'
    store.lastInstanceMap = mapId
  }
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

/**
 * Moving away from the focused spot dissolves the focus: the saved view
 * starts the other view again (the focus only carried its exact height).
 */
function dissolveFocus(at: WorldPosition) {
  const focus = focusTarget.value
  if (focus && Math.hypot(at.x - focus.x, at.y - focus.y) > SAME_SPOT_YARDS) {
    focusTarget.value = null
  }
}

function onCenter(center: WorldPosition, zoom: number) {
  const saved = savedView.value
  // The 3D look carries over; its height only holds on the spot it was taken
  // (toggled over from 3D without panning).
  const onSpot =
    saved != null && Math.hypot(center.x - saved.x, center.y - saved.y) <= SAME_SPOT_YARDS
  store.view = {
    ...saved,
    map: store.lastMapId,
    x: center.x,
    y: center.y,
    z: onSpot ? saved.z : undefined,
    zoom,
  }
  dissolveFocus(center)
}

function onCamera(view: SavedView) {
  // A 3D view torn down by a map switch reports its old map on the way out.
  if (view.map !== store.lastMapId) return
  store.view = { ...view, zoom: savedView.value?.zoom }
  dissolveFocus(view)
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
  () =>
    store.maps.find(m => m.id === store.lastMapId) ??
    wmoOnlyMaps.value.find(m => m.id === store.lastMapId) ??
    null,
)

/** DB map id of what is on screen — `game_tele.map` for a new teleport. */
const dbMapId = computed<number | null>(
  () => selectedMap.value?.mapId ?? selectedZone.value?.map ?? selectedInstanceMap.value,
)

/** Map the tables panel lists: the selected zone's, or the instance's. */
const tablesMap = computed(() => selectedZone.value?.map ?? selectedInstanceMap.value)

/** Why the stage has no map to show. */
const emptyMessage = computed(() => {
  if (loading.value) return t('mapEditor.states.loading')
  if (store.maps.length === 0) return t('mapEditor.states.noClient')
  if (store.mapCategory === 'instances') {
    return selectedInstanceMap.value != null
      ? t('mapEditor.states.instanceUnavailable', { map: selectedInstanceMap.value })
      : t('mapEditor.states.noInstance')
  }
  return selectedZone.value
    ? t('mapEditor.states.noMinimap', { map: selectedZone.value.map })
    : t('mapEditor.states.noZone')
})

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

/** Seed for the panel's + button: last picked spot, else the view, else the
 * zone's origin or the instance's entrance. */
function defaultTeleportPosition(): PickedPosition | null {
  if (picked.value) return picked.value
  if (savedView.value) return { x: savedView.value.x, y: savedView.value.y, z: null }
  const origin = selectedZone.value?.origin ?? selectedEntrance.value
  return origin ? { x: origin.x, y: origin.y, z: origin.z ?? null } : null
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

/**
 * Phase, quality and the minimap sit behind one settings button rather than
 * on the toolbar: they are set once in a while, and the toolbar floats over
 * the 3D view, where every control hides a piece of the world.
 */
const viewSettings = ref<InstanceType<typeof Popover> | null>(null)
const viewSettingsOpen = ref(false)

/** Spawn clicked in the 3D view; its repositioning drives the migration output. */
const selectedSpawn = ref<CreatureSpawnMarker | null>(null)
/** The selected spawn's panel takes the inspector over from the zone tables. */
const spawnInInspector = computed(() => activeViewMode.value === '3d' && selectedSpawn.value != null)
/** Move/rotate gizmo on the selected spawn; null until asked for (panel, G/R). */
const gizmoMode = ref<GizmoMode | null>(null)
/** Where the selected spawn was moved/turned to, its undo history and UPDATE. */
const spawnEdit = useSpawnTransform(selectedSpawn, trackSpawnTransform)
const { current: spawnTransform, canUndo: spawnCanUndo, migrationSql } = spawnEdit
const sqlCopied = ref(false)
const deleteError = ref('')

function onSelectSpawn(spawn: CreatureSpawnMarker | null) {
  selectedSpawn.value = spawn
  deleteError.value = ''
  gizmoMode.value = null
  spawnEdit.clear()
}

function onTransformSpawn(move: { guid: number } & SpawnTransform) {
  // The view only reports the selected spawn, but a late event from a drag
  // that outlived its selection must not land on the next one.
  if (move.guid !== selectedSpawn.value?.guid) return
  spawnEdit.apply(move)
}

function clearSelectedSpawn() {
  selectedSpawn.value = null
  gizmoMode.value = null
  spawnEdit.clear()
}

/** The panel's close button: deselect in the view too, so the ring goes with it. */
function closeSpawnPanel() {
  scene3d.value?.clearSelection()
  clearSelectedSpawn()
}

/** Deletes the selected spawn's row, then its model, then closes the panel. */
async function deleteSelectedSpawn() {
  const spawn = selectedSpawn.value
  if (!spawn) return
  try {
    await deleteCreatureSpawn(spawn.guid)
  } catch (e) {
    deleteError.value = String(e)
    return
  }
  trackSpawnDelete(spawn)
  scene3d.value?.removeSelectedSpawn()
  clearSelectedSpawn()
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

// ── 3D minimap ─────────────────────────────────────────────────────────
// The minimap sits with the view controls (top right, as in the client); the
// camera pose is read off the 3D view.
const scene3d = ref<InstanceType<typeof WorldScene3D> | null>(null)

function cameraPose() {
  return scene3d.value?.cameraPose() ?? null
}

/** Dot colours match what marks the same thing elsewhere: the 2D row dot,
 * the green selection ring under a spawn, the picked chip's pin. */
const MARKER_COLORS = {
  row: '#60a5fa',
  spawn: '#4ade80',
  picked: '#f59e0b',
}

const minimapMarkers = computed<MinimapMarker[]>(() => {
  const markers: MinimapMarker[] = []
  if (rowMarker.value) {
    markers.push({ x: rowMarker.value.x, y: rowMarker.value.y, color: MARKER_COLORS.row })
  }
  if (picked.value) {
    markers.push({ x: picked.value.x, y: picked.value.y, color: MARKER_COLORS.picked })
  }
  const spawn = selectedSpawn.value
  if (spawn) {
    // A moved spawn is drawn where it was dropped, like its model.
    const at = spawnTransform.value ?? { x: spawn.position_x, y: spawn.position_y }
    markers.push({ x: at.x, y: at.y, color: MARKER_COLORS.spawn })
  }
  return markers
})

watch(() => store.lastMapId, () => {
  cursor.value = null
  picked.value = null
  rowMarker.value = null
  clearSelectedSpawn()
})

// Leaving 3D invalidates any current spawn selection, and takes away the
// settings button the popover is anchored to.
watch(activeViewMode, () => {
  if (activeViewMode.value === '3d') return
  clearSelectedSpawn()
  viewSettings.value?.hide()
})

async function load() {
  const path = store.clientPath.trim()
  if (!path || loading.value) return
  loading.value = true
  error.value = ''
  try {
    store.maps = await ensureClientLoaded(path)
    // Not awaited: Map.dbc waits for the client's background open.
    instanceMapsLoad = loadInstanceMaps()
    if (savedView.value) {
      // Back where the view was left. A WMO-only instance only shows once
      // Map.dbc is read; hold the loading state until then.
      if (!store.maps.some(info => info.id === store.lastMapId)) await instanceMapsLoad
    } else {
      // Restore the persisted zone or instance: map + camera back at its origin.
      // Nothing selected yet: nothing to display (the map only follows the list).
      await showCategorySelection()
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
  void instanceEntrances()
  if (store.clientPath && store.maps.length === 0) {
    await load()
  }
  await applyPendingFocus()
})
</script>

<template>
  <div class="map-editor">
    <EntityWorkspace storageKey="mapEditor" class="editor-workspace">
      <!-- Curated zones (data/zones.ts) or the client's dungeons and raids;
           selecting one drives map + camera. Keyed so a switch also clears
           the list's own search box. -->
      <template #list>
        <MapCategorySelect :modelValue="store.mapCategory" @update:modelValue="onCategoryChange" />
        <EntityListPanel
          v-if="store.mapCategory === 'world'"
          key="world"
          :items="filteredZones"
          :idOf="zone => zone.id"
          :titleOf="zoneName"
          :metaOf="zone => t('mapEditor.zones.mapMeta', { map: zone.map })"
          :selectedId="store.lastZoneId || null"
          :showAdd="false"
          :searchPlaceholder="t('mapEditor.zones.searchPlaceholder')"
          @search="listSearch = $event"
          @select="selectZone"
        />
        <EntityListPanel
          v-else
          key="instances"
          :items="filteredInstances"
          :idOf="record => record.id"
          :titleOf="record => record.name"
          :metaOf="instanceMeta"
          :selectedId="store.lastInstanceMap"
          :loading="instancesLoading"
          :showAdd="false"
          :searchPlaceholder="t('mapEditor.instances.searchPlaceholder')"
          @search="listSearch = $event"
          @select="onSelectInstance"
        />
      </template>

      <template #editor>
        <p v-if="error" class="editor-error">{{ t('mapEditor.states.error', { message: error }) }}</p>

        <div class="map-stage">
          <WorldMap
            v-if="selectedMap && activeViewMode === '2d'"
            :map="selectedMap"
            :focus="focusTarget"
            :marker="rowMarker"
            :initialView="savedView"
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
            ref="scene3d"
            :key="`${selectedMap.id}:${store.renderQuality}`"
            :map="selectedMap"
            :initialPosition="focusTarget ?? savedView"
            :focus="focusTarget"
            :showSpawns="spawnsAvailable"
            :spawnPhase="store.spawnPhase"
            :quality="store.renderQuality"
            :collision="store.mapCategory === 'instances' && store.cameraCollision"
            v-model:gizmoMode="gizmoMode"
            :spawnTransform="spawnTransform"
            class="editor-map"
            @pick="picked = $event"
            @select-spawn="onSelectSpawn"
            @transform-spawn="onTransformSpawn"
            @undo-transform="spawnEdit.undo"
            @camera="onCamera"
          />
          <div v-else class="editor-empty">
            <i class="pi pi-map" style="font-size: 3rem; color: var(--text-placeholder)"></i>
            <p>{{ emptyMessage }}</p>
          </div>

          <!-- Right edge, as in the client: the minimap in the top corner and
               the view controls pushed to the bottom corner. -->
          <div v-if="selectedMap" class="stage-right">
            <!-- A WMO-only instance has no minimap tiles to draw. -->
            <SceneMinimap
              v-if="activeViewMode === '3d' && store.showMinimap && selectedMap.tileCount > 0"
              :key="selectedMap.id"
              :map="selectedMap"
              :pose="cameraPose"
              v-model:yards="store.minimapYards"
              :markers="minimapMarkers"
            />

            <div class="stage-controls">
              <!-- Instances are 3D only (see activeViewMode). -->
              <SelectButton
                v-if="store.mapCategory === 'world'"
                v-model="store.viewMode"
                :options="viewModes"
                optionLabel="label"
                optionValue="value"
                :allowEmpty="false"
                size="small"
              />
              <!-- A ToggleButton rather than a Button: it shares the 2D/3D
                   segments' sizing rules, so it lands square and at their
                   height, and it stays pressed while the popover is open. Its
                   own click flip is overridden by @show/@hide below. -->
              <ToggleButton
                v-if="activeViewMode === '3d'"
                :modelValue="viewSettingsOpen"
                size="small"
                class="stage-icon-toggle"
                aria-haspopup="dialog"
                :aria-expanded="viewSettingsOpen"
                :ariaLabel="t('mapEditor.viewSettings.title')"
                v-tooltip.top="t('mapEditor.viewSettings.title')"
                @click="viewSettings?.toggle($event)"
              >
                <i class="pi pi-cog"></i>
              </ToggleButton>
            </div>

            <Popover
              ref="viewSettings"
              @show="viewSettingsOpen = true"
              @hide="viewSettingsOpen = false"
            >
              <div class="view-settings">
                <p class="view-settings-title">{{ t('mapEditor.viewSettings.title') }}</p>
                <div v-if="spawnsAvailable" class="view-settings-field">
                  <label for="view-settings-phase" class="view-settings-label">
                    {{ t('mapEditor.spawns.phase.label') }}
                  </label>
                  <Select
                    v-model="store.spawnPhase"
                    inputId="view-settings-phase"
                    :options="phaseOptions"
                    optionLabel="label"
                    optionValue="value"
                    :placeholder="t('mapEditor.spawns.phase.all')"
                    class="view-settings-select"
                  />
                  <p class="view-settings-hint">{{ t('mapEditor.spawns.phase.hint') }}</p>
                </div>
                <div class="view-settings-field">
                  <label for="view-settings-quality" class="view-settings-label">
                    {{ t('mapEditor.quality.label') }}
                  </label>
                  <Select
                    v-model="store.renderQuality"
                    inputId="view-settings-quality"
                    :options="qualityOptions"
                    optionLabel="label"
                    optionValue="value"
                    class="view-settings-select"
                  />
                  <p class="view-settings-hint">{{ t('mapEditor.quality.hint') }}</p>
                </div>
                <div class="view-settings-row">
                  <label for="view-settings-minimap" class="view-settings-label">
                    {{ t('mapEditor.minimap.toggle') }}
                  </label>
                  <ToggleSwitch v-model="store.showMinimap" inputId="view-settings-minimap" />
                </div>
                <!-- Instances only: narrow interiors are where the camera
                     slips through walls; the open world is left free-flying. -->
                <div v-if="store.mapCategory === 'instances'" class="view-settings-field">
                  <div class="view-settings-row">
                    <label for="view-settings-collision" class="view-settings-label">
                      {{ t('mapEditor.collision.toggle') }}
                    </label>
                    <ToggleSwitch v-model="store.cameraCollision" inputId="view-settings-collision" />
                  </div>
                  <p class="view-settings-hint">{{ t('mapEditor.collision.hint') }}</p>
                </div>
              </div>
            </Popover>
          </div>

          <!-- Coordinates float bottom-left: live cursor position, then the
               right-clicked/picked point with its actions. -->
          <div v-if="(cursor && activeViewMode === '2d') || picked" class="stage-bottom-left">
            <span v-if="cursor && activeViewMode === '2d'" class="cursor-coords">
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

      <!-- Zone tables live off the DB map id alone, minimap or not. A spawn
           selected in 3D takes their place until it is deselected; the tables
           stay mounted meanwhile so their tab, search and rows come back
           as they were. -->
      <template v-if="tablesMap != null || spawnInInspector" #inspector>
        <SpawnInfoPanel
          v-if="spawnInInspector && selectedSpawn"
          :spawn="selectedSpawn"
          v-model:gizmoMode="gizmoMode"
          :transform="spawnTransform"
          :canUndo="spawnCanUndo"
          :migrationSql="migrationSql"
          :sqlCopied="sqlCopied"
          :deleteError="deleteError"
          @undo="spawnEdit.undo"
          @delete="deleteSelectedSpawn"
          @copy-sql="copyMigration"
          @close="closeSpawnPanel"
        />
        <ZoneTablesPanel
          v-if="tablesMap != null"
          v-show="!spawnInInspector"
          ref="tablesPanel"
          :map="tablesMap"
          :zoneId="selectedZone?.zoneId"
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

/* Flex sizing beats the workspace's own height: 100% inside this column. */
.editor-workspace {
  flex: 1;
  min-height: 0;
}

/* The settings toggle comes out square at the 2D/3D segments' exact height:
   its icon gets a box one line tall — the labels' line — and one line wide,
   and the padding around it is the same on all four sides. */
.stage-controls :deep(.stage-icon-toggle .p-togglebutton-content) {
  padding: 0.2rem;
}

.stage-icon-toggle .pi {
  line-height: inherit;
  width: 1lh;
  text-align: center;
}

/* Popover content: the popover itself is teleported to <body>, but slot
   content keeps this component's scope, so these rules still reach it. */
.view-settings {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  width: 17rem;
}

.view-settings-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-soft);
}

.view-settings-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.view-settings-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-soft);
}

.view-settings-select {
  width: 100%;
}

.view-settings-hint {
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--text-muted);
}

.view-settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
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

/* Right-edge column over the map: minimap at the top, view controls at the
   bottom. */
.stage-right {
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

.stage-right > * {
  pointer-events: auto;
}

/* stretch (not center) so the settings button matches the toggle's height by
   filling it, rather than both hardcoding a height and hoping they agree;
   nowrap because align-items: stretch silently no-ops in a wrapping flex
   container whose own cross size isn't otherwise fixed. */
.stage-controls {
  display: flex;
  align-items: stretch;
  gap: 0.5rem;
  flex-wrap: nowrap;
  justify-content: flex-end;
  /* Bottom of the column whether or not the minimap sits above. */
  margin-top: auto;
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

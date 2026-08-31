<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { FocusPosition, MinimapMapInfo, PickedPosition, WorldPosition } from '../types'
import { MIN_ZOOM, NATIVE_ZOOM, latLngToWorld, tileUrlTemplate, worldToLatLng } from '../service'

/**
 * Leaflet viewport over the `minimap://` tile pyramid.
 *
 * CRS.Simple with latLng = (-adtRow, adtCol): at zoom 8 (native) one 256px
 * tile is exactly one ADT cell, and leaflet's own {z}/{x}/{y} template maps
 * 1:1 onto the backend pyramid. North is up.
 */

const props = defineProps<{
  map: MinimapMapInfo
  /** Position to center on (zone origin, table row); assign a fresh object to re-center. */
  focus?: FocusPosition | null
  /** Selected table row position, shown as a dot (kept while panning). */
  marker?: FocusPosition | null
}>()

const emit = defineEmits<{
  (e: 'cursor', world: WorldPosition | null): void
  /** Fired after each pan/zoom with the view center (seeds the 3D view). */
  (e: 'center', world: WorldPosition): void
  /** Right-click: world position under the pointer (no height in 2D). */
  (e: 'pick', position: PickedPosition): void
  /** Right-click, with the raw event so the parent can anchor a menu on it. */
  (e: 'context', payload: { position: PickedPosition; event: MouseEvent }): void
}>()

/** Initial zoom floor: fitting a whole continent would sit at zoom 4 and make
 * the very first display render thousands of BLPs before anything shows. */
const INITIAL_MIN_ZOOM = 6

/** Zoom applied when centering on a focus position (close but not maxed). */
const FOCUS_ZOOM = NATIVE_ZOOM - 1

const container = ref<HTMLDivElement>()
let leafletMap: L.Map | null = null
let tileLayer: L.TileLayer | null = null
let markerLayer: L.CircleMarker | null = null

/** Blue dot: matches the 3D row marker, distinct from Leaflet's default pin
 * (whose image assets Vite doesn't bundle anyway). */
const MARKER_STYLE: L.CircleMarkerOptions = {
  radius: 7,
  color: '#60a5fa',
  weight: 2,
  fillColor: '#60a5fa',
  fillOpacity: 0.35,
}

function applyMarker(position: FocusPosition | null | undefined) {
  if (!leafletMap) return
  if (!position) {
    markerLayer?.remove()
    markerLayer = null
    return
  }
  const latlng = worldToLatLng(position)
  if (markerLayer) markerLayer.setLatLng(latlng)
  else markerLayer = L.circleMarker(latlng, MARKER_STYLE).addTo(leafletMap)
}

function tileBounds(info: MinimapMapInfo): L.LatLngBounds {
  // Cells [minX..maxX]×[minY..maxY] — +1 because a cell spans one unit.
  return L.latLngBounds(
    [-(info.maxY + 1), info.minX],
    [-info.minY, info.maxX + 1],
  )
}

function showMap(info: MinimapMapInfo) {
  if (!leafletMap) return
  tileLayer?.remove()

  const bounds = tileBounds(info)
  tileLayer = L.tileLayer(tileUrlTemplate(info.id), {
    minZoom: MIN_ZOOM,
    maxZoom: NATIVE_ZOOM + 2, // upscaled beyond native for close inspection
    minNativeZoom: MIN_ZOOM,
    maxNativeZoom: NATIVE_ZOOM,
    noWrap: true,
    bounds,
    keepBuffer: 2,
  }).addTo(leafletMap)

  leafletMap.setMaxBounds(bounds.pad(0.5))
  if (props.focus) {
    leafletMap.setView(worldToLatLng(props.focus), FOCUS_ZOOM)
    return
  }
  leafletMap.fitBounds(bounds)
  if (leafletMap.getZoom() < INITIAL_MIN_ZOOM) {
    leafletMap.setView(bounds.getCenter(), INITIAL_MIN_ZOOM)
  }
}

onMounted(() => {
  if (!container.value) return
  leafletMap = L.map(container.value, {
    crs: L.CRS.Simple,
    attributionControl: false,
    minZoom: MIN_ZOOM,
    maxZoom: NATIVE_ZOOM + 2,
    zoomControl: true,
    maxBoundsViscosity: 0.8,
  })
  leafletMap.on('mousemove', (event: L.LeafletMouseEvent) => {
    emit('cursor', latLngToWorld(event.latlng))
  })
  leafletMap.on('mouseout', () => emit('cursor', null))
  leafletMap.on('moveend', () => {
    if (leafletMap) emit('center', latLngToWorld(leafletMap.getCenter()))
  })
  // Leaflet swallows the browser menu for us once this event is listened to.
  leafletMap.on('contextmenu', (event: L.LeafletMouseEvent) => {
    const position: PickedPosition = { ...latLngToWorld(event.latlng), z: null }
    emit('pick', position)
    emit('context', { position, event: event.originalEvent })
  })
  showMap(props.map)
  applyMarker(props.marker)
})

watch(
  () => props.map,
  info => showMap(info),
)

watch(
  () => props.focus,
  focus => {
    if (focus && leafletMap) leafletMap.setView(worldToLatLng(focus), FOCUS_ZOOM)
  },
)

watch(
  () => props.marker,
  marker => applyMarker(marker),
)

onBeforeUnmount(() => {
  leafletMap?.remove()
  leafletMap = null
  tileLayer = null
  markerLayer = null
})
</script>

<template>
  <div ref="container" class="world-map"></div>
</template>

<style scoped>
.world-map {
  width: 100%;
  height: 100%;
  min-height: 0;
  border-radius: 0.75rem;
  border: 1px solid var(--border-input-soft);
  /* Ocean cells have no minimap tile: show a deep-sea backdrop instead. */
  background: #060d1f;
}

/* Leaflet's default controls are white; align them with the slate theme.
 * The map DOM is created by leaflet at runtime, hence :deep(). */
.world-map :deep(.leaflet-control-zoom a) {
  background: var(--surface-elevated);
  color: var(--text);
  border-color: var(--surface-strong);
}

.world-map :deep(.leaflet-control-zoom a:hover) {
  background: var(--border-input);
}
</style>

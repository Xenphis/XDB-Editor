<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import type { CameraPose, MinimapMapInfo, MinimapMarker } from '../types'
import { ADT_GRID_CENTER, MIN_ZOOM, NATIVE_ZOOM, TILE_YARDS, tileUrl } from '../service'

/**
 * In-game style minimap for the 3D view: a disc of the client's own minimap
 * textures centred on the camera, with the heading arrow, the camera's view
 * cone and the editor's markers on top.
 *
 * Tiles come from the same `minimap://` pyramid as the 2D view, drawn on a 2D
 * canvas rather than through Leaflet: the map has to follow the camera every
 * frame, which is one translation on a canvas but a fight with Leaflet's own
 * panning and zoom animations. The pyramid level is picked so one
 * tile pixel is about one screen pixel, which keeps the wide zooms to a
 * handful of tiles instead of dozens of native ones.
 *
 * The camera pose is polled from a frame loop of its own rather than pushed as
 * a prop: it changes every frame while flying, and a prop would re-render the
 * page each time. The disc is only redrawn when the pose, a tile, the zoom or
 * a marker actually changed.
 *
 * Orientation: the disc is always north-up, like the 2D view. World +X is
 * north and +Y west, so a world offset (dx, dy) lands at screen (-dy, -dx),
 * and a heading `yaw` (counter-clockwise from north) is drawn `yaw` radians
 * anticlockwise from up.
 */

const props = defineProps<{
  map: MinimapMapInfo
  /** Polled every frame; null while the 3D view has not placed its camera. */
  pose: () => Readonly<CameraPose> | null
  /** Diameter shown, in yards; snapped to the nearest zoom level. */
  yards: number
  markers: MinimapMarker[]
}>()

const emit = defineEmits<{
  (e: 'update:yards', value: number): void
}>()

const { t } = useI18n()

/** Disc diameter in CSS pixels; the client's own minimap is 140. */
const SIZE = 132
const RADIUS = SIZE / 2

/**
 * Diameters the zoom steps through, widest first. The last six are the
 * client's outdoor minimap zooms (466⅔ down to 133⅓ yards); the wider three
 * are the editor's own, for a fly-cam that crosses an ADT tile a second at
 * full boost.
 */
const ZOOM_LEVELS = [3200, 1600, 800, 1400 / 3, 400, 1000 / 3, 800 / 3, 200, 400 / 3]

/** Side of a pyramid tile in pixels (TILE_SIZE in minimap.rs). */
const TILE_PX = 256
/**
 * Decoded tiles kept around. A disc needs four to nine at any zoom, so this
 * covers a good stretch of flying back and forth; at 256 KB a decoded tile
 * it stays around 16 MB.
 */
const MAX_CACHED_TILES = 64
/** Ancestor levels tried while a tile loads, so zooming never flashes empty. */
const FALLBACK_LEVELS = 2
/**
 * Tiles are drawn this much oversize, in CSS pixels. Adjacent tiles at
 * fractional positions otherwise leave a hairline of backdrop
 * between them where both edges are antialiased.
 */
const SEAM_OVERLAP = 1
/** Device pixel ratio ceiling, as in the 3D view: a 3x canvas buys nothing here. */
const MAX_PIXEL_RATIO = 2
/** How often the coordinate readout refreshes while the camera moves. */
const COORDS_REFRESH_MS = 100
/** Wheel travel per zoom step; trackpads send many small deltas per gesture. */
const WHEEL_STEP = 60
/** Rim-clamped markers sit this far inside the edge. */
const MARKER_INSET = 5

/** Cells with no minimap (open sea): the same backdrop as the 2D view. */
const BACKDROP = '#060d1f'
const ARROW_FILL = '#fde047'
const OUTLINE = 'rgba(2, 6, 23, 0.85)'

const canvas = ref<HTMLCanvasElement>()
const coords = ref('')
let context: CanvasRenderingContext2D | null = null
let frame = 0
/** Something other than the pose changed: redraw on the next frame. */
let dirty = true
let lastPose: CameraPose | null = null
let coordsAt = 0
let wheelTravel = 0

// ── Zoom ────────────────────────────────────────────────────────────────

const levelIndex = computed(() => {
  let best = 0
  let bestGap = Infinity
  ZOOM_LEVELS.forEach((level, index) => {
    const gap = Math.abs(level - props.yards)
    if (gap < bestGap) {
      best = index
      bestGap = gap
    }
  })
  return best
})
/** Diameter actually drawn, in yards. */
const shownYards = computed(() => ZOOM_LEVELS[levelIndex.value] ?? props.yards)
const canZoomIn = computed(() => levelIndex.value < ZOOM_LEVELS.length - 1)
const canZoomOut = computed(() => levelIndex.value > 0)

/** Positive steps zoom in (a narrower diameter). */
function zoomBy(step: number) {
  const index = Math.min(Math.max(levelIndex.value + step, 0), ZOOM_LEVELS.length - 1)
  const yards = ZOOM_LEVELS[index]
  if (index !== levelIndex.value && yards !== undefined) emit('update:yards', yards)
}

function onWheel(event: WheelEvent) {
  wheelTravel += event.deltaMode === WheelEvent.DOM_DELTA_LINE ? event.deltaY * 16 : event.deltaY
  if (Math.abs(wheelTravel) < WHEEL_STEP) return
  // Wheel up (negative delta) zooms in, as on the 2D map.
  zoomBy(wheelTravel < 0 ? 1 : -1)
  wheelTravel = 0
}

watch([levelIndex, () => props.markers], () => (dirty = true))

// ── Tiles ───────────────────────────────────────────────────────────────

interface TileEntry {
  image: HTMLImageElement
  /** `missing` is a cell with no minimap (404) as well as a failed request. */
  state: 'loading' | 'ready' | 'missing'
}

/** Insertion order doubles as recency: every lookup moves a tile to the end. */
const tiles = new Map<string, TileEntry>()

/** A tile already in the cache, marked as just used. */
function cachedTile(z: number, x: number, y: number): TileEntry | undefined {
  const key = `${z}/${x}/${y}`
  const cached = tiles.get(key)
  if (cached) {
    tiles.delete(key)
    tiles.set(key, cached)
  }
  return cached
}

/** A tile from the cache, or one that starts loading now. */
function requestTile(z: number, x: number, y: number): TileEntry {
  const cached = cachedTile(z, x, y)
  if (cached) return cached

  const entry: TileEntry = { image: new Image(), state: 'loading' }
  entry.image.onload = () => {
    entry.state = 'ready'
    dirty = true
  }
  entry.image.onerror = () => {
    entry.state = 'missing'
    dirty = true
  }
  entry.image.src = tileUrl(props.map.id, z, x, y)
  tiles.set(`${z}/${x}/${y}`, entry)
  for (const oldest of tiles.keys()) {
    if (tiles.size <= MAX_CACHED_TILES) break
    tiles.delete(oldest)
  }
  return entry
}

/**
 * Coarsest pyramid level still at least as sharp as the screen. Native tiles
 * (zoom 8) hold 256 px per ADT cell and every level up halves that.
 */
function tileZoom(devicePxPerCell: number): number {
  const z = NATIVE_ZOOM + Math.ceil(Math.log2(devicePxPerCell / TILE_PX))
  return Math.min(NATIVE_ZOOM, Math.max(MIN_ZOOM, z))
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  z: number,
  x: number,
  y: number,
  left: number,
  top: number,
  size: number,
) {
  const entry = requestTile(z, x, y)
  const drawn = size + SEAM_OVERLAP
  if (entry.state === 'ready') {
    ctx.drawImage(entry.image, left, top, drawn, drawn)
    return
  }
  if (entry.state === 'missing') return
  // Still loading: stretch the matching quarter (or sixteenth) of an ancestor
  // that is already decoded over the gap.
  for (let up = 1; up <= FALLBACK_LEVELS && z - up >= MIN_ZOOM; up++) {
    const parent = cachedTile(z - up, x >> up, y >> up)
    if (parent?.state !== 'ready') continue
    const part = parent.image.naturalWidth >> up
    const mask = (1 << up) - 1
    ctx.drawImage(parent.image, (x & mask) * part, (y & mask) * part, part, part, left, top, drawn, drawn)
    return
  }
}

/** The minimap tiles under the disc, with the origin at its centre. */
function drawTiles(ctx: CanvasRenderingContext2D, pose: CameraPose, pxPerYard: number, dpr: number) {
  const pxPerCell = pxPerYard * TILE_YARDS
  const z = tileZoom(pxPerCell * dpr)
  const shift = NATIVE_ZOOM - z
  /** ADT cells per tile at this level. */
  const span = 1 << shift
  // Camera position in fractional ADT cells: col grows east, row south.
  const col = ADT_GRID_CENTER - pose.y / TILE_YARDS
  const row = ADT_GRID_CENTER - pose.x / TILE_YARDS
  /** ADT cells from the centre of the disc to its rim. */
  const reach = RADIUS / pxPerCell
  const minX = Math.max(Math.floor((col - reach) / span), props.map.minX >> shift)
  const maxX = Math.min(Math.floor((col + reach) / span), props.map.maxX >> shift)
  const minY = Math.max(Math.floor((row - reach) / span), props.map.minY >> shift)
  const maxY = Math.min(Math.floor((row + reach) / span), props.map.maxY >> shift)
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      drawTile(
        ctx,
        z,
        x,
        y,
        (x * span - col) * pxPerCell,
        (y * span - row) * pxPerCell,
        span * pxPerCell,
      )
    }
  }
}

// ── Overlays ────────────────────────────────────────────────────────────

/** The camera's horizontal field of view, fading out toward the rim. */
function drawViewCone(ctx: CanvasRenderingContext2D, fov: number) {
  const half = fov / 2
  const up = -Math.PI / 2
  const shade = ctx.createRadialGradient(0, 0, 0, 0, 0, RADIUS)
  shade.addColorStop(0, 'rgba(255, 255, 255, 0.3)')
  shade.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = shade
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.arc(0, 0, RADIUS, up - half, up + half)
  ctx.closePath()
  ctx.fill()
}

/** Markers past the rim are pinned to it, smaller, so they still give a bearing. */
function drawMarkers(ctx: CanvasRenderingContext2D, pose: CameraPose, pxPerYard: number) {
  const edge = RADIUS - MARKER_INSET
  ctx.lineWidth = 1.5
  ctx.strokeStyle = OUTLINE
  for (const marker of props.markers) {
    let sx = -(marker.y - pose.y) * pxPerYard
    let sy = -(marker.x - pose.x) * pxPerYard
    const distance = Math.hypot(sx, sy)
    const outside = distance > edge
    if (outside) {
      sx *= edge / distance
      sy *= edge / distance
    }
    ctx.globalAlpha = outside ? 0.75 : 1
    ctx.fillStyle = marker.color
    ctx.beginPath()
    ctx.arc(sx, sy, outside ? 2.5 : 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

/** The client's arrowhead, pointing up in the frame it is drawn in. */
function drawArrow(ctx: CanvasRenderingContext2D) {
  ctx.beginPath()
  ctx.moveTo(0, -8)
  ctx.lineTo(5.5, 6)
  ctx.lineTo(0, 3)
  ctx.lineTo(-5.5, 6)
  ctx.closePath()
  ctx.fillStyle = ARROW_FILL
  ctx.fill()
  ctx.lineWidth = 1.5
  ctx.strokeStyle = OUTLINE
  ctx.stroke()
}

/** Darkens the edge so the disc reads as a lens rather than a cut-out. */
function drawRimShade(ctx: CanvasRenderingContext2D) {
  const shade = ctx.createRadialGradient(RADIUS, RADIUS, RADIUS * 0.72, RADIUS, RADIUS, RADIUS)
  shade.addColorStop(0, 'rgba(2, 6, 23, 0)')
  shade.addColorStop(1, 'rgba(2, 6, 23, 0.45)')
  ctx.fillStyle = shade
  ctx.beginPath()
  ctx.arc(RADIUS, RADIUS, RADIUS, 0, Math.PI * 2)
  ctx.fill()
}

/** "N" at the top of the rim. */
function drawNorth(ctx: CanvasRenderingContext2D) {
  const x = RADIUS
  const y = 8
  ctx.font = '700 10px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineWidth = 3
  ctx.strokeStyle = OUTLINE
  ctx.strokeText('N', x, y)
  ctx.fillStyle = '#f8fafc'
  ctx.fillText('N', x, y)
}

function draw(pose: CameraPose | null) {
  const el = canvas.value
  if (!el || !context) return
  const ctx = context
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO)
  const backing = Math.round(SIZE * dpr)
  if (el.width !== backing) {
    el.width = backing
    el.height = backing
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, SIZE, SIZE)

  ctx.save()
  ctx.beginPath()
  ctx.arc(RADIUS, RADIUS, RADIUS, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = BACKDROP
  ctx.fillRect(0, 0, SIZE, SIZE)
  if (pose) {
    const pxPerYard = SIZE / shownYards.value
    ctx.translate(RADIUS, RADIUS)
    ctx.imageSmoothingQuality = 'high'
    drawTiles(ctx, pose, pxPerYard, dpr)
    // Canvas angles run clockwise and the heading anticlockwise from north,
    // so turning by -yaw makes "up" the camera's heading.
    ctx.save()
    ctx.rotate(-pose.yaw)
    drawViewCone(ctx, pose.fov)
    ctx.restore()
    drawMarkers(ctx, pose, pxPerYard)
    ctx.rotate(-pose.yaw)
    drawArrow(ctx)
  }
  ctx.restore()

  drawRimShade(ctx)
  drawNorth(ctx)
}

// ── Frame loop ──────────────────────────────────────────────────────────

function samePose(a: CameraPose | null, b: Readonly<CameraPose> | null): boolean {
  if (!a || !b) return a === b
  return a.x === b.x && a.y === b.y && a.yaw === b.yaw && a.fov === b.fov
}

function tick(now: number) {
  frame = requestAnimationFrame(tick)
  const pose = props.pose()
  // Throttled but unconditional, so the readout settles on the final
  // position once the camera stops rather than one refresh short of it.
  if (pose && now - coordsAt >= COORDS_REFRESH_MS) {
    coordsAt = now
    const text = `X ${pose.x.toFixed(1)} · Y ${pose.y.toFixed(1)}`
    if (text !== coords.value) coords.value = text
  }
  if (!dirty && samePose(lastPose, pose)) return
  dirty = false
  // A copy: the view keeps writing into the object it hands out.
  lastPose = pose ? { ...pose } : null
  draw(lastPose)
}

onMounted(() => {
  context = canvas.value?.getContext('2d') ?? null
  frame = requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  for (const entry of tiles.values()) {
    entry.image.onload = null
    entry.image.onerror = null
  }
  tiles.clear()
  context = null
})

/** Rim position for a control, `degrees` clockwise from the top. */
function rimStyle(degrees: number) {
  const angle = (degrees * Math.PI) / 180
  return {
    left: `${RADIUS + RADIUS * Math.sin(angle)}px`,
    top: `${RADIUS - RADIUS * Math.cos(angle)}px`,
  }
}
</script>

<template>
  <div class="scene-minimap" :style="{ '--minimap-size': `${SIZE}px` }">
    <div class="minimap-disc" @wheel.prevent="onWheel">
      <canvas ref="canvas" class="minimap-canvas"></canvas>

      <!-- Zoom sits on the rim where the client puts it, bottom right.
           mousedown.prevent keeps the focus off the buttons, so the fly-cam
           keys keep working after a click. -->
      <Button
        icon="pi pi-plus"
        rounded
        severity="secondary"
        class="minimap-button"
        :style="rimStyle(118)"
        :disabled="!canZoomIn"
        :aria-label="t('mapEditor.minimap.zoomIn')"
        v-tooltip.left="t('mapEditor.minimap.zoomIn')"
        @mousedown.prevent
        @click="zoomBy(1)"
      />
      <Button
        icon="pi pi-minus"
        rounded
        severity="secondary"
        class="minimap-button"
        :style="rimStyle(146)"
        :disabled="!canZoomOut"
        :aria-label="t('mapEditor.minimap.zoomOut')"
        v-tooltip.left="t('mapEditor.minimap.zoomOut')"
        @mousedown.prevent
        @click="zoomBy(-1)"
      />
    </div>
    <!-- Refreshed ten times a second while flying: hidden from assistive tech,
         like the 3D view's FPS readout. -->
    <div class="minimap-coords" :class="{ 'is-empty': !coords }" aria-hidden="true">
      {{ coords || '\u00a0' }}
    </div>
  </div>
</template>

<style scoped>
/* The 3D scene behind is always dark whatever the app theme, so the frame
   uses fixed slate tones like the view's other overlays (spawn panel, FPS). */
.scene-minimap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
  /* The ring is a box-shadow drawn outside the disc; keep it inside the
     column so the disc lines up with the controls above. */
  padding: 3px;
}

.minimap-disc {
  position: relative;
  width: var(--minimap-size);
  height: var(--minimap-size);
  border-radius: 50%;
  box-shadow:
    0 0 0 2px rgba(51, 65, 85, 0.95),
    0 0 0 3px color-mix(in srgb, var(--accent) 45%, transparent),
    0 6px 18px rgba(0, 0, 0, 0.55);
}

.minimap-canvas {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.minimap-button {
  position: absolute;
  transform: translate(-50%, -50%);
}

.minimap-button.p-button.p-button-icon-only {
  width: 1.3rem;
  height: 1.3rem;
  padding: 0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
}

.minimap-button.p-button-secondary {
  background: rgba(15, 23, 42, 0.92);
  border-color: rgba(71, 85, 105, 0.9);
  color: #e2e8f0;
}

.minimap-button.p-button-secondary:not(:disabled):hover {
  background: rgba(30, 41, 59, 0.95);
}

.minimap-button :deep(.p-button-icon) {
  font-size: 0.55rem;
}

.minimap-coords {
  padding: 0.1rem 0.55rem;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.82);
  border: 1px solid rgba(51, 65, 85, 0.9);
  color: #cbd5e1;
  font-size: 0.65rem;
  /* Fixed-width digits: the readout changes while flying and would jitter. */
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  pointer-events: none;
}

/* Hidden rather than removed until the first pose, so nothing below it
   shifts when the readout appears. */
.minimap-coords.is-empty {
  visibility: hidden;
}
</style>

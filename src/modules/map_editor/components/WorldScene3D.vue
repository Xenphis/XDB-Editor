<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { MapManager, scaleFadeDist } from '@wowserhq/scene'
import type {
  CreatureSpawnMarker,
  FocusPosition,
  MinimapMapInfo,
  PickedPosition,
  RenderQuality,
} from '../types'
import { ADT_GRID_CENTER, MPQ_ASSET_BASE_URL, TILE_YARDS, worldToTile } from '../service'
import { LiquidManager } from './LiquidManager'
import { LiquidSurfaces } from './LiquidSurfaces'
import { WmoManager } from './WmoManager'
import { CreatureSpawnManager } from './CreatureSpawnManager'
import { InstallQueue } from './InstallQueue'
import { SkyDome } from './SkyDome'
import { SelectionRing } from './SelectionRing'
import { SceneAssets } from '@core/wow/SceneAssets'

/**
 * 3D world view built on @wowserhq/scene: terrain, doodads (M2), lighting,
 * fog and day/night cycle for 3.3.5 data, streamed from the client MPQs over
 * the `mpq://` scheme. WMO buildings are not rendered by the library (yet),
 * so cities and instances show terrain only.
 *
 * The scene uses WoW's own coordinate system (X north, Y west, Z up), which
 * is why the camera up axis is +Z.
 *
 * Controls: left-drag pans along the ground, right-drag looks around (FPS
 * style: the camera rotates in place, it never translates), wheel flies
 * forward/back; fly-cam on the keyboard (physical WASD — ZQSD on AZERTY — or
 * arrows, Space/C for up/down, Shift for speed); a right-click without drag
 * reports the world position under the pointer to the parent.
 *
 * The camera is driven directly (yaw/pitch state below) instead of through
 * @wowserhq/scene's MapControls: those orbit a pivot re-derived 30 yd ahead
 * of the camera every frame, so pitching swung the camera through a vertical
 * arc — right-drag felt like the camera moving up/down rather than rotating.
 *
 * The parent keys this component on the map id: switching maps remounts it,
 * which keeps the MapManager lifecycle trivial (one per mount).
 */

const props = defineProps<{
  map: MinimapMapInfo
  /** Starting spot (e.g. the 2D view's center); defaults to the map center. */
  initialPosition: FocusPosition | null
  /** Fly-to target (zone origin, table row); assign a fresh object to re-trigger. */
  focus: FocusPosition | null
  /** Stream & show creature spawns as models around the camera. */
  showSpawns: boolean
  /** Only stream spawns visible in this phase; null streams every phase. */
  spawnPhase: number | null
  /** When true, the next terrain right-click relocates the selected spawn. */
  moveArmed: boolean
  /** How much to ask of the GPU; read once, the parent remounts on change. */
  quality: RenderQuality
}>()

const emit = defineEmits<{
  (e: 'pick', position: PickedPosition): void
  /** A spawn model was clicked (null when clicking away deselects). */
  (e: 'select-spawn', spawn: CreatureSpawnMarker | null): void
  /** The selected spawn was dragged to a new world position (for the migration). */
  (e: 'move-spawn', move: { guid: number; x: number; y: number; z: number }): void
}>()

/** Height the camera starts at before the terrain under it is known. */
const FALLBACK_HEIGHT = 200
/** Camera height above a known ground/target position. */
const EYE_HEIGHT = 3
/** How long to keep probing for ground under the start position. */
const GROUND_PROBE_INTERVAL_MS = 400
const GROUND_PROBE_ATTEMPTS = 50

/** Fly-cam speed in yards per second; Shift multiplies it. */
const MOVE_SPEED = 100
const MOVE_BOOST = 5
/** Right-button press+release within this many pixels counts as a click. */
const CLICK_SLOP_PX = 5
/** Right-drag look sensitivity, radians per pixel. */
const LOOK_SPEED = 0.005
/** Pitch stays short of straight up/down so the +Z up vector never flips. */
const MAX_PITCH = Math.PI / 2 - 0.01
/** Left-drag pan tracks the ground at this distance ahead of the camera. */
const PAN_DISTANCE = 30
/** Wheel fly speed, yards per wheel deltaY unit (~4 yd per notch). */
const WHEEL_SPEED = 0.04

/**
 * Device pixel ratio ceiling. A 2x display quadruples the fragments shaded,
 * and the terrain is fill-bound well before it is detail-bound, so the extra
 * pixels cost far more than they show.
 */
const MAX_PIXEL_RATIO = 1.5
/** Pixel ratio while the camera moves; motion hides the softer edges. */
const MOVING_PIXEL_RATIO = 1
/** How long the camera must sit still before full resolution comes back. */
const RESOLUTION_SETTLE_MS = 180

/**
 * What each quality preset asks of the renderer.
 *
 * `drawDistance` is the one that moves the needle, and it is not the same
 * thing as `viewDistance`. @wowserhq/scene builds one mesh, one material and
 * one 64×64 splat texture per MCNK chunk — up to 256 draw calls per ADT tile,
 * never merged, never instanced — so what costs draw calls is the *area* of
 * terrain inside the frustum, and the far plane is what bounds that.
 *
 * `viewDistance` only bounds what is *streamed*: measured on a dense zone,
 * cutting it from 1277 to 600 yards barely moved the draw count, because the
 * zone's own fog already ended well inside 600 and the far plane followed the
 * fog, not the streaming radius. It still governs memory and streaming work,
 * which is why it is here — but it is not the frame-rate lever.
 *
 * `drawDistance` is that lever: it pulls the fog, and with it the far plane,
 * in below whatever the zone asks for. `null` leaves the zone's own fog alone,
 * which is what the view has always done.
 *
 * `antialias` rides along because MSAA is the other cost that scales with the
 * window rather than with the scene. Turning it off is not free of visual
 * consequence: the library's `ModelMaterial` sets `alphaToCoverage` on
 * alpha-key M2 materials, which does nothing without MSAA, so foliage and
 * fence cutouts go hard-edged at `low`.
 *
 * The other two bound the M2 models, which were most of the draw calls once
 * the terrain was in hand: measured in Stormwind, creatures were four fifths
 * of a 5 300-call frame and the WMOs' furniture most of the rest.
 * `fadeScale` is the scale of @wowserhq/scene's doodad fade table: the
 * distance each size of model stays visible at, terrain doodads and WMO
 * furniture alike (the library hard-codes 1.5). `spawnDistance` caps creatures
 * on top of it; left to the table, an NPC stayed drawn out to 300 yards.
 *
 * Read once at mount — `MapManager` only looks at `viewDistance` in its
 * constructor, and the renderer's MSAA is fixed at context creation — so the
 * parent keys this component on the quality and remounts when it changes.
 */
const QUALITY_PRESETS: Record<
  RenderQuality,
  {
    viewDistance: number
    drawDistance: number | null
    antialias: boolean
    fadeScale: number
    spawnDistance: number
  }
> = {
  low: {
    viewDistance: 600,
    drawDistance: 250,
    antialias: false,
    fadeScale: 0.75,
    spawnDistance: 80,
  },
  medium: {
    viewDistance: 900,
    drawDistance: 400,
    antialias: true,
    fadeScale: 1,
    spawnDistance: 120,
  },
  // The library's own view distance, fog and fade scale.
  high: {
    viewDistance: 1277,
    drawDistance: null,
    antialias: true,
    fadeScale: 1.5,
    spawnDistance: 200,
  },
}

/**
 * Millisecond budget the install queue gets each frame. Small enough to fit
 * inside a 60 Hz frame next to the render, large enough that a dense tile
 * lands over a handful of frames rather than a hundred.
 */
const INSTALL_BUDGET_MS = 2

/**
 * How far ahead of the camera tiles are prefetched, in seconds of travel.
 * Roughly what a tile costs to fetch, parse and build, so the ring ahead is
 * requested about when it starts being needed rather than once it is in view.
 */
const PREFETCH_SECONDS = 1.5
/**
 * Cap on that lead. At full boost the camera crosses a tile a second, and a
 * ring requested two tiles out would fall behind the camera before it landed.
 */
const MAX_PREFETCH_YARDS = TILE_YARDS
/** Time constant of the velocity smoothing feeding the lead, in seconds. */
const VELOCITY_TAU = 0.25

/** How far you see with your head under a liquid surface. */
const UNDERWATER_FOG_YARDS = 40
/** The colour that fog takes on under each liquid. */
const UNDERWATER_TINT: Record<string, number> = {
  water: 0x1e4f73,
  ocean: 0x16405f,
  magma: 0x8c2c05,
  slime: 0x3f6b1e,
}
const UNDERWATER_TINT_DEFAULT = 0x1e4f73

/**
 * How often the frame-rate readout refreshes. Writing a reactive ref every
 * frame would re-render this component 60 times a second just to measure it,
 * so the counter accumulates locally and publishes once per window — long
 * enough to cost nothing, short enough to react while flying.
 */
const FPS_SAMPLE_MS = 500

/**
 * Time of day the world is lit at, in half-minutes since midnight — the unit
 * `MapLight.timeOverride` takes, where 2880 is a full day. 1440 is noon.
 *
 * Left alone, @wowserhq/scene reads the wall clock, so the same zone rendered
 * green at lunchtime and near-black at dusk. An editor should look the same
 * whenever it is opened. It also has to: the M2 models follow the map light,
 * but the liquids are unlit `MeshBasicMaterial` and the WMO surfaces run off a
 * fixed sun, so a darkened terrain left the water and the buildings glowing on
 * top of it.
 *
 * Reaching the map light needs the `mapLight` getter added in
 * `patches/@wowserhq__scene@0.32.0.patch`; the library keeps it private.
 */
const EDITOR_TIME_OF_DAY = 1440

/** Physical key codes, so ZQSD works on AZERTY without a layout table. */
const KEY_FORWARD = ['KeyW', 'ArrowUp']
const KEY_BACK = ['KeyS', 'ArrowDown']
const KEY_LEFT = ['KeyA', 'ArrowLeft']
const KEY_RIGHT = ['KeyD', 'ArrowRight']
const KEY_UP = ['Space', 'PageUp']
const KEY_DOWN = ['KeyC', 'PageDown']
/** Held alongside a direction to fly at `MOVE_BOOST` times the speed. */
const KEY_BOOST = ['ShiftLeft', 'ShiftRight']
const MOVE_KEYS = new Set([
  ...KEY_FORWARD, ...KEY_BACK, ...KEY_LEFT, ...KEY_RIGHT, ...KEY_UP, ...KEY_DOWN,
])
/** Every key the fly-cam tracks. The boost modifier moves nothing by itself,
 * but it has to reach `pressed` for the speed test to ever see it held. */
const TRACKED_KEYS = new Set([...MOVE_KEYS, ...KEY_BOOST])

/**
 * Layer toggles, for attributing the draw-call count.
 *
 * `renderer.info.render.calls` is one number for the whole scene, which says
 * nothing about which layer is spending it — and the layers are wildly uneven:
 * @wowserhq/scene draws terrain as one mesh per MCNK chunk, up to 256 per ADT
 * tile, where a WMO is a handful of batches and a creature one or two. Hiding a
 * root and reading the difference attributes it exactly, with no measurement
 * machinery and no second render pass.
 *
 * Physical key codes, like the movement keys, so they land the same on AZERTY.
 */
const LAYER_KEYS: Record<string, 'terrain' | 'buildings' | 'water' | 'spawns'> = {
  Digit1: 'terrain',
  Digit2: 'buildings',
  Digit3: 'water',
  Digit4: 'spawns',
}

const container = ref<HTMLDivElement>()
const grounded = ref(false)

/** Frames per second over the last sample window. */
const fps = ref(0)
/**
 * Longest frame in that same window, in milliseconds. A single 40 ms hitch as
 * a tile lands averages away in the frame rate but stands out here, which is
 * the number that matters for how the navigation actually feels.
 */
const worstFrameMs = ref(0)
/**
 * Draw calls in the last rendered frame. Reads directly off the renderer, so
 * it is the number to watch when judging whether culling is doing its job.
 */
const drawCalls = ref(0)
/**
 * Triangles in the last rendered frame, in thousands. Read next to the draw
 * calls because it is the ratio that identifies the bottleneck: a few hundred
 * triangles per call is a renderer spending its time on state changes rather
 * than on geometry, which is exactly what per-chunk terrain meshes produce.
 */
const kTriangles = ref(0)
/**
 * Installs still waiting on the queue. Evidence, not a gate: a peak with a
 * backlog behind it is streaming catching up, a peak on an empty queue is
 * something else.
 */
const queued = ref(0)
/** Layers switched off with the number keys; shown so a blank view is explained. */
const hiddenLayers = ref<string[]>([])

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
/** Texture/model caches shared by every layer; built once per mount. */
let assets: SceneAssets | null = null
let mapManager: MapManager | null = null
/** Frame-budgeted queue every streaming layer installs through. */
let installQueue: InstallQueue | null = null
let liquidManager: LiquidManager | null = null
/** Liquid materials and their animation, shared by the terrain's and the WMOs' water. */
let liquidSurfaces: LiquidSurfaces | null = null
/** Gradient sky behind the world; one draw call, no depth. */
let skyDome: SkyDome | null = null
let wmoManager: WmoManager | null = null
let spawnManager: CreatureSpawnManager | null = null
let animationFrame = 0
let probeTimer: ReturnType<typeof setInterval> | undefined
let resizeObserver: ResizeObserver | undefined
let removeInputListeners: (() => void) | undefined

// Spawn selection state (a picked model + its ground ring highlight).
let selectedObject: THREE.Object3D | null = null
let selectedSpawn: CreatureSpawnMarker | null = null
let selectionRing: SelectionRing | null = null

const pressed = new Set<string>()

/** Creates the spawn manager and adds it to the scene (idempotent). */
function enableSpawns() {
  const mapId = props.map.mapId
  if (spawnManager || !scene || !assets || !installQueue || mapId == null) return
  spawnManager = new CreatureSpawnManager(
    props.map,
    mapId,
    assets,
    installQueue,
    props.spawnPhase,
    QUALITY_PRESETS[props.quality].spawnDistance,
  )
  scene.add(spawnManager.root)
}

/** Tears down the spawn manager and clears any selection. */
function disableSpawns() {
  clearSelection()
  if (!spawnManager) return
  scene?.remove(spawnManager.root)
  spawnManager.dispose()
  spawnManager = null
}

/** Walks up from a raycast hit to the object carrying `userData.spawn`. */
function spawnObjectFrom(obj: THREE.Object3D | null): THREE.Object3D | null {
  let node = obj
  while (node) {
    if ((node.userData as { spawn?: CreatureSpawnMarker }).spawn) return node
    node = node.parent
  }
  return null
}

function positionSelectionRing() {
  if (!selectionRing || !selectedObject) return
  // The terrain is what the ring lies against; without it loaded yet the ring
  // falls back to the spawn's own position, level.
  selectionRing.place(selectedObject, mapManager?.root ?? null)
}

function clearSelection() {
  selectedObject = null
  selectedSpawn = null
  selectionRing?.hide()
  emit('select-spawn', null)
}

/** Keys only fly the camera when focus isn't in a form control elsewhere. */
function isSceneKeyTarget(target: EventTarget | null): boolean {
  return target === document.body || (!!container.value && container.value.contains(target as Node))
}

function startPosition(): FocusPosition {
  if (props.initialPosition) {
    return props.initialPosition
  }
  const col = (props.map.minX + props.map.maxX + 1) / 2
  const row = (props.map.minY + props.map.maxY + 1) / 2
  return { x: (ADT_GRID_CENTER - row) * TILE_YARDS, y: (ADT_GRID_CENTER - col) * TILE_YARDS }
}

onMounted(() => {
  const el = container.value
  if (!el) return

  const preset = QUALITY_PRESETS[props.quality]

  renderer = new THREE.WebGLRenderer({
    antialias: preset.antialias,
    powerPreference: 'high-performance',
  })
  // Resolution is driven in two steps (see the animate loop): a ceiling that
  // applies at all times, and a lower ratio held while the camera moves.
  const basePixelRatio = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO)
  const movingPixelRatio = Math.min(basePixelRatio, MOVING_PIXEL_RATIO)
  let pixelRatio = basePixelRatio
  renderer.setPixelRatio(pixelRatio)
  renderer.setSize(el.clientWidth, el.clientHeight)
  el.appendChild(renderer.domElement)

  scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(
    60,
    el.clientWidth / Math.max(el.clientHeight, 1),
    1,
    2000,
  )
  camera.up.set(0, 0, 1)

  // @wowserhq/scene's SoundManager crashes on zone changes and on dispose when
  // no music ever played (stopMusic reads getVolume on an uninitialized audio
  // source). We don't want zone music anyway, so pass a no-op stub: MapManager
  // only calls setZoneMusic on it and never owns/disposes an injected manager.
  type SceneSoundManager = NonNullable<
    ConstructorParameters<typeof MapManager>[0]['soundManager']
  >
  const silentSound = { setZoneMusic() {}, dispose() {} } as unknown as SceneSoundManager

  // One texture cache and one model cache for the whole scene: terrain, WMOs
  // and creature spawns all draw from the same client assets, and a manager
  // per layer meant decoding and uploading each shared BLP once per layer.
  assets = new SceneAssets()
  // Every layer installs through one queue, so the per-frame budget is shared
  // rather than granted three times over.
  installQueue = new InstallQueue()

  // Before anything is culled by it. The table is the library's, module-wide:
  // this view is the only thing that fades models by distance.
  scaleFadeDist(preset.fadeScale)
  mapManager = new MapManager({
    host: { baseUrl: MPQ_ASSET_BASE_URL, normalizePath: true },
    soundManager: silentSound,
    textureManager: assets.textureManager,
    // Left unset the library streams 1277 yards in every direction, which is
    // where most of the draw calls come from. See QUALITY_PRESETS.
    viewDistance: preset.viewDistance,
  })
  // Pin the sun before loading, so the first frames are already lit the way
  // every later one will be rather than starting at whatever time it is now.
  mapManager.mapLight.timeOverride = EDITOR_TIME_OF_DAY
  mapManager.load(props.map.name, props.map.mapId ?? undefined)
  scene.add(mapManager.root)

  // Water isn't rendered by @wowserhq/scene; stream it from the ADT MH2O data.
  liquidSurfaces = new LiquidSurfaces(assets)
  liquidManager = new LiquidManager(props.map, installQueue, liquidSurfaces)
  scene.add(liquidManager.root)

  // Behind everything: the view used to clear to a flat fog colour, which read
  // as a wall at the horizon rather than as sky.
  skyDome = new SkyDome()
  scene.add(skyDome.mesh)

  // WMOs (buildings/structures) aren't rendered either; stream them too.
  wmoManager = new WmoManager(props.map, assets, installQueue, liquidSurfaces)
  scene.add(wmoManager.root)

  // Creature spawns (DB) stream as models around the camera when enabled.
  // Ground ring highlighting the selected spawn: sized to the model and laid
  // against the slope under it.
  selectionRing = new SelectionRing()
  scene.add(selectionRing.mesh)
  if (props.showSpawns) enableSpawns()

  // ── Camera orientation (yaw about world +Z, pitch toward ±Z) ─────────
  // Initial view matches the old MapControls default offset (-30,-30,30):
  // heading north-west-ish (WoW +X north, +Y west), 35° below the horizon.
  let yaw = Math.PI / 4
  let pitch = Math.asin(-1 / Math.sqrt(3))
  const lookDir = new THREE.Vector3()
  const applyOrientation = () => {
    lookDir.set(
      Math.cos(pitch) * Math.cos(yaw),
      Math.cos(pitch) * Math.sin(yaw),
      Math.sin(pitch),
    )
    camera.lookAt(
      camera.position.x + lookDir.x,
      camera.position.y + lookDir.y,
      camera.position.z + lookDir.z,
    )
  }

  // ── Prefetch lead ─────────────────────────────────────────────────────
  // The streaming layers load around a second, extrapolated centre as well as
  // the camera's own tile (see TileWindow): where the camera will be in
  // PREFETCH_SECONDS at its current speed. Standing still, the lead sits on
  // the camera and the window is exactly what it always was.
  const velocity = new THREE.Vector2()
  const leadAnchor = new THREE.Vector2()
  const frameVelocity = new THREE.Vector2()
  const leadPoint = new THREE.Vector2()

  /** Re-anchors the lead on the camera. Call after any teleport. */
  const resetLead = () => {
    velocity.set(0, 0)
    leadAnchor.set(camera.position.x, camera.position.y)
  }

  /** The world point to prefetch around this frame. */
  const updateLead = (dt: number) => {
    frameVelocity
      .set(camera.position.x - leadAnchor.x, camera.position.y - leadAnchor.y)
      .divideScalar(Math.max(dt, 1e-4))
    // A fly-to teleports the camera, and that frame reads as thousands of
    // yards a second — a lead nowhere near where we actually land. The
    // fly-cam's own top speed is the honest ceiling. (resetLead covers the
    // teleports we know about; this covers the rest.)
    frameVelocity.clampLength(0, MOVE_SPEED * MOVE_BOOST)
    // Frame-rate independent smoothing, so the lead doesn't swing on a hitch.
    velocity.lerp(frameVelocity, 1 - Math.exp(-dt / VELOCITY_TAU))
    leadAnchor.set(camera.position.x, camera.position.y)
    return leadPoint
      .copy(velocity)
      .multiplyScalar(PREFETCH_SECONDS)
      .clampLength(0, MAX_PREFETCH_YARDS)
      .add(leadAnchor)
  }

  const start = startPosition()
  // A known height (zone origin, focused row) skips the ground probe entirely.
  if (start.z != null) {
    camera.position.set(start.x, start.y, start.z + EYE_HEIGHT)
    grounded.value = true
  } else {
    camera.position.set(start.x, start.y, FALLBACK_HEIGHT)
  }
  applyOrientation()
  resetLead()

  const raycaster = new THREE.Raycaster()
  if (start.z == null) {
    // The terrain height under the start position is unknown until the first
    // areas stream in: probe with a downward ray and settle the camera on hit.
    const down = new THREE.Vector3(0, 0, -1)
    let attempts = 0
    probeTimer = setInterval(() => {
      if (!mapManager) return
      attempts += 1
      raycaster.set(new THREE.Vector3(start.x, start.y, 5000), down)
      const hit = raycaster.intersectObject(mapManager.root, true)[0]
      if (hit) {
        camera.position.set(start.x, start.y, hit.point.z + EYE_HEIGHT)
        grounded.value = true
      }
      if (hit || attempts >= GROUND_PROBE_ATTEMPTS) {
        clearInterval(probeTimer)
        probeTimer = undefined
      }
    }, GROUND_PROBE_INTERVAL_MS)
  }

  // Fly-to: teleport the camera onto the target; the terrain streams to the
  // new position on its own (setTarget follows the camera every frame).
  watch(() => props.focus, focus => {
    if (!focus) return
    if (probeTimer !== undefined) {
      clearInterval(probeTimer)
      probeTimer = undefined
    }
    camera.position.set(focus.x, focus.y, (focus.z ?? FALLBACK_HEIGHT) + EYE_HEIGHT)
    applyOrientation()
    resetLead()
    if (focus.z != null) grounded.value = true
  })

  // ── Fly-cam keyboard movement ─────────────────────────────────────────
  const onKeyDown = (event: KeyboardEvent) => {
    const layer = LAYER_KEYS[event.code]
    if (layer && isSceneKeyTarget(event.target)) {
      event.preventDefault()
      const root =
        layer === 'terrain'
          ? mapManager?.root
          : layer === 'buildings'
            ? wmoManager?.root
            : layer === 'water'
              ? liquidManager?.root
              : spawnManager?.root
      if (root) {
        root.visible = !root.visible
        hiddenLayers.value = root.visible
          ? hiddenLayers.value.filter(name => name !== layer)
          : [...hiddenLayers.value, layer]
      }
      return
    }
    if (!TRACKED_KEYS.has(event.code) || !isSceneKeyTarget(event.target)) return
    pressed.add(event.code)
    // Space/arrows/PageDown would scroll the page. The boost modifier is
    // harmless on its own, so it keeps its default behaviour (swallowing it
    // would break Shift-based shortcuts elsewhere in the app).
    if (MOVE_KEYS.has(event.code)) event.preventDefault()
  }
  const onKeyUp = (event: KeyboardEvent) => pressed.delete(event.code)
  const onBlur = () => pressed.clear()
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onBlur)

  const forward = new THREE.Vector3()
  const rightward = new THREE.Vector3()
  const movement = new THREE.Vector3()
  const some = (codes: string[]) => codes.some(code => pressed.has(code))
  const applyKeyboardMove = (dt: number) => {
    if (pressed.size === 0) return
    // Horizontal movement follows the camera heading, flattened to the
    // ground plane (Z is up in WoW space); vertical movement is world Z.
    camera.getWorldDirection(forward)
    forward.z = 0
    if (forward.lengthSq() < 1e-6) forward.set(1, 0, 0)
    forward.normalize()
    rightward.crossVectors(forward, camera.up)

    movement.set(0, 0, 0)
    if (some(KEY_FORWARD)) movement.add(forward)
    if (some(KEY_BACK)) movement.sub(forward)
    if (some(KEY_RIGHT)) movement.add(rightward)
    if (some(KEY_LEFT)) movement.sub(rightward)
    if (some(KEY_UP)) movement.z += 1
    if (some(KEY_DOWN)) movement.z -= 1
    if (movement.lengthSq() === 0) return

    const boost = some(KEY_BOOST) ? MOVE_BOOST : 1
    movement.normalize().multiplyScalar(MOVE_SPEED * boost * dt)
    camera.position.add(movement)
  }

  // ── Right-click → world position under the pointer ───────────────────
  // Raycast on button-2 release without drag (right-drag looks around). The
  // contextmenu event can't be used for the click test: macOS fires it on
  // press, before a drag can be told apart.
  let rightDown: { x: number; y: number } | null = null
  let leftDown: { x: number; y: number } | null = null
  const pickCoords = new THREE.Vector2()

  const setPickCoords = (event: PointerEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect()
    pickCoords.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    )
  }

  // ── Mouse look / pan / fly ────────────────────────────────────────────
  // Right-drag rotates the camera in place; left-drag pans on the ground
  // plane (the scene follows the cursor); the wheel flies along the view
  // direction. Drag state doubles as the click-slop anchor for picking.
  let dragButton = -1
  let lastPointer: { x: number; y: number } | null = null

  const onPointerDown = (event: PointerEvent) => {
    if (event.button === 2) rightDown = { x: event.clientX, y: event.clientY }
    else if (event.button === 0) leftDown = { x: event.clientX, y: event.clientY }
    if (event.button === 0 || event.button === 2) {
      dragButton = event.button
      lastPointer = { x: event.clientX, y: event.clientY }
      ;(event.target as HTMLElement).setPointerCapture?.(event.pointerId)
    }
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!lastPointer) return
    const dx = event.clientX - lastPointer.x
    const dy = event.clientY - lastPointer.y
    lastPointer = { x: event.clientX, y: event.clientY }
    if (dragButton === 2 && (event.buttons & 2) !== 0) {
      yaw -= dx * LOOK_SPEED
      pitch = THREE.MathUtils.clamp(pitch - dy * LOOK_SPEED, -MAX_PITCH, MAX_PITCH)
      applyOrientation()
    } else if (dragButton === 0 && (event.buttons & 1) !== 0) {
      // World yards per pixel so the ground PAN_DISTANCE ahead tracks the
      // cursor; directions from yaw only, so panning still works looking down.
      const height = renderer?.domElement.clientHeight || 1
      const scale = (2 * PAN_DISTANCE * Math.tan((camera.fov * Math.PI) / 360)) / height
      const rightX = Math.sin(yaw)
      const rightY = -Math.cos(yaw)
      camera.position.x += (-dx * rightX + dy * Math.cos(yaw)) * scale
      camera.position.y += (-dx * rightY + dy * Math.sin(yaw)) * scale
    }
  }

  const onWheel = (event: WheelEvent) => {
    event.preventDefault()
    camera.position.addScaledVector(lookDir, -event.deltaY * WHEEL_SPEED)
  }

  // Left-click without drag selects the spawn model under the pointer
  // (left-drag pans); clicking empty space deselects.
  const onLeftClick = (event: PointerEvent) => {
    if (!leftDown) return
    const moved = Math.hypot(event.clientX - leftDown.x, event.clientY - leftDown.y)
    leftDown = null
    if (moved > CLICK_SLOP_PX || !spawnManager) return
    setPickCoords(event)
    raycaster.setFromCamera(pickCoords, camera)
    const hit = raycaster.intersectObject(spawnManager.root, true)[0]
    const object = hit ? spawnObjectFrom(hit.object) : null
    if (object) {
      selectedObject = object
      selectedSpawn = object.userData.spawn as CreatureSpawnMarker
      positionSelectionRing()
      emit('select-spawn', selectedSpawn)
    } else {
      clearSelection()
    }
  }

  // Right-click without drag: relocate the selected spawn when move is armed,
  // else report the world position under the pointer (right-drag looks).
  const onRightClick = (event: PointerEvent) => {
    if (!rightDown) return
    const moved = Math.hypot(event.clientX - rightDown.x, event.clientY - rightDown.y)
    rightDown = null
    if (moved > CLICK_SLOP_PX || !mapManager) return
    setPickCoords(event)
    raycaster.setFromCamera(pickCoords, camera)
    const hit = raycaster.intersectObject(mapManager.root, true)[0]
    if (!hit) return
    if (props.moveArmed && selectedObject && selectedSpawn) {
      selectedObject.position.set(hit.point.x, hit.point.y, hit.point.z)
      positionSelectionRing()
      emit('move-spawn', { guid: selectedSpawn.guid, x: hit.point.x, y: hit.point.y, z: hit.point.z })
      return
    }
    emit('pick', { x: hit.point.x, y: hit.point.y, z: hit.point.z })
  }

  const onPointerUp = (event: PointerEvent) => {
    if (event.button === dragButton) {
      dragButton = -1
      lastPointer = null
    }
    if (event.button === 0) onLeftClick(event)
    else if (event.button === 2) onRightClick(event)
  }
  const onContextMenu = (event: Event) => event.preventDefault()
  renderer.domElement.addEventListener('pointerdown', onPointerDown)
  renderer.domElement.addEventListener('pointermove', onPointerMove)
  renderer.domElement.addEventListener('pointerup', onPointerUp)
  renderer.domElement.addEventListener('wheel', onWheel, { passive: false })
  renderer.domElement.addEventListener('contextmenu', onContextMenu)

  removeInputListeners = () => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('blur', onBlur)
    renderer?.domElement.removeEventListener('pointerdown', onPointerDown)
    renderer?.domElement.removeEventListener('pointermove', onPointerMove)
    renderer?.domElement.removeEventListener('pointerup', onPointerUp)
    renderer?.domElement.removeEventListener('wheel', onWheel)
    renderer?.domElement.removeEventListener('contextmenu', onContextMenu)
    pressed.clear()
  }

  // ── Dynamic resolution ────────────────────────────────────────────────
  // Shading every pixel at full ratio while flying is where most of the frame
  // budget goes, and the detail is wasted: motion hides it. Drop to the lower
  // ratio while the camera moves, restore once it settles. `setPixelRatio`
  // resizes the drawing buffer only (no CSS reflow), so the cost falls on the
  // two transitions rather than on every frame — which is why this watches
  // the camera itself instead of the inputs: keys, drag, wheel and fly-to are
  // then all covered by one test, with no state to keep in sync.
  const lastPosition = camera.position.clone()
  const lastQuaternion = camera.quaternion.clone()
  let lastMoveAt = 0

  const updateResolution = (now: number) => {
    if (!camera.position.equals(lastPosition) || !camera.quaternion.equals(lastQuaternion)) {
      lastPosition.copy(camera.position)
      lastQuaternion.copy(camera.quaternion)
      lastMoveAt = now
    }
    const wanted =
      now - lastMoveAt < RESOLUTION_SETTLE_MS ? movingPixelRatio : basePixelRatio
    if (wanted !== pixelRatio) {
      pixelRatio = wanted
      renderer?.setPixelRatio(wanted)
    }
  }

  // ── Frame-rate counter ────────────────────────────────────────────────
  // Counts frames and tracks the worst one over each window, then publishes
  // both at once (see FPS_SAMPLE_MS). `dt` is the clock delta, so it covers
  // the whole previous frame — render plus the wait for vsync — which is what
  // a stall while streaming actually looks like.
  let sampleStart = performance.now()
  let sampleFrames = 0
  let sampleWorstMs = 0

  // Called at the end of the frame: the renderer resets its counters when
  // render() starts, so `calls` is only meaningful once it has returned.
  const updateFpsCounter = (dt: number, now: number, calls: number, triangles: number) => {
    sampleFrames += 1
    sampleWorstMs = Math.max(sampleWorstMs, dt * 1000)
    const elapsed = now - sampleStart
    if (elapsed < FPS_SAMPLE_MS) return
    fps.value = Math.round((sampleFrames * 1000) / elapsed)
    worstFrameMs.value = Math.round(sampleWorstMs)
    drawCalls.value = calls
    kTriangles.value = Math.round(triangles / 1000)
    queued.value = installQueue?.pending ?? 0
    sampleStart = now
    sampleFrames = 0
    sampleWorstMs = 0
  }

  /**
   * Pulls the horizon in to the preset's draw distance and returns the far
   * plane to use. Returns the library's own far plane when the preset asks for
   * no limit.
   *
   * The fog has to come in with the far plane, not after it: clipping alone
   * would make terrain vanish at a hard edge, where fogging it out first is
   * what the game client does for the same setting.
   *
   * `MapLight` rewrites `fogParams` from the DBC bands on every `update()`, so
   * this has to run after it and on every frame. Writing the Vector4 in place
   * is deliberate — it is shared by reference with every material's uniform,
   * which is exactly how the library propagates its own light changes.
   *
   * `x` is 1/(end - start) and `y` is the end (see `SceneLight.fogStart`). The
   * band is scaled rather than clipped, so a zone with thick fog keeps thick
   * fog and a clear one stays clear.
   */
  const applyDrawDistance = (manager: MapManager): number => {
    const limit = preset.drawDistance
    if (limit === null) return manager.cameraFar
    const fog = manager.mapLight.fogParams
    if (fog.y > limit) {
      const start = fog.y - 1 / fog.x
      const scaledStart = Math.max(start * (limit / fog.y), 1)
      fog.x = 1 / Math.max(limit - scaledStart, 1)
      fog.y = limit
    }
    // The same margin the library leaves between its fog end and its far plane
    // (one MCNK chunk), so nothing pops at the plane itself.
    return Math.min(manager.cameraFar, limit + TILE_YARDS / 16)
  }

  /**
   * Tints the world for a camera under a liquid surface, and returns the far
   * plane that goes with it.
   *
   * There is no underwater pass to write: the fog already colours every
   * surface in the scene, `clearColor` is that same colour, and the sky dome
   * reads it too — so pulling the fog hard onto the liquid's own colour turns
   * the entire view into the inside of that liquid. Runs after
   * `applyDrawDistance` and, like it, on every frame, because `MapLight`
   * rewrites both from the DBC bands in its own update.
   */
  const applyUnderwater = (manager: MapManager, category: string): number => {
    // Linear tag, like the Light.dbc colours this replaces: the library's
    // shaders take the fog as gamma-space bytes, so the hex must not be
    // converted on the way in.
    manager.mapLight.fogColor.setHex(
      UNDERWATER_TINT[category] ?? UNDERWATER_TINT_DEFAULT,
      THREE.LinearSRGBColorSpace,
    )
    const fog = manager.mapLight.fogParams
    fog.x = 1 / UNDERWATER_FOG_YARDS
    fog.y = UNDERWATER_FOG_YARDS
    return UNDERWATER_FOG_YARDS + TILE_YARDS / 16
  }

  // Reused across frames; the managers cull their own M2s against this.
  const cullFrustum = new THREE.Frustum()
  const cullMatrix = new THREE.Matrix4()
  // Scratch for the clear colour, decoded once per frame (see the render call).
  const clearColor = new THREE.Color()

  const clock = new THREE.Clock()
  const animate = () => {
    animationFrame = requestAnimationFrame(animate)
    if (!renderer || !mapManager || !scene) return
    const dt = clock.getDelta()
    const now = performance.now()
    applyKeyboardMove(dt)
    updateResolution(now)
    // Refresh the camera matrices BEFORE the managers run: skinned M2s
    // (creatures, animated doodads) bake camera.matrixWorldInverse into
    // their bone textures, and the renderer only recomputes it during
    // render() — one frame too late, which made models trail the camera
    // while moving and visibly snap back into place on stop.
    camera.updateMatrixWorld()
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert()
    mapManager.setTarget(camera.position.x, camera.position.y)
    mapManager.update(dt, camera)
    // The map light's fog decides how far we can see, so settle the projection
    // here: the culling frustum below is derived from it.
    let far = applyDrawDistance(mapManager)
    // Head under a liquid surface: the fog becomes that liquid.
    // The terrain's water first, then the WMOs' (a city canal, a flooded crypt).
    const submerged =
      liquidManager?.submergedIn(camera.position) ??
      wmoManager?.submergedIn(camera.position) ??
      null
    if (submerged) far = Math.min(far, applyUnderwater(mapManager, submerged))
    // After the fog is settled, so the horizon matches it — including
    // underwater, where the dome turns the colour of the water.
    skyDome?.update(camera.position, mapManager.mapLight.fogColor)
    if (camera.far !== far) {
      camera.far = far
      camera.updateProjectionMatrix()
    }
    // Streaming window: the camera's own tile, plus the one it is heading for.
    const lead = updateLead(dt)
    const cameraTile = worldToTile({ x: camera.position.x, y: camera.position.y })
    const leadTile = worldToTile({ x: lead.x, y: lead.y })
    liquidSurfaces?.advance(dt)
    liquidManager?.update(cameraTile, leadTile)
    wmoManager?.update(cameraTile, leadTile)
    spawnManager?.update(cameraTile, leadTile)
    // Give the frame's share of the budget to whatever those loads made ready.
    // Ahead of the cull pass, so anything installed this frame is culled this
    // frame instead of drawing once unconditionally.
    installQueue?.drain(INSTALL_BUDGET_MS)
    // Cull before the animation pass, not after: the animator skins every
    // model still marked visible, so hiding them first is what saves the
    // work — the draw calls are the smaller half of the win.
    cullMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    cullFrustum.setFromProjectionMatrix(cullMatrix)
    wmoManager?.cull(cullFrustum, camera.position)
    spawnManager?.cull(cullFrustum, camera.position)
    // Animations and sun uniforms for every M2 in the scene, driven once:
    // WMO doodads and creature spawns now share one ModelManager, and it
    // advances each animator by `dt` per call. They are lit by the zone's own
    // light, copied after the draw distance and the underwater tint have had
    // their say, so they fog out with the terrain rather than on their own.
    assets?.matchLight(mapManager.mapLight)
    assets?.update(dt, camera)
    // The map light holds gamma-space bytes as-is, but the renderer encodes a
    // clear colour from linear to sRGB. Decoding it first cancels that out, so
    // the backdrop stays the fog colour the shaders draw with.
    renderer.setClearColor(clearColor.copy(mapManager.clearColor).convertSRGBToLinear())
    renderer.render(scene, camera)
    updateFpsCounter(dt, now, renderer.info.render.calls, renderer.info.render.triangles)
  }
  animate()

  resizeObserver = new ResizeObserver(() => {
    if (!renderer || !el.clientWidth || !el.clientHeight) return
    renderer.setSize(el.clientWidth, el.clientHeight)
    camera.aspect = el.clientWidth / el.clientHeight
    camera.updateProjectionMatrix()
  })
  resizeObserver.observe(el)
})

// Toggling the toolbar switch streams spawns in or tears them down live.
watch(() => props.showSpawns, show => (show ? enableSpawns() : disableSpawns()))

// Changing phase refetches the spawns around the camera with the new filter.
watch(() => props.spawnPhase, phase => spawnManager?.setPhase(phase))

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame)
  if (probeTimer !== undefined) clearInterval(probeTimer)
  resizeObserver?.disconnect()
  removeInputListeners?.()
  // Drop pending installs before the managers go: a queued task would only
  // build into a scene that is being torn down.
  installQueue?.clear()
  skyDome?.dispose()
  liquidManager?.dispose()
  liquidSurfaces?.dispose()
  wmoManager?.dispose()
  spawnManager?.dispose()
  mapManager?.dispose()
  selectionRing?.dispose()
  if (renderer) {
    renderer.dispose()
    renderer.domElement.remove()
  }
  renderer = null
  scene = null
  assets = null
  mapManager = null
  installQueue = null
  skyDome = null
  liquidManager = null
  liquidSurfaces = null
  wmoManager = null
  spawnManager = null
  selectionRing = null
  selectedObject = null
  selectedSpawn = null
})
</script>

<template>
  <div ref="container" class="world-scene">
    <div v-if="!grounded" class="scene-hint">
      <i class="pi pi-spin pi-spinner"></i>
      <span>{{ $t('mapEditor.scene.streaming') }}</span>
    </div>
    <!-- Debug readout: hidden from assistive tech, which would otherwise
         announce it twice a second for as long as the view is open. -->
    <div class="scene-fps" aria-hidden="true">
      {{
        $t('mapEditor.scene.fps', {
          fps,
          worst: worstFrameMs,
          calls: drawCalls,
          tris: kTriangles,
          queued,
        })
      }}
    </div>
    <div v-if="hiddenLayers.length" class="scene-hidden-layers" aria-hidden="true">
      {{ $t('mapEditor.scene.hidden', { layers: hiddenLayers.join(', ') }) }}
    </div>
    <div class="scene-controls-hint">{{ $t('mapEditor.scene.controls') }}</div>
  </div>
</template>

<style scoped>
.world-scene {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  border-radius: 0.75rem;
  border: 1px solid var(--border-input-soft);
  overflow: hidden;
  background: #060d1f;
}

.world-scene :deep(canvas) {
  display: block;
}

.scene-hint {
  position: absolute;
  top: 0.75rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  background: var(--surface-input);
  color: var(--text-muted);
  font-size: 0.85rem;
  pointer-events: none;
}

/* Top-left, clear of the centred streaming chip and the controls hint. */
.scene-fps {
  position: absolute;
  top: 0.5rem;
  left: 0.75rem;
  color: rgba(148, 163, 184, 0.9);
  font-size: 0.75rem;
  /* Fixed-width digits: the readout changes twice a second and would jitter. */
  font-variant-numeric: tabular-nums;
  pointer-events: none;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}

.scene-hidden-layers {
  position: absolute;
  top: 1.75rem;
  left: 0.75rem;
  color: rgba(248, 113, 113, 0.95);
  font-size: 0.75rem;
  pointer-events: none;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}

.scene-controls-hint {
  position: absolute;
  bottom: 0.5rem;
  right: 0.75rem;
  color: rgba(148, 163, 184, 0.8);
  font-size: 0.75rem;
  pointer-events: none;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}
</style>

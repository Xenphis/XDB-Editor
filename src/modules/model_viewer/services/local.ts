import * as THREE from 'three'
import { OrbitControls } from '@wowserhq/scene'
import { SceneAssets } from '@core/wow/SceneAssets'
import { applyModelSkins } from '@core/wow/modelSkins'
import { filterCharacterGeosets } from '@core/wow/characterGeosets'
import { buildWmoTemplate } from '@core/wow/wmoGeometry'
import {
  ensureClientLoaded,
  loadWmoModel,
  resolveCreatureModels,
  resolveGameObjectModels,
} from '@/modules/map_editor/service'
import type { ModelKind, ModelViewerHandle } from '../types'

/**
 * Model preview rendered from the user's own WoW client files — the primary
 * preview source (`./online.ts` is the fallback for users who haven't pointed
 * the app at a client).
 *
 * It reuses the map editor's client pipeline end to end: the Rust side opens
 * the 3.3.5 MPQs as a patch chain, resolves the display id through the client
 * DBCs (`minimap_creature_models` / `minimap_gameobject_models`) and serves the
 * assets over `mpq://`, while @wowserhq/scene decodes the M2/BLP and renders
 * them with three.js. The practical win over the online viewer: custom display
 * ids from a server's own patch MPQs render, because they come from the same
 * files the server's players actually load.
 *
 * Creature displays are always M2s. Gameobject displays are M2s *or* WMOs
 * (ships, elevators, city gates), which need the WMO geometry pipeline
 * instead — both are handled here.
 */

/** Why a local render could not happen; drives the fallback in `../service.ts`. */
export type LocalFailure = 'no-client' | 'unresolved' | 'failed'

export class LocalModelError extends Error {
  readonly reason: LocalFailure

  constructor(reason: LocalFailure, message: string) {
    super(message)
    this.name = 'LocalModelError'
    this.reason = reason
  }
}

/** Vertical field of view; narrow enough to keep tall models from distorting. */
const FOV = 40
/** Camera direction from the model, in WoW axes (+X front, +Y left, +Z up). */
const VIEW_DIR = new THREE.Vector3(1, -0.85, 0.4).normalize()
/** Framing slack around the model's bounding sphere. */
const FRAMING_MARGIN = 1.25
/** Retina is wasted on a thumbnail-sized canvas. */
const MAX_PIXEL_RATIO = 2

/**
 * Client-asset managers shared by every preview.
 *
 * Each @wowserhq/scene manager spins up its own web worker with no way to tear
 * it down, so building a pair per mounted preview would leak two workers every
 * time a workspace tab opened. One lazily-built set serves them all instead;
 * the map editor's 3D view keeps its own (it renders a different scene, in a
 * different WebGL context, and shares nothing on the GPU anyway).
 */
let sharedAssets: SceneAssets | null = null

function assets(): SceneAssets {
  if (!sharedAssets) {
    sharedAssets = new SceneAssets()
    // The M2 shader always fogs; the library's default settings fade a model
    // by a few percent even at preview distance. Push the fog out of reach so
    // the preview shows the model's own colors.
    sharedAssets.sceneLight.fogParams.set(1 / 100000, 100000, 1, 1)
  }
  return sharedAssets
}

interface LivePreview {
  /** `animationDt` is 0 for every preview but the first one of the frame. */
  frame(animationDt: number, frameDt: number): void
}

/**
 * One render loop for every mounted preview.
 *
 * The previews share a ModelManager, and `SceneAssets.update` advances every
 * animator it owns — so letting each preview drive its own loop would run the
 * animations at N× speed with N previews on screen. The loop below ticks the
 * animations once per frame (for the first preview) and lets the others render
 * the already-advanced state.
 */
const live = new Set<LivePreview>()
let loopHandle = 0
const loopClock = new THREE.Clock()

function runLoop(): void {
  loopHandle = requestAnimationFrame(runLoop)
  const dt = loopClock.getDelta()
  let first = true
  for (const preview of live) {
    preview.frame(first ? dt : 0, dt)
    first = false
  }
}

function addLive(preview: LivePreview): void {
  live.add(preview)
  if (loopHandle === 0) {
    loopClock.getDelta() // drop the idle gap so animations don't jump
    loopHandle = requestAnimationFrame(runLoop)
  }
}

function removeLive(preview: LivePreview): void {
  live.delete(preview)
  if (live.size === 0 && loopHandle !== 0) {
    cancelAnimationFrame(loopHandle)
    loopHandle = 0
  }
}

/**
 * Renders one display id into `container` from the local client files.
 *
 * Rejects with a `LocalModelError` when the client isn't usable (`no-client`),
 * the display id isn't in the client's DBCs (`unresolved`) or the assets
 * couldn't be loaded (`failed`) — the caller decides whether to fall back to
 * the online viewer.
 */
export async function renderLocalModel(
  container: HTMLElement,
  kind: ModelKind,
  displayId: number,
  clientPath: string,
): Promise<ModelViewerHandle> {
  if (!clientPath.trim()) {
    throw new LocalModelError('no-client', 'no client folder configured')
  }
  try {
    await ensureClientLoaded(clientPath)
  } catch (e) {
    throw new LocalModelError('no-client', `client not loaded: ${String(e)}`)
  }

  const subject =
    kind === 'creature'
      ? await buildCreature(displayId)
      : await buildGameObject(displayId)

  return mount(container, subject)
}

/** The scene content for one display id, plus what its teardown must release. */
interface Subject {
  root: THREE.Object3D
  dispose(): void
}

async function buildCreature(displayId: number): Promise<Subject> {
  let resolved: Awaited<ReturnType<typeof resolveCreatureModels>>
  try {
    resolved = await resolveCreatureModels([displayId])
  } catch (e) {
    throw new LocalModelError('failed', `creature display lookup failed: ${String(e)}`)
  }
  const info = resolved[displayId]
  if (!info) {
    throw new LocalModelError('unresolved', `display ${displayId} is not in the client DBCs`)
  }

  let model
  try {
    model = await assets().modelManager.get(info.model)
  } catch (e) {
    throw new LocalModelError('failed', `could not load ${info.model}: ${String(e)}`)
  }
  // The DBC scale is deliberately not applied: the camera frames whatever it
  // is given, so scaling would only change the numbers, never the picture.
  model.updateMatrixWorld()
  applyModelSkins(model, info.textures, assets().textureManager)
  filterCharacterGeosets(model, info.model)

  return {
    root: model,
    dispose: () => model.dispose(),
  }
}

async function buildGameObject(displayId: number): Promise<Subject> {
  let resolved: Awaited<ReturnType<typeof resolveGameObjectModels>>
  try {
    resolved = await resolveGameObjectModels([displayId])
  } catch (e) {
    throw new LocalModelError('failed', `gameobject display lookup failed: ${String(e)}`)
  }
  const info = resolved[displayId]
  if (!info) {
    throw new LocalModelError('unresolved', `display ${displayId} is not in the client DBCs`)
  }
  return info.isWmo ? buildWmo(info.model) : buildDoodad(info.model)
}

/** An ordinary M2 gameobject (chest, sign, campfire…): no skin variations. */
async function buildDoodad(path: string): Promise<Subject> {
  let model
  try {
    model = await assets().modelManager.get(path)
  } catch (e) {
    throw new LocalModelError('failed', `could not load ${path}: ${String(e)}`)
  }
  model.updateMatrixWorld()
  return { root: model, dispose: () => model.dispose() }
}

/** A WMO gameobject (ship, elevator, gate): batch geometry + doodad set 0. */
async function buildWmo(path: string): Promise<Subject> {
  let wmo
  try {
    wmo = await loadWmoModel(path)
  } catch (e) {
    throw new LocalModelError('failed', `could not load ${path}: ${String(e)}`)
  }

  const built = buildWmoTemplate(wmo.batches, assets().textureManager, assets().sceneLight)
  // Set 0 is the always-visible default set; the others are selected by a
  // placement, which a standalone preview doesn't have.
  const doodads = wmo.doodadSets[0]?.doodads ?? []
  const placed = await Promise.all(
    doodads.map(d => assets().modelManager.get(d.m2).catch(() => null)),
  )
  placed.forEach((model, i) => {
    const d = doodads[i]
    if (!model || !d) return
    model.position.set(d.position[0], d.position[1], d.position[2])
    model.quaternion.set(d.rotation[0], d.rotation[1], d.rotation[2], d.rotation[3])
    model.scale.setScalar(d.scale)
    built.group.add(model)
  })
  built.group.updateMatrixWorld(true)

  return {
    root: built.group,
    dispose: () => {
      for (const model of placed) model?.dispose()
      for (const geometry of built.geometries) geometry.dispose()
      for (const material of built.materials) material.dispose()
    },
  }
}

/** Builds the WebGL view around a resolved subject and starts rendering it. */
function mount(container: HTMLElement, subject: Subject): ModelViewerHandle {
  const width = Math.max(container.clientWidth, 1)
  const height = Math.max(container.clientHeight, 1)

  // `alpha` keeps the container's own gradient visible behind the model.
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO))
  renderer.setSize(width, height)
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.add(subject.root)

  const camera = new THREE.PerspectiveCamera(FOV, width / height, 0.1, 1000)
  camera.up.set(0, 0, 1) // WoW is Z-up (must precede OrbitControls: it reads `up`)

  const box = new THREE.Box3().setFromObject(subject.root)
  const center = box.isEmpty() ? new THREE.Vector3() : box.getCenter(new THREE.Vector3())
  const radius = box.isEmpty()
    ? 1
    : Math.max(box.getBoundingSphere(new THREE.Sphere()).radius, 0.01)
  const distance = (radius / Math.sin((FOV * Math.PI) / 360)) * FRAMING_MARGIN
  camera.position.copy(center).addScaledVector(VIEW_DIR, distance)
  // Model sizes span three orders of magnitude (a mailbox vs. a galleon), so
  // the clip planes follow the framing distance instead of being fixed: a
  // constant near/far ratio keeps depth precision the same for every model.
  camera.near = distance / 500
  camera.far = distance * 20
  camera.updateProjectionMatrix()

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.copy(center)
  controls.enableDamping = true
  controls.dampingFactor = 0.12
  // A preview is one object seen from the outside: orbiting and zooming are
  // useful, panning just loses it off-frame.
  controls.enablePan = false
  controls.minDistance = radius * 0.5
  controls.maxDistance = distance * 4
  controls.update()

  const preview: LivePreview = {
    frame(animationDt, frameDt) {
      controls.update(frameDt)
      // The skeleton pass bakes the view matrix into the bone texture, so the
      // camera must be current before the models are advanced.
      camera.updateMatrixWorld()
      camera.matrixWorldInverse.copy(camera.matrixWorld).invert()
      assets().update(animationDt, camera)
      renderer.render(scene, camera)
    },
  }
  addLive(preview)

  const resizeObserver = new ResizeObserver(() => {
    const w = container.clientWidth
    const h = container.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  })
  resizeObserver.observe(container)

  return {
    destroy() {
      removeLive(preview)
      resizeObserver.disconnect()
      controls.dispose()
      scene.remove(subject.root)
      subject.dispose()
      renderer.domElement.remove()
      renderer.dispose()
      // Browsers cap the number of live WebGL contexts (and silently kill the
      // oldest past it), so hand this one back now rather than at GC time.
      renderer.forceContextLoss()
    },
  }
}

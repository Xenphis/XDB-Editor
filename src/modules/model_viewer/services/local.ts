import * as THREE from 'three'
import { OrbitControls } from '@wowserhq/scene'
import { SceneAssets } from '@core/wow/SceneAssets'
import { applyModelSkins } from '@core/wow/modelSkins'
import { showCharacterGeosets } from '@core/wow/characterGeosets'
import { attachItemModels, type AttachedModels } from '@core/wow/modelAttachments'
import type { AttachmentPoint } from '@core/wow/creatureDisplay'
import { buildWmoTemplate } from '@core/wow/wmoGeometry'
import {
  ensureClientLoaded,
  loadModelAttachments,
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
 * Creature displays are always M2s. Humanoid NPCs are dressed as the client
 * dresses them: the display's geosets (hair, boots, tabard…) and the helm and
 * shoulder models hung on the body's bones. Gameobject displays are M2s *or*
 * WMOs (ships, elevators, city gates), which need the WMO geometry pipeline
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
/** Framing slack around the model's drawn bounds. */
const FRAMING_MARGIN = 1.08
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
      ? await buildCreature(displayId, clientPath)
      : await buildGameObject(displayId)

  return mount(container, subject)
}

/** The scene content for one display id, plus what its teardown must release. */
interface Subject {
  root: THREE.Object3D
  /** Per-frame work after the animation pass (attached items follow bones). */
  sync?(camera: THREE.Camera): void
  dispose(): void
}

/**
 * Attachment points per client and model path. A body model's points never
 * change, and every NPC on HumanMale asks for the same ones.
 */
const attachmentPoints = new Map<string, Promise<AttachmentPoint[]>>()

function modelAttachmentPoints(clientPath: string, model: string): Promise<AttachmentPoint[]> {
  const key = `${clientPath}|${model}`
  let points = attachmentPoints.get(key)
  if (!points) {
    points = loadModelAttachments(model)
    attachmentPoints.set(key, points)
    // A failed read is retried next time instead of being remembered.
    points.catch(() => attachmentPoints.delete(key))
  }
  return points
}

async function buildCreature(displayId: number, clientPath: string): Promise<Subject> {
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
  showCharacterGeosets(model, info.model, info.character?.geosets)

  // Worn items are extras: without them the NPC still renders, just less
  // dressed, so a failure here never fails the preview.
  let attached: AttachedModels | null = null
  const items = info.character?.attachments ?? []
  if (items.length > 0) {
    try {
      const points = await modelAttachmentPoints(clientPath, info.model)
      attached = await attachItemModels(model, items, points, assets())
    } catch (e) {
      console.warn('[modelViewer] could not attach item models', e)
    }
  }

  return {
    root: model,
    sync: camera => attached?.sync(camera),
    dispose: () => {
      attached?.dispose()
      model.dispose()
    },
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

const _vertex = new THREE.Vector3()
const _skinned = new THREE.Vector3()
const _influence = new THREE.Vector3()

type SceneModel = Awaited<ReturnType<SceneAssets['modelManager']['get']>>

/**
 * A skinned model's bones as posed by the last animation pass, in model space
 * (@wowserhq/scene bakes the model-view matrix into them). `null` for
 * anything that isn't a skinned model.
 */
function posedBones(object: THREE.Object3D): THREE.Matrix4[] | null {
  const model = object as Partial<SceneModel>
  const bones = model.skinned ? model.animation?.skeleton?.bones : undefined
  if (!bones) return null
  const viewToModel = object.modelViewMatrix.clone().invert()
  return bones.map(bone => viewToModel.clone().multiply(bone.matrix))
}

/**
 * The box around what is actually drawn: the vertices of every visible
 * submesh, attached items included, skinned into the pose of the last
 * animation pass.
 *
 * The M2 bounds @wowserhq/scene gives a model are the union of every
 * animation's bounds (the death roll, the jump, the spell cast…) over every
 * geoset (all the hairstyles, all the capes), which for a humanoid is a box
 * several times its standing size — framing it left the model small in the
 * middle of the preview. The bind pose isn't a safe stand-in either: some
 * creatures are modelled upright and crouch in their stand animation.
 */
function drawnBounds(root: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3()
  root.updateMatrixWorld(true)
  root.traverseVisible(object => {
    const mesh = object as THREE.Mesh
    const geometry = mesh.isMesh ? mesh.geometry : undefined
    const position = geometry?.getAttribute('position')
    if (!geometry || !position) return
    const index = geometry.getIndex()
    const pose = posedBones(object)
    const skinIndex = geometry.getAttribute('skinIndex')
    const skinWeight = geometry.getAttribute('skinWeight')
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    const groups = geometry.groups.length > 0
      ? geometry.groups
      : [{ start: 0, count: index ? index.count : position.count, materialIndex: 0 }]
    for (const group of groups) {
      if (materials[group.materialIndex ?? 0]?.visible === false) continue
      for (let i = group.start; i < group.start + group.count; i++) {
        const v = index ? index.getX(i) : i
        _vertex.fromBufferAttribute(position, v)
        if (pose && skinIndex && skinWeight) {
          // The vertex shader's skinning: a weighted sum of up to 4 bones.
          _skinned.set(0, 0, 0)
          for (let k = 0; k < 4; k++) {
            const weight = skinWeight.getComponent(v, k)
            const bone = weight > 0 ? pose[skinIndex.getComponent(v, k)] : undefined
            if (bone) _skinned.addScaledVector(_influence.copy(_vertex).applyMatrix4(bone), weight)
          }
          _vertex.copy(_skinned)
        }
        box.expandByPoint(_vertex.applyMatrix4(mesh.matrixWorld))
      }
    }
  })
  return box
}

/**
 * How far along `VIEW_DIR` the camera must stand for the whole box to fit
 * the view — fitted to the box itself rather than to its bounding sphere,
 * which for a tall, narrow model is mostly empty space.
 */
function fitDistance(box: THREE.Box3, center: THREE.Vector3, aspect: number): number {
  const tanV = Math.tan((FOV * Math.PI) / 360)
  const tanH = tanV * aspect
  // Camera basis, looking from `center + VIEW_DIR * d` back at `center`.
  const right = new THREE.Vector3(0, 0, 1).cross(VIEW_DIR).normalize()
  const up = VIEW_DIR.clone().cross(right).normalize()
  const corner = new THREE.Vector3()
  let distance = 0
  for (let i = 0; i < 8; i++) {
    corner
      .set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z)
      .sub(center)
    // A corner nearer the camera needs that much more room behind it.
    const needed =
      Math.max(Math.abs(corner.dot(right)) / tanH, Math.abs(corner.dot(up)) / tanV) +
      corner.dot(VIEW_DIR)
    distance = Math.max(distance, needed)
  }
  return distance
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

  // Pose the subject as its first frame will show it (the stand animation,
  // attached items following) so the framing fits that. Any camera does: the
  // bounds undo it.
  camera.updateMatrixWorld()
  camera.matrixWorldInverse.copy(camera.matrixWorld).invert()
  assets().update(0, camera)
  subject.sync?.(camera)
  const box = drawnBounds(subject.root)
  const center = box.isEmpty() ? new THREE.Vector3() : box.getCenter(new THREE.Vector3())
  const radius = box.isEmpty()
    ? 1
    : Math.max(box.getBoundingSphere(new THREE.Sphere()).radius, 0.01)
  const distance = box.isEmpty()
    ? radius / Math.sin((FOV * Math.PI) / 360)
    : Math.max(fitDistance(box, center, width / height), radius * 0.5) * FRAMING_MARGIN
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
      subject.sync?.(camera)
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

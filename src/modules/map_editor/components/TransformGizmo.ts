import * as THREE from 'three'
import {
  TransformControls,
  type TransformControlsGizmo,
} from 'three/examples/jsm/controls/TransformControls.js'
import type { GizmoMode, SpawnTransform } from '../types'

/**
 * The move/rotate gizmo of the 3D view: arrows to drag the
 * selected spawn along the world axes, or a ring to turn it, as in Unity or
 * Blender.
 *
 * It is three's own `TransformControls` — which in this version of three is an
 * `Object3D` added to the scene directly — set up for what a spawn is:
 *
 * - Axes are the world's, never the model's: WoW's are X north, Y west, Z up,
 *   and those are the axes a `creature` row is written in.
 * - Rotation is the Z ring alone. A spawn only has a yaw (`orientation`), so
 *   the X and Y rings are hidden, and three hides the view-plane and trackball
 *   rings along with them (they need all three axes shown).
 * - A horizontal drag (the X or Y arrow) keeps the spawn on the ground
 *   under it, so it walks up a hill instead of burying itself in it. Any drag
 *   that includes Z is the user placing the height by hand, and is left alone.
 * - Pared down to what helps (see `restyleHandles`): one arrow per axis, as
 *   in Unity and Blender, with no plane squares and no axis guides.
 *
 * The view owns selection and input: it asks `busy` before treating a left
 * press as a camera pan or a pick, which is why the gizmo has to be created
 * before the view registers its own pointer listeners — three's run first and
 * mark the drag as started.
 */

/**
 * Ground probe, in yards: the ray starts this far above the last ground point
 * found during the drag, plus the distance dragged since — so it climbs a 45°
 * slope however fast the pointer moves — and looks this far below it. The
 * same values `SelectionRing` probes with.
 */
const GROUND_PROBE_UP = 6
const GROUND_PROBE_RANGE = 120
/**
 * Where the second try starts when the first finds nothing, above the last
 * ground point: dragged off a cliff edge taller than the probe range, or onto a
 * rise the first ray started inside of.
 */
const GROUND_PROBE_FALLBACK = 1000

/**
 * Radius of the move arrows' line, in gizmo units (the gizmo is scaled to
 * stay the same size on screen). three draws it at 0.0075 — a pixel or two,
 * which a busy scene swallows.
 */
const SHAFT_RADIUS = 0.015
const THREE_SHAFT_RADIUS = 0.0075

/** A move handle's name → the coordinate its axis runs along. */
const HANDLE_AXES: Record<string, 'x' | 'y' | 'z'> = { X: 'x', Y: 'y', Z: 'z' }
/** The plane squares, which the arrows make redundant on a spawn. */
const DROPPED_PLANES = new Set(['XY', 'YZ', 'XZ'])
/** The grey lines three draws through the whole world along the dragged axis. */
const DROPPED_GUIDES = new Set(['X', 'Y', 'Z', 'AXIS'])

const TWO_PI = Math.PI * 2
const DOWN = new THREE.Vector3(0, 0, -1)

export interface TransformGizmoOptions {
  camera: THREE.Camera
  domElement: HTMLElement
  /** What a spawn can stand on: the terrain and the WMOs, as loaded right now. */
  groundRoots: () => THREE.Object3D[]
  /** Every step of a drag, for what follows the spawn (its selection ring). */
  onChange: () => void
  /** Once a drag ends, with where the spawn landed. */
  onCommit: (transform: SpawnTransform) => void
}

export class TransformGizmo {
  readonly root: TransformControls

  readonly #options: TransformGizmoOptions
  #mode: GizmoMode | null = null
  #object: THREE.Object3D | null = null
  readonly #raycaster = new THREE.Raycaster()
  readonly #origin = new THREE.Vector3()
  /** Last ground point found during the drag; where the next probe starts. */
  readonly #ground = new THREE.Vector3()

  constructor(options: TransformGizmoOptions) {
    this.#options = options
    const controls = new TransformControls(options.camera, options.domElement)
    controls.name = 'transform-gizmo'
    controls.setSpace('world')
    // Off until a mode is chosen: disabled, three's controls do not even take
    // pointer capture, so the view's own drags are untouched.
    controls.enabled = false
    restyleHandles(controls)

    controls.addEventListener('mouseDown', () => {
      if (this.#object) this.#ground.copy(this.#object.position)
    })
    controls.addEventListener('objectChange', () => this.#onObjectChange())
    controls.addEventListener('mouseUp', () => {
      if (this.#object) options.onCommit(transformOf(this.#object))
    })
    this.root = controls
  }

  /** The pointer is over a handle, or a handle is being dragged. */
  get busy(): boolean {
    return this.root.enabled && (this.root.dragging || this.root.axis !== null)
  }

  get dragging(): boolean {
    return this.root.dragging
  }

  /** Shows the gizmo in `mode` on the attached object; null hides it. */
  setMode(mode: GizmoMode | null): void {
    this.#mode = mode
    if (mode) {
      this.root.setMode(mode)
      this.root.showX = mode === 'translate'
      this.root.showY = mode === 'translate'
      this.root.showZ = true
    }
    this.#sync()
  }

  /** The object the gizmo moves, while a mode is set; null lets go of it. */
  attach(object: THREE.Object3D | null): void {
    this.#object = object
    this.#sync()
  }

  #sync(): void {
    const object = this.#mode ? this.#object : null
    this.root.enabled = object !== null
    if (object) this.root.attach(object)
    else this.root.detach()
  }

  #onObjectChange(): void {
    const object = this.#object
    if (!object) return
    const axis = this.root.axis
    if (this.#mode === 'translate' && axis && !axis.includes('Z')) this.#snapToGround(object)
    // Now, not at the next render: culling reads the model's world bounding
    // sphere, and the animation pass its world matrix, before that happens.
    object.updateMatrixWorld()
    this.#options.onChange()
  }

  /**
   * Drops `object` onto the ground under it. three recomputes the position
   * from where the drag started on every step, so the height written here
   * never accumulates — each step only has to find the ground once.
   */
  #snapToGround(object: THREE.Object3D): void {
    const roots = this.#options.groundRoots()
    if (roots.length === 0) return
    const climb =
      GROUND_PROBE_UP +
      Math.hypot(object.position.x - this.#ground.x, object.position.y - this.#ground.y)
    const hit =
      this.#probe(object.position, roots, climb) ??
      this.#probe(object.position, roots, GROUND_PROBE_FALLBACK)
    if (hit) this.#ground.copy(hit)
    else this.#ground.set(object.position.x, object.position.y, this.#ground.z)
    object.position.z = this.#ground.z
  }

  /** First solid surface below `from`, starting `up` yards above the last ground point. */
  #probe(from: THREE.Vector3, roots: THREE.Object3D[], up: number): THREE.Vector3 | null {
    this.#origin.set(from.x, from.y, this.#ground.z + up)
    this.#raycaster.set(this.#origin, DOWN)
    this.#raycaster.far = up + GROUND_PROBE_RANGE
    for (const hit of this.#raycaster.intersectObjects(roots, true)) {
      if (isGround(hit.object)) return hit.point
    }
    return null
  }

  dispose(): void {
    this.root.detach()
    this.root.dispose()
    this.#object = null
  }
}

/**
 * Pares three's gizmo down to the handles that help place a spawn.
 *
 * - One arrow per axis. three puts an arrowhead at both ends of every axis but
 *   draws the line on the positive half only, so the negative head floats on
 *   its own, off its axis — and on a spawn, the one below points into the
 *   ground. The negative heads go, and their pickers with them so no invisible
 *   grab zone is left where nothing is drawn; the lines are thickened.
 * - No plane squares (see `DROPPED_PLANES`).
 * - No axis guides while dragging (see `DROPPED_GUIDES`), in either mode.
 *
 * Handles are removed before the gizmo ever renders, so none of them has
 * anything on the GPU to free. three bakes each handle's placement into its
 * own copy of the geometry, so an arrow part is told apart by where its
 * vertices lie: its centre along the axis (negative side or not), and its
 * length (the line runs half a unit, a head a tenth).
 */
function restyleHandles(controls: TransformControls): void {
  const gizmo = controls.children.find(
    (child): child is TransformControlsGizmo => 'isTransformControlsGizmo' in child,
  )
  if (!gizmo) return
  // Copies throughout: handles are removed while walking.
  for (const group of [gizmo.helper.translate, gizmo.helper.rotate]) {
    for (const guide of [...group.children]) {
      if (DROPPED_GUIDES.has(guide.name)) guide.removeFromParent()
    }
  }
  const box = new THREE.Box3()
  const center = new THREE.Vector3()
  const size = new THREE.Vector3()
  const thicken = SHAFT_RADIUS / THREE_SHAFT_RADIUS
  for (const group of [gizmo.gizmo.translate, gizmo.picker.translate]) {
    for (const handle of [...group.children]) {
      if (DROPPED_PLANES.has(handle.name)) {
        handle.removeFromParent()
        continue
      }
      const axis = HANDLE_AXES[handle.name]
      const mesh = handle as THREE.Mesh
      if (!axis || !mesh.isMesh) continue
      box.setFromBufferAttribute(mesh.geometry.getAttribute('position') as THREE.BufferAttribute)
      if (box.getCenter(center)[axis] < 0) {
        mesh.removeFromParent()
      } else if (group === gizmo.gizmo.translate && box.getSize(size)[axis] > 0.4) {
        // The line runs through the origin along its axis: scaling the other
        // two widens it in place.
        mesh.geometry.scale(
          axis === 'x' ? 1 : thicken,
          axis === 'y' ? 1 : thicken,
          axis === 'z' ? 1 : thicken,
        )
      }
    }
  }
}

/**
 * Terrain and WMO surfaces, not what sits on them: liquid surfaces (tagged
 * with their `category`, see `LiquidSurfaces`) would stand a spawn on the
 * water, and M2 doodads — the library's `Model`, the one type with a
 * `sizeCategory` — on a treetop or a table.
 */
function isGround(object: THREE.Object3D): boolean {
  return object.userData.category === undefined && !('sizeCategory' in object)
}

/** The spawn columns for where `object` stands and faces. */
function transformOf(object: THREE.Object3D): SpawnTransform {
  return {
    x: object.position.x,
    y: object.position.y,
    z: object.position.z,
    orientation: ((object.rotation.z % TWO_PI) + TWO_PI) % TWO_PI,
  }
}

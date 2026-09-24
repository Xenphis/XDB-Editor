import * as THREE from 'three'

/**
 * The ground ring marking the selected spawn.
 *
 * It replaces a fixed-radius `TorusGeometry` lying flat in the XY plane, which
 * had three problems the client does not: it was the same size for a murloc
 * and for a giant, it stayed horizontal on sloped ground so one side floated
 * and the other sank, and its hard edges read as a machined washer rather than
 * a marker painted on the ground.
 *
 * The client projects a texture onto the terrain, so it conforms to whatever
 * is under it. This does the cheap equivalent: one ray down at the spawn's
 * feet gives the ground point *and* its normal, and the ring is laid flat
 * against that. Over a few yards the terrain is near-planar, so a single
 * normal captures the slope that matters — and it costs one raycast on
 * selection rather than one per ring vertex, which on a scene of thousands of
 * chunk meshes is the difference between instant and a visible hitch on click.
 *
 * The geometry is a unit ring scaled per selection, so changing size never
 * rebuilds a buffer, and the band is faded at both edges in the shader instead
 * of being a solid annulus.
 */

/** Ring segments. Enough that the outline reads as a circle, not a polygon. */
const SEGMENTS = 64
/**
 * The unit ring's extent, and where inside it the band is solid.
 *
 * All four live here rather than half of them inside the shader string: the
 * fades and the geometry have to move together, and a plateau that drifts
 * outside the ring silently renders nothing.
 *
 * The band is centred on 0.84 of the mesh scale, so `place` can reason about
 * where the drawn circle actually lands relative to the footprint.
 */
const INNER = 0.76
const OUTER = 0.92
const PLATEAU_IN = 0.82
const PLATEAU_OUT = 0.86

/** The ring is this much wider than the spawn's own footprint. */
const FOOTPRINT_MARGIN = 1.25
/** Radius bounds in yards, so a critter is still findable and a boss still fits. */
const MIN_RADIUS = 1.2
const MAX_RADIUS = 12

/** How far the ray looks for ground, above and below the spawn. */
const GROUND_PROBE_UP = 6
const GROUND_PROBE_RANGE = 120
/** Lift off the ground along its normal, so the ring never reads as buried. */
const GROUND_OFFSET = 0.08

const LOCAL_UP = new THREE.Vector3(0, 0, 1)

export class SelectionRing {
  readonly mesh: THREE.Mesh

  readonly #geometry: THREE.RingGeometry
  readonly #material: THREE.ShaderMaterial
  readonly #raycaster = new THREE.Raycaster()
  readonly #box = new THREE.Box3()
  readonly #size = new THREE.Vector3()
  readonly #point = new THREE.Vector3()
  readonly #scale = new THREE.Vector3()
  readonly #toTarget = new THREE.Matrix4()
  readonly #inverse = new THREE.Matrix4()
  readonly #origin = new THREE.Vector3()
  readonly #down = new THREE.Vector3(0, 0, -1)
  readonly #normal = new THREE.Vector3()

  constructor(color = 0x4ade80) {
    // Built in the XY plane, whose normal is +Z — which is up in WoW space, so
    // the default orientation is already flat on level ground.
    this.#geometry = new THREE.RingGeometry(INNER, OUTER, SEGMENTS)
    this.#material = new THREE.ShaderMaterial({
      uniforms: {
        ringColor: { value: new THREE.Color(color) },
        ringOpacity: { value: 0.85 },
      },
      vertexShader: `
        varying float vRadius;
        void main() {
          vRadius = length(position.xy);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 ringColor;
        uniform float ringOpacity;
        varying float vRadius;
        void main() {
          // Fade in off the inner edge and out again before the outer one, so
          // the band has no cut edge anywhere — this is what makes it read as
          // paint on the ground rather than as a solid washer lying on it.
          float band = smoothstep(${INNER.toFixed(2)}, ${PLATEAU_IN.toFixed(2)}, vRadius) *
                       (1.0 - smoothstep(${PLATEAU_OUT.toFixed(2)}, ${OUTER.toFixed(2)}, vRadius));
          if (band <= 0.002) discard;
          gl_FragColor = vec4(ringColor, ringOpacity * band);
        }
      `,
      transparent: true,
      depthWrite: false,
      // Deliberately drawn over the scene: in an editor, a selection you cannot
      // see behind a building is a selection you have lost. The soft band and
      // the ground-hugging orientation are what keep that from looking wrong.
      depthTest: false,
      side: THREE.DoubleSide,
    })

    this.mesh = new THREE.Mesh(this.#geometry, this.#material)
    this.mesh.name = 'selection-ring'
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 999
    this.mesh.visible = false
  }

  /**
   * Places the ring under `target`, sized to its footprint and laid flat
   * against the ground beneath it.
   *
   * `terrain` is the surface to probe; with none (or with none found under the
   * spawn, which happens over a tile still streaming in) the ring falls back to
   * the target's own position, level — the old behaviour, and still better
   * than not showing at all.
   */
  place(target: THREE.Object3D, terrain: THREE.Object3D | null): void {
    const radius = THREE.MathUtils.clamp(
      this.#footprint(target) * FOOTPRINT_MARGIN,
      MIN_RADIUS,
      MAX_RADIUS,
    )
    this.mesh.scale.setScalar(radius)

    this.mesh.position.copy(target.position)
    this.#normal.copy(LOCAL_UP)

    if (terrain) {
      // Start a little above the spawn: a spawn sitting fractionally under the
      // terrain would otherwise have its ground already behind the ray.
      this.#origin.set(target.position.x, target.position.y, target.position.z + GROUND_PROBE_UP)
      this.#raycaster.set(this.#origin, this.#down)
      this.#raycaster.far = GROUND_PROBE_RANGE
      const hit = this.#raycaster.intersectObject(terrain, true)[0]
      if (hit) {
        this.mesh.position.copy(hit.point)
        if (hit.face) {
          // Face normals are in object space; the terrain's own transform has
          // to be applied before it means anything in the world.
          this.#normal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld)
        }
      }
    }

    this.mesh.quaternion.setFromUnitVectors(LOCAL_UP, this.#normal)
    this.mesh.position.addScaledVector(this.#normal, GROUND_OFFSET)
    this.mesh.visible = true
  }

  /**
   * Half the larger horizontal side of what `target` draws, in yards. The
   * horizontal extent, not a bounding sphere: a tall thin model should not
   * get a wide ring just for being tall.
   *
   * Measured on the vertices rather than with `Box3.setFromObject`: an M2's
   * bounding box from @wowserhq/scene spans every animation it has — a
   * flight, a death throw, a spell wind-up — so culling never drops it
   * mid-sequence, and that made the ring 1.5 to 3 times the model (a roach
   * got 1.5 yd for a 0.5 yd body). This takes the bind pose, through the
   * geosets actually drawn (see `showCharacterGeosets`), in the target's own
   * frame so its facing does not widen the box, then applies its scale.
   */
  #footprint(target: THREE.Object3D): number {
    this.#box.makeEmpty()
    this.#inverse.copy(target.matrixWorld).invert()
    target.traverse(object => {
      const mesh = object as THREE.Mesh
      const position = mesh.isMesh ? mesh.geometry.getAttribute('position') : undefined
      if (!position) return
      this.#toTarget.multiplyMatrices(this.#inverse, mesh.matrixWorld)
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      const index = mesh.geometry.index
      const count = index ? index.count : position.count
      const groups =
        mesh.geometry.groups.length > 0 ? mesh.geometry.groups : [{ start: 0, count }]
      for (const group of groups) {
        const material = materials['materialIndex' in group ? group.materialIndex ?? 0 : 0]
        if (!material?.visible) continue
        const end = Math.min(group.start + group.count, count)
        for (let i = group.start; i < end; i++) {
          this.#point.fromBufferAttribute(position, index ? index.getX(i) : i)
          this.#box.expandByPoint(this.#point.applyMatrix4(this.#toTarget))
        }
      }
    })
    if (this.#box.isEmpty()) return 0
    this.#box.getSize(this.#size)
    this.#scale.setFromMatrixScale(target.matrixWorld)
    return Math.max(this.#size.x * this.#scale.x, this.#size.y * this.#scale.y) / 2
  }

  hide(): void {
    this.mesh.visible = false
  }

  dispose(): void {
    this.#geometry.dispose()
    this.#material.dispose()
  }
}

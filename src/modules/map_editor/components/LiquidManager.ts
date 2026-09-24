import * as THREE from 'three'
import type { LiquidMesh, MinimapMapInfo } from '../types'
import { loadAdtLiquids, tileWorldBounds, TILE_YARDS } from '../service'
import type { SceneLight } from '@wowserhq/scene'
import type { SceneAssets } from '@core/wow/SceneAssets'
import { FOG_FACTOR_GLSL, WHITE_TEXTURE } from '@core/wow/sceneShading'
import type { InstallQueue } from './InstallQueue'
import { TileWindow, type TileCoord } from './TileWindow'

/**
 * Streams ADT liquid (MH2O) meshes around the camera to complement
 * @wowserhq/scene's terrain, which doesn't render water.
 *
 * The Rust side returns world-space geometry per liquid category; this keeps
 * one THREE.Group per loaded tile, adding tiles the `TileWindow` asks for and
 * disposing the ones it drops. Scene space == WoW space, so vertices are used
 * as-is.
 *
 * Building the meshes is the expensive part — a tile's positions and indices
 * become GPU buffers — so it runs from the shared `InstallQueue` rather than
 * inline in the load path.
 *
 * Surfaces are the client's own animated textures, cycled frame by frame, over
 * UVs derived here from world position: the Rust side sends positions and
 * indices only, which is all the geometry needs but leaves a textured material
 * nothing to sample by.
 */

/** ADT tiles loaded around the camera's tile (Chebyshev radius). */
const LOAD_RADIUS = 2
/** Tiles are only freed one ring further out; see `TileWindow`. */
const KEEP_RADIUS = 3

/**
 * Client texture sets per liquid category, as numbered frames.
 *
 * These paths are the conventional 3.3.5 ones rather than a read of
 * `LiquidType.dbc`'s texture column, which the backend does not extract today
 * (it resolves types to categories and stops there). That is a guess, so the
 * loader treats a miss as ordinary: whatever fails to load leaves the category
 * on its flat colour, exactly as it rendered before, and says so once in the
 * console rather than failing silently. Wiring the DBC column through
 * `minimap_adt_liquids` would make it authoritative.
 */
const LIQUID_TEXTURES: Record<string, string> = {
  water: 'XTextures/river/lake_a',
  ocean: 'XTextures/ocean/ocean_h',
  magma: 'XTextures/lava/lava',
  slime: 'XTextures/slime/slime',
}

/** Frames to look for. The client ships 30; the loader stops at the first gap. */
const MAX_FRAMES = 30
/** Playback rate of the frame cycle. */
const FRAMES_PER_SECOND = 24
/**
 * World yards one texture repeat covers. An MH2O liquid cell is an eighth of a
 * chunk, i.e. a hundred-and-twenty-eighth of a tile, which is the granularity
 * the client tiles these textures at.
 */
const TEXTURE_YARDS = TILE_YARDS / 128
/**
 * How far above the camera a surface still counts as being over its head.
 *
 * The submerged test is a ray cast straight up, which on its own also answers
 * "is there a lake somewhere above me" — true whenever the camera flies under
 * the terrain, which in a fly-cam editor is often. Bounding it keeps the answer
 * to water the camera is plausibly inside; WoW's water bodies are shallower
 * than this almost everywhere.
 */
const SUBMERGED_MAX_DEPTH = 60

/**
 * The flat colour each category shows until (or unless) its frames load, and
 * how opaque its surface is. Water reads as translucent; magma is solid.
 */
const LIQUID_LOOKS: Record<string, { color: number; opacity: number }> = {
  water: { color: 0x2c6b9e, opacity: 0.6 },
  ocean: { color: 0x1f5c86, opacity: 0.62 },
  magma: { color: 0xff6a1a, opacity: 1 },
  slime: { color: 0x6aa832, opacity: 0.85 },
}

/**
 * The liquid surface shader: the current frame (or the flat colour), unlit,
 * faded by the scene's fog.
 *
 * Written in the terrain's terms rather than as a three.js material, like the
 * WMO shader (see wmoGeometry.ts): the frame's texels are the client's own
 * bytes and go out unconverted, where a built-in material encoded them to sRGB
 * and washed the water out. And it fogs with the library's curve, so a lake
 * fades into the haze with the shore around it instead of staying crisp to
 * the far plane and ending there in a hard line.
 */
const VERTEX_SHADER = /* glsl */ `
precision highp float;

uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform vec3 cameraPosition;
uniform vec4 fogParams;

in vec3 position;
in vec2 uv;

out vec2 vUv;
out float vFogFactor;

${FOG_FACTOR_GLSL}

void main() {
  vUv = uv;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vFogFactor = calculateFogFactor(fogParams, distance(cameraPosition, worldPosition.xyz));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const FRAGMENT_SHADER = /* glsl */ `
precision highp float;

uniform sampler2D map;
uniform vec3 tint;
uniform float alpha;
uniform vec3 fogColor;

in vec2 vUv;
in float vFogFactor;

out vec4 color;

void main() {
  // The frame contributes colour only: its alpha channel is not coverage in
  // the client, the liquid's own opacity is (see #loadFrames).
  color = vec4(texture(map, vUv).rgb * tint, alpha);
  color.rgb = mix(color.rgb, fogColor, vFogFactor);
}
`

/** One category's material, and the two inputs of it that change later. */
interface LiquidSurface {
  material: THREE.RawShaderMaterial
  /** The animation frame on show; white until the frames decode. */
  map: THREE.IUniform<THREE.Texture>
  /** The flat colour multiplied into the frame; white once frames load. */
  tint: THREE.Color
}

/**
 * Builds one surface per category, fogged by `light` (the scene light the
 * world view keeps on the zone's light).
 */
function makeSurfaces(light: SceneLight): Record<string, LiquidSurface> {
  const surfaces: Record<string, LiquidSurface> = {}
  for (const [category, look] of Object.entries(LIQUID_LOOKS)) {
    const map: THREE.IUniform<THREE.Texture> = { value: WHITE_TEXTURE }
    // Tagged linear so the hex reaches the shader as written: this pipeline
    // works in the client's gamma-space bytes, and an sRGB read would convert.
    const tint = new THREE.Color().setHex(look.color, THREE.LinearSRGBColorSpace)
    const translucent = look.opacity < 1
    const material = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        fogParams: light.uniforms.fogParams,
        fogColor: light.uniforms.fogColor,
        map,
        tint: { value: tint },
        alpha: { value: look.opacity },
      },
      transparent: translucent,
      depthWrite: !translucent,
      side: THREE.DoubleSide,
    })
    surfaces[category] = { material, map, tint }
  }
  return surfaces
}

export class LiquidManager {
  readonly root = new THREE.Group()

  readonly #surfaces: Record<string, LiquidSurface>
  #tiles = new Map<string, THREE.Group>()
  #loading = new Set<string>()
  #disposed = false
  readonly #map: MinimapMapInfo
  readonly #queue: InstallQueue
  readonly #window: TileWindow
  readonly #assets: SceneAssets
  /** Decoded animation frames per category; empty until (and unless) they load. */
  readonly #frames = new Map<string, THREE.Texture[]>()
  /** Seconds since the scene started, driving the frame cycle. */
  #elapsed = 0
  /** Reused by the submerged test, which runs every frame. */
  readonly #raycaster = new THREE.Raycaster()
  readonly #up = new THREE.Vector3(0, 0, 1)

  constructor(map: MinimapMapInfo, queue: InstallQueue, assets: SceneAssets) {
    this.#assets = assets
    this.#surfaces = makeSurfaces(assets.sceneLight)
    this.#map = map
    this.#queue = queue
    this.#window = new TileWindow(map, LOAD_RADIUS, KEEP_RADIUS)
    this.root.name = 'liquids'
    // Draw water after opaque terrain so translucency blends correctly.
    this.root.renderOrder = 1
    for (const category of Object.keys(LIQUID_TEXTURES)) {
      void this.#loadFrames(category)
    }
  }

  /**
   * Loads a category's animation frames, stopping at the first one missing.
   *
   * The frames are contiguous in the client, so a gap means the end of the run
   * — or, if it happens on the very first frame, that the path guessed in
   * `LIQUID_TEXTURES` is wrong for this client. That case is reported and then
   * left alone: the category keeps its flat colour and renders as it did.
   */
  async #loadFrames(category: string): Promise<void> {
    const base = LIQUID_TEXTURES[category]
    const surface = this.#surfaces[category]
    if (!base || !surface) return

    const frames: THREE.Texture[] = []
    for (let frame = 1; frame <= MAX_FRAMES; frame++) {
      try {
        frames.push(await this.#assets.textureManager.get(`${base}.${frame}.blp`))
      } catch {
        break
      }
      if (this.#disposed) return
    }

    if (frames.length === 0) {
      console.warn(
        `[liquids] no texture frames for "${category}" at ${base}.N.blp — ` +
          'keeping the flat colour. The path may differ in this client.',
      )
      return
    }
    if (this.#disposed) return

    this.#frames.set(category, frames)
    if (frames[0]) surface.map.value = frames[0]
    // The frames carry the liquid's own colour, so the flat tint that stood in
    // for them would only darken the texture.
    //
    // Their alpha channel is left out of the shader altogether: multiplied
    // into the opacity, 0.6 x a low texel alpha left the surface all but
    // invisible, with the riverbed showing straight through. The client does
    // not use that channel as coverage either; the transparency of water is a
    // property of the liquid, not of the frame.
    surface.tint.setScalar(1)
  }

  /**
   * Advances the frame cycle. Separate from `update` because that one
   * short-circuits whenever the tile window has not moved, which is most
   * frames — and the animation has to run on all of them.
   */
  advance(deltaTime: number): void {
    if (this.#frames.size === 0) return
    this.#elapsed += deltaTime
    for (const [category, frames] of this.#frames) {
      const surface = this.#surfaces[category]
      if (!surface || frames.length === 0) continue
      const index = Math.floor(this.#elapsed * FRAMES_PER_SECOND) % frames.length
      const frame = frames[index]
      // A new sampler value, not a new program: nothing recompiles.
      if (frame) surface.map.value = frame
    }
  }

  /**
   * The liquid category the camera is inside, or null in open air.
   *
   * Cast straight up: a liquid surface above the camera means the camera is
   * under it. The meshes are `DoubleSide`, so they register a hit from below.
   */
  submergedIn(cameraPosition: THREE.Vector3): string | null {
    if (this.#tiles.size === 0) return null
    this.#raycaster.set(cameraPosition, this.#up)
    this.#raycaster.far = SUBMERGED_MAX_DEPTH
    const hit = this.#raycaster.intersectObject(this.root, true)[0]
    return hit ? ((hit.object.userData.category as string | undefined) ?? 'water') : null
  }

  /** Loads/unloads tiles for the window (cheap unless a centre tile changed). */
  update(camera: TileCoord, lead: TileCoord): void {
    if (!this.#window.update(camera, lead)) return

    for (const [key, tile] of this.#window.load) {
      if (!this.#tiles.has(key) && !this.#loading.has(key)) {
        void this.#loadTile(tile.col, tile.row, key)
      }
    }

    for (const [key, group] of this.#tiles) {
      if (!this.#window.keeps(key)) {
        this.#disposeTile(group)
        this.#tiles.delete(key)
        continue
      }
      // Resident but outside the camera's own ring: held in memory, kept out
      // of the frame. Prefetching and hysteresis widen what we hold, and must
      // not widen what we draw.
      group.visible = this.#window.shows(key)
    }
  }

  async #loadTile(col: number, row: number, key: string): Promise<void> {
    this.#loading.add(key)
    let mesh: LiquidMesh
    try {
      mesh = await loadAdtLiquids(this.#map.name, col, row)
    } catch {
      return // tile has no ADT / failed: treated as no water
    } finally {
      this.#loading.delete(key)
    }
    // The map may have been switched/disposed, or the tile evicted, while
    // the request was in flight.
    if (this.#disposed || !this.#window.keeps(key)) return

    // Register the (still empty) group now — synchronously, so the tile is
    // never both un-loaded and un-loading — and fill it from the queue. An
    // empty group doubles as the record of a waterless tile, which is what
    // stops panning from re-requesting it.
    const group = new THREE.Group()
    group.visible = this.#window.shows(key)
    this.#tiles.set(key, group)

    await this.#queue.run(() => {
      // Evicted — or evicted and reloaded, hence the identity test — while it
      // sat in the queue.
      if (this.#disposed || this.#tiles.get(key) !== group) return
      for (const layer of mesh.layers) {
        const liquid = this.#surfaces[layer.category] ?? this.#surfaces.water
        if (layer.indices.length === 0 || !liquid) continue
        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(layer.positions, 3))
        // The backend sends positions and indices only. World XY doubles as
        // the texture coordinate: the surfaces are horizontal, so a planar
        // projection is exact.
        //
        // Relative to the tile's own corner, not to the world origin: world X
        // runs to ~17000, which over a 4-yard repeat is a UV past 4000, where
        // one float32 step is about an eighth of a texel — enough to make the
        // surface shimmer as the camera moves, and free to avoid. The offset
        // costs no seam because a tile is exactly 128 repeats across, so
        // neighbouring tiles stay in phase.
        const bounds = tileWorldBounds(col, row)
        const uvs = new Float32Array((layer.positions.length / 3) * 2)
        for (let i = 0, uv = 0; i < layer.positions.length; i += 3, uv += 2) {
          uvs[uv] = ((layer.positions[i] ?? 0) - bounds.minX) / TEXTURE_YARDS
          uvs[uv + 1] = ((layer.positions[i + 1] ?? 0) - bounds.minY) / TEXTURE_YARDS
        }
        geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
        geometry.setIndex(layer.indices)
        const surface = new THREE.Mesh(geometry, liquid.material)
        // Read back by `submergedIn` off the raycast hit.
        surface.userData.category = layer.category
        group.add(surface)
      }
      if (group.children.length > 0) this.root.add(group)
    })
  }

  #disposeTile(group: THREE.Group): void {
    this.root.remove(group)
    group.traverse(obj => {
      if (obj instanceof THREE.Mesh) obj.geometry.dispose()
    })
  }

  dispose(): void {
    this.#disposed = true
    for (const group of this.#tiles.values()) this.#disposeTile(group)
    this.#tiles.clear()
    this.#frames.clear()
    for (const { material } of Object.values(this.#surfaces)) material.dispose()
  }
}

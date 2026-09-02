import * as THREE from 'three'
import type { LiquidMesh, MinimapMapInfo } from '../types'
import { loadAdtLiquids, tileWorldBounds, TILE_YARDS } from '../service'
import type { SceneAssets } from '@core/wow/SceneAssets'
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

/** Flat, unlit materials keyed by liquid category; water reads as translucent. */
function makeMaterials(): Record<string, THREE.MeshBasicMaterial> {
  const water = new THREE.MeshBasicMaterial({
    color: 0x2c6b9e,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const ocean = new THREE.MeshBasicMaterial({
    color: 0x1f5c86,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const magma = new THREE.MeshBasicMaterial({ color: 0xff6a1a, side: THREE.DoubleSide })
  const slime = new THREE.MeshBasicMaterial({
    color: 0x6aa832,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  return { water, ocean, magma, slime }
}

export class LiquidManager {
  readonly root = new THREE.Group()

  #materials = makeMaterials()
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
    const material = this.#materials[category]
    if (!base || !material) return

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
    material.map = frames[0] ?? null
    // The frames carry the liquid's own colour, so the flat tint that stood in
    // for them would only darken the texture.
    material.color.setScalar(1)
    // The client's liquid BLPs carry an alpha channel of their own, and three
    // multiplies it into `opacity` — 0.6 x a low texel alpha left the surface
    // all but invisible, with the riverbed showing straight through. The
    // client does not use that channel as coverage either; the transparency of
    // water is a property of the liquid, not of the frame. So the map
    // contributes colour only and the alpha stays the material's.
    material.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        '#include <map_fragment>\n\tdiffuseColor.a = opacity;',
      )
    }
    material.needsUpdate = true
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
      const material = this.#materials[category]
      if (!material || frames.length === 0) continue
      const index = Math.floor(this.#elapsed * FRAMES_PER_SECOND) % frames.length
      const frame = frames[index]
      // Swapping the map between textures of the same shape does not rebuild
      // the program; only gaining or losing a map would.
      if (frame && material.map !== frame) material.map = frame
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
        if (layer.indices.length === 0) continue
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
        const material = this.#materials[layer.category] ?? this.#materials.water
        const surface = new THREE.Mesh(geometry, material)
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
    for (const material of Object.values(this.#materials)) material.dispose()
  }
}

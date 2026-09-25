import type * as THREE from 'three'
import { ModelManager, SceneLight, TextureManager } from '@wowserhq/scene'
import { MPQ_ASSET_BASE_URL } from './assetHost'

/**
 * The client-asset managers shared by every layer of the 3D view.
 *
 * Each @wowserhq/scene manager spins up its own web worker and its own cache,
 * so building one per layer meant the same BLP was fetched, decoded and
 * uploaded to the GPU up to three times — once for the terrain, once for a
 * WMO, once for a creature — and the same M2 twice. The library exposes no
 * teardown for those workers, so every map switch (and every flick of the
 * spawns toggle, which rebuilt the spawn manager from scratch) leaked another
 * set that kept running for the lifetime of the window.
 *
 * One TextureManager and one ModelManager are therefore built per scene and
 * handed to MapManager, WmoManager and CreatureSpawnManager. Sharing the
 * texture cache is safe: its keys include the wrap and filter modes, so a
 * texture requested with different sampling still gets an entry of its own,
 * and its refcount only drops to zero once every layer has released it.
 *
 * The model preview builds one of its own for its (separate) scene, which is
 * why this lives in core rather than under the map editor.
 *
 * MapManager's terrain doodads keep the ModelManager it builds internally, lit
 * by the map's MapLight, but they do draw from this texture cache. The world
 * view hands that same light to the models here each frame (`matchLight`), so
 * a creature or a building's props are lit like the trees around them.
 */
export class SceneAssets {
  readonly textureManager: TextureManager
  readonly modelManager: ModelManager
  readonly sceneLight = new SceneLight()

  constructor() {
    const host = { baseUrl: MPQ_ASSET_BASE_URL, normalizePath: true }
    this.textureManager = new TextureManager({ host })
    // Neutral daylight for the M2 shader: the library default is a strong blue
    // diffuse. What the model preview lights with; the world view replaces it
    // every frame with the zone's light (see `matchLight`).
    this.sceneLight.sunDir.set(-0.5, -0.3, -1).normalize()
    this.sceneLight.sunDiffuseColor.setScalar(1)
    this.sceneLight.sunAmbientColor.setScalar(0.65)
    this.modelManager = new ModelManager({
      host,
      textureManager: this.textureManager,
      sceneLight: this.sceneLight,
    })
  }

  /**
   * Lights every model with `light` for this frame: sun, ambient and fog.
   *
   * Copied value by value rather than by swapping the light object: each
   * material captured this scene light's uniform objects when it was built,
   * so the new values have to land in those very objects to reach the shader.
   * Call it after the source light has settled for the frame and before
   * `update`, which turns the copied sun direction into view space.
   */
  matchLight(light: SceneLight): void {
    this.sceneLight.sunDir.copy(light.sunDir)
    this.sceneLight.sunDiffuseColor.copy(light.sunDiffuseColor)
    this.sceneLight.sunAmbientColor.copy(light.sunAmbientColor)
    this.sceneLight.fogColor.copy(light.fogColor)
    this.sceneLight.fogParams.copy(light.fogParams)
  }

  /**
   * Per-frame model work: animations, billboard bones, and the sun uniforms
   * (the scene light bakes the sun direction into view space, so it must
   * follow the camera or the light would rotate with it).
   *
   * Call this exactly once per frame. It advances every animator by
   * `deltaTime`, so driving it per layer — as each manager used to do for its
   * own private copy — would now run animations at a multiple of real speed.
   */
  update(deltaTime: number, camera: THREE.Camera): void {
    this.sceneLight.update(camera)
    this.modelManager.update(deltaTime, camera)
  }
}

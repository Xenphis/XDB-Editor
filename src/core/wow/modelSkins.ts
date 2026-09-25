import type * as THREE from 'three'
import type { TextureManager } from '@wowserhq/scene'
import type { ComponentTextures } from './creatureDisplay'

/**
 * Fills a model's runtime texture slots with its display's images.
 *
 * M2s reference some textures only by kind — a creature's monster skins 1-3,
 * a character's body, hair, fur and cape, an item model's own skin — which
 * @wowserhq/scene's loader leaves as empty `THREE.Texture`s. Those sample
 * black, so an unfilled creature renders as a silhouette. The (patched)
 * loader tags each empty slot with its texture component and wrap modes, and
 * the slot gets the display's texture for that component: the monster skin
 * for its index, the baked body for a humanoid NPC's skin, and so on. Slots
 * the display has nothing for stay as they are.
 *
 * Shared by the map editor's spawn layer and the model preview: both place
 * creature models by display id and both need this or the creature is a
 * silhouette.
 */
export function applyModelSkins(
  model: THREE.Object3D,
  textures: ComponentTextures | undefined,
  textureManager: TextureManager,
): void {
  if (!textures) return
  const material = (model as THREE.Mesh).material
  const materials = Array.isArray(material) ? material : [material]
  for (const mat of materials) {
    const slots = (mat as THREE.RawShaderMaterial).uniforms?.textures?.value as
      | (THREE.Texture | undefined)[]
      | undefined
    if (!slots) continue
    slots.forEach((texture, slot) => {
      if (!texture || texture.image) return
      const { component, wrapS, wrapT } = texture.userData as {
        component?: number
        wrapS?: THREE.Wrapping
        wrapT?: THREE.Wrapping
      }
      const path = component === undefined ? undefined : textures[component]
      if (!path) return
      textureManager
        .get(path, wrapS, wrapT)
        .then(loaded => {
          slots[slot] = loaded
          ;(mat as THREE.RawShaderMaterial).uniformsNeedUpdate = true
        })
        .catch(() => {})
    })
  }
}

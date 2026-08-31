import type * as THREE from 'three'
import type { TextureManager } from '@wowserhq/scene'

/**
 * Textures a creature M2 with its display's skin variations.
 *
 * Creature M2s reference their skins by component slot (monster skin 1-3),
 * which @wowserhq/scene's loader leaves as empty `THREE.Texture`s — those
 * sample black, so untextured creatures render as silhouettes. The empty slots
 * are recognizable by their missing image and are filled in encounter order,
 * matching the variation order for the single-skin models that make up nearly
 * all creatures.
 *
 * Humanoid NPCs on character models (Defias, guards…) have no monster skins;
 * the backend resolves their single pre-baked body composite
 * (CreatureDisplayInfoExtra) into the same list, so it flows through the same
 * slot-filling here instead of leaving the body black.
 *
 * Shared by the map editor's spawn layer and the model preview: both place
 * creature models by display id and both need this or the creature is a
 * silhouette.
 */
export function applyModelSkins(
  model: THREE.Object3D,
  skins: string[] | undefined,
  textureManager: TextureManager,
): void {
  if (!skins || skins.length === 0) return
  const material = (model as THREE.Mesh).material
  const materials = Array.isArray(material) ? material : [material]
  let nextSkin = 0
  for (const mat of materials) {
    const textures = (mat as THREE.RawShaderMaterial).uniforms?.textures?.value as
      | (THREE.Texture | undefined)[]
      | undefined
    if (!textures) continue
    textures.forEach((texture, slot) => {
      if (!texture || texture.image) return
      const path = skins[Math.min(nextSkin, skins.length - 1)]
      nextSkin += 1
      if (!path) return
      textureManager
        .get(path)
        .then(loaded => {
          textures[slot] = loaded
          ;(mat as THREE.RawShaderMaterial).uniformsNeedUpdate = true
        })
        .catch(() => {})
    })
  }
}

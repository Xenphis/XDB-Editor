import * as THREE from 'three'
import type { TextureManager } from '@wowserhq/scene'

/**
 * Turns the Rust side's merged WMO batches into three.js meshes.
 *
 * @wowserhq/scene renders M2s but no WMO, so `minimap_wmo_model` extracts a
 * WMO's geometry as texture-grouped batches in WMO-local space and this builds
 * the drawable template from them. Shared by the map editor (which clones one
 * template per placement) and the model preview (which shows a single WMO
 * gameobject on its own).
 *
 * Structural batch shape, so callers keep their own module-level types.
 */
export interface WmoBatchGeometry {
  texture: string
  /** SMOGroup_EXTERIOR: sun-lit outdoor surface, vs. baked-MOCV interior. */
  exterior: boolean
  positions: number[]
  normals: number[]
  uvs: number[]
  /** Interior lighting to multiply the texture by; empty for exterior batches. */
  colors: number[]
  indices: number[]
  /** MOMT two-sided flag (0x04); everything else is front-facing only. */
  twoSided: boolean
  /** MOMT blend mode: 0 opaque, 1 alpha-key (cutout), 2 and up blended. */
  blendMode: number
}

/**
 * Alpha-key cutoff, as the client uses it: 224/255. A WMO alpha-key material
 * is not translucent — it is opaque with holes, so the fragments below the
 * cutoff are discarded and the surface still writes depth.
 */
const ALPHA_KEY_CUTOFF = 224 / 255

/**
 * Applies a MOMT blend mode to a three material.
 *
 * Only the three cases that change what you see in an editor are modelled:
 * opaque, cutout, and translucent. The client's higher modes (additive,
 * modulate, and their variants) are approximated as plain alpha blending —
 * getting them exactly right needs the per-mode blend equations, and every one
 * of them already looks closer to the truth than the opaque square they used
 * to render as.
 */
function applyBlendMode(material: THREE.Material, blendMode: number): void {
  if (blendMode === 0) return
  if (blendMode === 1) {
    material.alphaTest = ALPHA_KEY_CUTOFF
    // Smooths the cutout edge wherever MSAA is on (the render-quality preset
    // decides); a no-op without it, which is why it is safe to set here.
    material.alphaToCoverage = true
    return
  }
  material.transparent = true
  material.depthWrite = false
}

/** A built template plus the resources the caller must dispose of. */
export interface WmoTemplate {
  group: THREE.Group
  geometries: THREE.BufferGeometry[]
  materials: THREE.Material[]
}

export function buildWmoTemplate(
  batches: WmoBatchGeometry[],
  textureManager: TextureManager,
): WmoTemplate {
  const group = new THREE.Group()
  const geometries: THREE.BufferGeometry[] = []
  const materials: THREE.Material[] = []

  for (const batch of batches) {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(batch.positions, 3))
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(batch.normals, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(batch.uvs, 2))
    geometry.setIndex(batch.indices)
    // Facing comes from the material, not from a blanket DoubleSide: drawing a
    // one-sided wall from both sides shades every fragment of it twice, and
    // this view is fill-bound well before it is detail-bound.
    const side = batch.twoSided ? THREE.DoubleSide : THREE.FrontSide
    // Exterior groups are shaded by the scene's sun/ambient via their normals,
    // and carry no vertex color: in the client MOCV is *added* to that sun +
    // ambient term, and outdoor MOCV is near-black exactly because the sun
    // already lights those faces — multiplying by it turns a building into a
    // black silhouette. Interior groups are the unlit case, where the baked
    // MOCV the extractor sends is the whole light the texture is multiplied by.
    let material: THREE.MeshLambertMaterial | THREE.MeshBasicMaterial
    if (batch.exterior) {
      material = new THREE.MeshLambertMaterial({ side })
    } else {
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(batch.colors, 3))
      material = new THREE.MeshBasicMaterial({ side, vertexColors: true })
    }
    applyBlendMode(material, batch.blendMode)
    // Textures decode asynchronously via the scene's BLP worker.
    textureManager
      .get(batch.texture)
      .then(texture => {
        material.map = texture
        material.needsUpdate = true
      })
      .catch(() => {})
    geometries.push(geometry)
    materials.push(material)
    group.add(new THREE.Mesh(geometry, material))
  }

  return { group, geometries, materials }
}

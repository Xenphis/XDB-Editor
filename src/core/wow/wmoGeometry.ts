import * as THREE from 'three'
import type { SceneLight, TextureManager } from '@wowserhq/scene'
import { FOG_FACTOR_GLSL, WHITE_TEXTURE } from './sceneShading'

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
 * The WMO surface shader.
 *
 * It lights the way @wowserhq/scene lights terrain and M2s, and deliberately
 * nothing more: the same sun and ambient terms, clamped like the M2 shader, the
 * same fog curve, and the same colour handling — texels and light colours are
 * the client's own gamma-space bytes, multiplied as they are and written out
 * unconverted. A three.js lit material could not do that: it treats textures as
 * linear and encodes its output to sRGB, which lifted every dark texel and left
 * the buildings washed out next to the terrain and the props standing on them.
 *
 * The light comes from a `SceneLight`'s uniforms, shared by reference the way
 * the library shares them with its own materials, so writing that light is
 * enough to relight every WMO.
 *
 * Interior batches (BAKED_LIGHT) take the baked MOCV instead of the sun.
 */
const VERTEX_SHADER = /* glsl */ `
precision highp float;

uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat3 normalMatrix;
uniform mat4 projectionMatrix;
uniform vec3 cameraPosition;
uniform vec4 fogParams;

in vec3 position;
in vec3 normal;
in vec2 uv;
#ifdef BAKED_LIGHT
in vec3 color;
out vec3 vBakedLight;
#endif

out vec2 vUv;
out vec3 vViewNormal;
out float vFogFactor;

${FOG_FACTOR_GLSL}

void main() {
  vUv = uv;
  vViewNormal = normalize(normalMatrix * normal);
#ifdef BAKED_LIGHT
  vBakedLight = color;
#endif
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vFogFactor = calculateFogFactor(fogParams, distance(cameraPosition, worldPosition.xyz));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const FRAGMENT_SHADER = /* glsl */ `
precision highp float;

uniform sampler2D map;
uniform vec3 sunDir;
uniform vec3 sunDiffuseColor;
uniform vec3 sunAmbientColor;
uniform vec3 fogColor;

in vec2 vUv;
in vec3 vViewNormal;
in float vFogFactor;
#ifdef BAKED_LIGHT
in vec3 vBakedLight;
#endif

out vec4 color;

void main() {
  vec4 texel = texture(map, vUv);

#if defined(ALPHA_KEY)
  // The library's alpha-to-coverage test: a soft edge where MSAA is on, and
  // the plain cutoff where it is not.
  float alpha = smoothstep(${ALPHA_KEY_CUTOFF}, ${ALPHA_KEY_CUTOFF} + fwidth(texel.a), texel.a);
  if (alpha == 0.0) {
    discard;
  }
#elif defined(BLENDED)
  float alpha = texel.a;
#else
  float alpha = 1.0;
#endif

#ifdef BAKED_LIGHT
  vec3 light = vBakedLight;
#else
  vec3 viewNormal = normalize(vViewNormal);
  #ifdef DOUBLE_SIDED
    viewNormal *= gl_FrontFacing ? 1.0 : -1.0;
  #endif
  float lightFactor = clamp(dot(viewNormal, -sunDir), 0.0, 1.0);
  vec3 light = clamp(sunDiffuseColor * lightFactor + sunAmbientColor, 0.0, 1.0);
#endif

  color = vec4(texel.rgb * light, alpha);
  color.rgb = mix(color.rgb, fogColor, vFogFactor);
}
`

/**
 * Builds the material for one batch.
 *
 * Only the three MOMT blend modes that change what you see in an editor are
 * modelled: opaque, cutout, and translucent. The client's higher modes
 * (additive, modulate, and their variants) are approximated as plain alpha
 * blending — getting them exactly right needs the per-mode blend equations,
 * and every one of them already looks closer to the truth than the opaque
 * square they used to render as.
 */
function createMaterial(
  batch: WmoBatchGeometry,
  light: SceneLight,
  map: THREE.IUniform<THREE.Texture>,
): THREE.RawShaderMaterial {
  const material = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    uniforms: { ...light.uniforms, map },
    // Facing comes from the material, not from a blanket DoubleSide: drawing a
    // one-sided wall from both sides shades every fragment of it twice, and
    // the world view is fill-bound well before it is detail-bound.
    side: batch.twoSided ? THREE.DoubleSide : THREE.FrontSide,
  })
  if (batch.twoSided) material.defines.DOUBLE_SIDED = 1
  if (!batch.exterior) material.defines.BAKED_LIGHT = 1
  if (batch.blendMode === 1) {
    material.defines.ALPHA_KEY = 1
    // Smooths the cutout edge wherever MSAA is on (the render-quality preset
    // decides); a no-op without it, which is why it is safe to set here.
    material.alphaToCoverage = true
  } else if (batch.blendMode >= 2) {
    material.defines.BLENDED = 1
    material.transparent = true
    material.depthWrite = false
  }
  return material
}

/** A built template plus the resources the caller must dispose of. */
export interface WmoTemplate {
  group: THREE.Group
  geometries: THREE.BufferGeometry[]
  materials: THREE.Material[]
}

/**
 * `light` is whatever lights the rest of the scene — the map light in the
 * world view, the neutral preview light in the model viewer — so the batches
 * never need a three.js light of their own.
 */
export function buildWmoTemplate(
  batches: WmoBatchGeometry[],
  textureManager: TextureManager,
  light: SceneLight,
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
    // Exterior groups are shaded by the scene's sun/ambient via their normals,
    // and carry no vertex color: in the client MOCV is *added* to that sun +
    // ambient term, and outdoor MOCV is near-black exactly because the sun
    // already lights those faces — multiplying by it turns a building into a
    // black silhouette. Interior groups are the unlit case, where the baked
    // MOCV the extractor sends is the whole light the texture is multiplied by.
    if (!batch.exterior) {
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(batch.colors, 3))
    }
    const map: THREE.IUniform<THREE.Texture> = { value: WHITE_TEXTURE }
    const material = createMaterial(batch, light, map)
    // Textures decode asynchronously via the scene's BLP worker. Swapping the
    // sampler's texture needs no recompile, only the new value.
    textureManager
      .get(batch.texture)
      .then(texture => {
        map.value = texture
      })
      .catch(() => {})
    geometries.push(geometry)
    materials.push(material)
    group.add(new THREE.Mesh(geometry, material))
  }

  return { group, geometries, materials }
}

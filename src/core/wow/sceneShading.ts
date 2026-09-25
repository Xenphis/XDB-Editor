import * as THREE from 'three'

/**
 * Pieces shared by the shaders we write next to @wowserhq/scene's own (WMO
 * batches, liquids), so what we draw fades and fills in the way it does.
 */

/**
 * @wowserhq/scene's fog curve (shader/fog.js) as a GLSL function. `params` is
 * a `SceneLight`'s `fogParams` uniform; the result is how much of the fog
 * colour to mix in at `distance` yards from the camera. Using the library's
 * formula rather than three's fog is what makes a building or a lake fade
 * into the haze at exactly the rate of the ground around it.
 */
export const FOG_FACTOR_GLSL = /* glsl */ `
float calculateFogFactor(in vec4 params, in float distance) {
  float step = params.x;
  float end = params.y;
  float density = params.z;
  float multiplier = params.w;

  float base = max((distance * -(multiplier * step)) + (end * step), 0.0);
  return 1.0 - clamp(pow(base, density), 0.0, 1.0);
}
`

/**
 * One white texel, standing in for a texture that has not decoded yet (or
 * never will), so a surface shows untextured rather than black.
 */
export const WHITE_TEXTURE = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1)
WHITE_TEXTURE.needsUpdate = true

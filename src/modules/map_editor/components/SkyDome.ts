import * as THREE from 'three'

/**
 * A gradient sky behind the world.
 *
 * The view used to clear to `mapManager.clearColor` and nothing else, which
 * left a flat wall of colour at the horizon — the terrain read as a slab
 * floating in a void rather than as ground under a sky. This is one draw call
 * that fixes that.
 *
 * **The colour it has to work from.** @wowserhq/scene exposes none of
 * `Light.dbc`'s sky bands (SkyTop, SkyMiddle, SkyBand…): `SceneLightParams`
 * carries the sun colours, the fog colour and the fog band, and `clearColor`
 * *is* the fog colour. So the zenith is derived from the horizon rather than
 * read: same hue, more saturated, much darker. That tracks the zone honestly —
 * a grey, foggy zone gets a grey sky and a clear one gets a deep blue — and it
 * follows the day/night cycle for free, because the fog colour does.
 *
 * The horizon matches the fog exactly, which is the whole point: terrain fades
 * into fog, and the fog now meets a sky of the same colour instead of an edge.
 *
 * **Why it is never clipped or occluded.** The dome is drawn with no depth
 * test and no depth write, at `renderOrder = -1`, so it paints before anything
 * else and everything else paints over it. Depth is not what keeps it behind
 * the world — draw order is. Its radius therefore does not matter for
 * correctness, only for staying inside the frustum: 10 yards sits clear of the
 * near plane (1) and well inside the shortest far plane the quality presets
 * produce (283), so it survives every setting.
 *
 * It has no rotation and follows the camera's position each frame, so its
 * local axes are the world's — the gradient runs along local Z, which in WoW
 * space is up.
 */
export class SkyDome {
  readonly mesh: THREE.Mesh

  readonly #material: THREE.ShaderMaterial
  readonly #geometry: THREE.SphereGeometry
  /**
   * The two gradient colours. Held directly rather than reached through
   * `material.uniforms`, which is an index signature: the uniform objects hold
   * these very instances, so writing them here is what reaches the shader.
   */
  readonly #horizon = new THREE.Color(0.5, 0.6, 0.8)
  readonly #zenith = new THREE.Color(0.1, 0.2, 0.45)
  /** Scratch for the HSL round-trip, so `update` allocates nothing. */
  readonly #hsl = { h: 0, s: 0, l: 0 }
  /** Last fog colour turned into a zenith, to skip the conversion when static. */
  readonly #lastHorizon = new THREE.Color(-1, -1, -1)

  constructor() {
    this.#geometry = new THREE.SphereGeometry(10, 32, 16)
    this.#material = new THREE.ShaderMaterial({
      uniforms: {
        horizon: { value: this.#horizon },
        zenith: { value: this.#zenith },
      },
      vertexShader: `
        varying float vHeight;
        void main() {
          // The dome is unrotated and centred on the camera, so the normalized
          // local position is a world direction; its Z is the sine of the
          // elevation angle.
          vHeight = normalize(position).z;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 horizon;
        uniform vec3 zenith;
        varying float vHeight;
        void main() {
          // Bias and steepen the ramp: the horizon band should be a band, not
          // half the sky, and the ground half of the dome stays horizon-
          // coloured so terrain gaps read as haze rather than as holes.
          float t = clamp(vHeight * 1.4 + 0.15, 0.0, 1.0);
          gl_FragColor = vec4(mix(horizon, zenith, t), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthTest: false,
      depthWrite: false,
      fog: false,
    })

    this.mesh = new THREE.Mesh(this.#geometry, this.#material)
    this.mesh.name = 'sky'
    this.mesh.renderOrder = -1
    // It is always exactly around the camera; testing it against the frustum
    // is a test that can only ever pass.
    this.mesh.frustumCulled = false
  }

  /**
   * Re-centres the dome on the camera and re-reads the map light's fog colour.
   * Call once per frame, after `MapManager.update` has refreshed that colour.
   */
  update(cameraPosition: THREE.Vector3, fogColor: THREE.Color): void {
    this.mesh.position.copy(cameraPosition)
    if (fogColor.equals(this.#lastHorizon)) return
    this.#lastHorizon.copy(fogColor)

    this.#horizon.copy(fogColor)
    // Same hue, pushed saturated and dark. The floor on lightness keeps a
    // night sky from going pure black, where the gradient would disappear.
    fogColor.getHSL(this.#hsl)
    this.#zenith.setHSL(
      this.#hsl.h,
      Math.min(this.#hsl.s * 1.6 + 0.15, 1),
      Math.max(this.#hsl.l * 0.45, 0.03),
    )
  }

  dispose(): void {
    this.#geometry.dispose()
    this.#material.dispose()
  }
}

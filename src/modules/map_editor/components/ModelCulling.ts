import type * as THREE from 'three'
import { WORLD_FADE_DIST_MAX, WORLD_FADE_DIST_MIN, type ModelManager } from '@wowserhq/scene'

/**
 * Frustum and distance culling for the M2 models this module places itself:
 * creature spawns and the doodads inside WMOs.
 *
 * @wowserhq/scene's `Model` sets `frustumCulled = false` in its own
 * constructor — "model culling is handled by scene managers" — and instead
 * hands managers what they need to do it: a world-space bounding sphere
 * refreshed in `updateMatrixWorld`, a size category, and `hide()`/`show()`.
 * Setting `frustumCulled = true` would not work here, which is why this exists
 * rather than a one-line change at each placement site.
 *
 * Culling buys far more than the saved draw calls. `ModelAnimator.update`
 * walks every *visible* model each frame and, for skinned ones, recomputes the
 * whole bone hierarchy and re-uploads a bone texture — so without it, every
 * spawn ever streamed in was skinned on the CPU each frame no matter where the
 * camera pointed. `hide()` drops a model out of that loop and suspends its
 * animation actions too.
 */

/** The library's `Model` type, which the package does not export by name. */
export type SceneModel = Awaited<ReturnType<ModelManager['get']>>

/**
 * Yards over which a model fades out before `cullModel`'s `maxDistance`, so the
 * cap does not pop. The same order as the library's own fade bands.
 */
const CAP_FADE_YARDS = 10

/**
 * 1 = fully visible, 0 = past its cut-off, in between = fading out.
 *
 * The distances are @wowserhq/scene's own table — the one it culls the terrain
 * doodads by, indexed by `Model.sizeCategory` — read live rather than copied,
 * so a creature or a building's furniture fades at the same range as the
 * scenery around it, and follows the scale the view sets (`scaleFadeDist`).
 */
function fadeAt(distance: number, sizeCategory: number): number {
  const min = WORLD_FADE_DIST_MIN[sizeCategory]
  const max = WORLD_FADE_DIST_MAX[sizeCategory]
  // An unknown category means an unmeasured model: keep it visible rather
  // than silently dropping it from the scene.
  if (min === undefined || max === undefined) return 1
  if (distance < min) return 1
  if (distance > max) return 0
  const fade = 1 - (distance - min) / (max - min)
  if (fade <= 0.01) return 0
  return fade > 0.99 ? 1 : fade
}

/**
 * Hides or shows one model for this frame. Distance is measured to the
 * model's world-space bounding sphere rather than to `position`, which is
 * local: a WMO's doodads are children of the placement group, so their
 * `position` is in WMO space and would put every one of them near the origin.
 *
 * `maxDistance` caps the size-category table: past it the model is gone
 * whatever its size, having faded out over the last `CAP_FADE_YARDS`.
 */
export function cullModel(
  model: SceneModel,
  frustum: THREE.Frustum,
  cameraPosition: THREE.Vector3,
  maxDistance = Infinity,
): void {
  const sphere = model.boundingSphereWorld
  const distance = cameraPosition.distanceTo(sphere.center)
  const capFade = Math.min(Math.max((maxDistance - distance) / CAP_FADE_YARDS, 0), 1)
  const fade = Math.min(fadeAt(distance, model.sizeCategory), capFade)
  if (fade === 0 || !frustum.intersectsSphere(sphere)) {
    model.hide()
    return
  }
  model.alpha = fade
  model.show()
}

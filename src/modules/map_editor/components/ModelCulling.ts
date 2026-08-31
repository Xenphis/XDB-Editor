import type * as THREE from 'three'
import type { ModelManager } from '@wowserhq/scene'

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
 * Distance at which a model of each size category has fully faded out, and the
 * distance at which it starts to, both in yards and indexed by
 * `Model.sizeCategory`.
 *
 * These reproduce the table @wowserhq/scene applies to the terrain doodads it
 * culls itself (its WORLD_FADE_DIST values at the 1.5 scale it sets on load),
 * so a creature or a building's furniture fades at the same range as the
 * scenery around it instead of popping on a rule of its own. They are not
 * exported by the package, hence the copy.
 */
const FADE_DIST_MAX = [30, 150, 300, 1125, 1250]
const FADE_DIST_MIN = [25, 140, 285, 1105, 1200]

/** 1 = fully visible, 0 = past its cut-off, in between = fading out. */
function fadeAt(distance: number, sizeCategory: number): number {
  const min = FADE_DIST_MIN[sizeCategory]
  const max = FADE_DIST_MAX[sizeCategory]
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
 */
export function cullModel(
  model: SceneModel,
  frustum: THREE.Frustum,
  cameraPosition: THREE.Vector3,
): void {
  const sphere = model.boundingSphereWorld
  const fade = fadeAt(cameraPosition.distanceTo(sphere.center), model.sizeCategory)
  if (fade === 0 || !frustum.intersectsSphere(sphere)) {
    model.hide()
    return
  }
  model.alpha = fade
  model.show()
}

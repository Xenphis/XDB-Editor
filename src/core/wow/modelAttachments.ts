import * as THREE from 'three'
import type { ModelManager, TextureManager } from '@wowserhq/scene'
import { applyModelSkins } from './modelSkins'
import { TEXTURE_COMPONENT, type AttachmentPoint, type ItemAttachment } from './creatureDisplay'

type Model = Awaited<ReturnType<ModelManager['get']>>

/** Item models hung on a body; `sync` keeps them on its animated bones. */
export interface AttachedModels {
  /**
   * Moves every item onto its bone's current pose. Call it each frame after
   * the animation pass (`SceneAssets.update`) and before rendering.
   */
  sync(camera: THREE.Camera): void
  dispose(): void
}

interface Attached {
  model: Model
  bone: number
  /** The attachment's offset from its bone (bind-pose model space). */
  offset: THREE.Matrix4
}

const _viewToModel = new THREE.Matrix4()

/**
 * Hangs item models (helm, shoulder pads) on a character body's attachment
 * points, as the client does for an NPC's worn items.
 *
 * The item models become children of the body, so they follow its placement,
 * visibility and scale. Their local matrix is the bone's current pose times
 * the attachment offset. @wowserhq/scene computes bone matrices in view space
 * (the body's model-view matrix is baked in), so the bone's pose in model
 * space is recovered by undoing that model-view matrix.
 *
 * Items whose attachment point the body lacks, or whose model fails to load,
 * are left out rather than failing the whole creature.
 */
export async function attachItemModels(
  body: Model,
  items: ItemAttachment[],
  points: AttachmentPoint[],
  managers: { modelManager: ModelManager; textureManager: TextureManager },
): Promise<AttachedModels> {
  const byId = new Map(points.map(point => [point.id, point]))
  const loaded = await Promise.all(
    items.map(async (item): Promise<Attached | null> => {
      const point = byId.get(item.point)
      if (!point) return null
      let model: Model
      try {
        model = await managers.modelManager.get(item.model)
      } catch {
        return null
      }
      if (item.texture) {
        applyModelSkins(model, { [TEXTURE_COMPONENT.objectSkin]: item.texture }, managers.textureManager)
      }
      const offset = new THREE.Matrix4().makeTranslation(...point.position)
      // The pose is written straight into the local matrix every frame.
      model.matrixAutoUpdate = false
      model.matrix.copy(offset)
      body.add(model)
      return { model, bone: point.bone, offset }
    }),
  )
  const attached = loaded.filter((a): a is Attached => a !== null)
  body.updateMatrixWorld(true)

  return {
    sync(camera) {
      if (attached.length === 0) return
      // Only a skinned, visible body has its bones posed this frame; anything
      // else stays in bind pose, where the offset alone is right.
      const bones = body.skinned && body.visible ? body.animation.skeleton?.bones : undefined
      if (bones) _viewToModel.copy(body.modelViewMatrix).invert()
      for (const { model, bone, offset } of attached) {
        const pose = bones?.[bone]
        if (pose) model.matrix.multiplyMatrices(_viewToModel, pose.matrix).multiply(offset)
        else model.matrix.copy(offset)
        model.matrixWorldNeedsUpdate = true
        model.updateMatrixWorld()
        // An animated item baked its own skeleton during the animation pass,
        // from last frame's placement; redo it from this one.
        if (model.skinned && model.visible) model.updateSkeleton(camera)
      }
    },
    dispose() {
      for (const { model } of attached) {
        body.remove(model)
        model.dispose()
      }
    },
  }
}

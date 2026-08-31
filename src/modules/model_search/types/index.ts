import type { ModelKind } from '@/modules/model_viewer/types'

export type { ModelKind }

/**
 * One row of `creature_model_tags` / `gameobject_model_tags`: a model display id
 * with an optional label and up to 3 free-form tags. Mirrors the DB columns.
 */
export interface ModelTag {
  displayId: number
  name: string | null
  tags01: string | null
  tags02: string | null
  tags03: string | null
}

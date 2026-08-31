import { invoke } from '@tauri-apps/api/core'
import type { ModelKind, ModelTag } from '@/modules/model_search/types'

/** Search creature models by tag (substring match on tags01..03 + name). */
export async function searchCreatureModelTags(search: string, limit?: number): Promise<ModelTag[]> {
  return invoke('search_creature_model_tags', { search, limit })
}

/** Search gameobject models by tag (substring match on tags01..03 + name). */
export async function searchGameObjectModelTags(search: string, limit?: number): Promise<ModelTag[]> {
  return invoke('search_gameobject_model_tags', { search, limit })
}

/** Dispatch to the right search command for the given model kind. */
export async function searchModelTags(kind: ModelKind, search: string, limit?: number): Promise<ModelTag[]> {
  return kind === 'creature'
    ? searchCreatureModelTags(search, limit)
    : searchGameObjectModelTags(search, limit)
}

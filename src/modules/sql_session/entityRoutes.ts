import type { EntityId } from '@core/stores/sessionTracker'
import { decodeScriptKey } from '@/modules/smart_scripts/stores/scriptSet'
import {
  SAI_SOURCE_TYPE_CREATURE,
  SAI_SOURCE_TYPE_GAMEOBJECT,
} from '@/modules/smart_scripts/types/sai'

/**
 * Maps a tracked entity back to the editor route that owns it, so the session
 * panel can jump to what changed. Keys are the `tableName` of each editor store
 * registered with createEntityEditorStore (the tracker's scopeId).
 * Returns null for tables with no dedicated editor route.
 */
export function resolveEntityRoute(table: string, id: EntityId): string | null {
  const numericId = typeof id === 'number' ? id : Number(id)
  if (Number.isNaN(numericId)) return null

  switch (table) {
    case 'creature_template':
      return `/npc/creature-template/${numericId}`
    case 'gameobject_template':
      return `/object/gameobject-template/${numericId}`
    case 'item_template':
      return `/object/item-template/${numericId}`
    case 'quest_template':
      return `/quests/${numericId}`
    case 'trainer':
      return `/npc/trainer/${numericId}`
    case 'smart_scripts': {
      // The tracker id is the encoded (entryorguid, source_type) pair.
      const { entryorguid, sourceType } = decodeScriptKey(numericId)
      if (entryorguid > 0) {
        if (sourceType === SAI_SOURCE_TYPE_CREATURE) {
          return `/npc/creature-template/${entryorguid}?tab=sai`
        }
        if (sourceType === SAI_SOURCE_TYPE_GAMEOBJECT) {
          return `/object/gameobject-template/${entryorguid}?tab=sai`
        }
      }
      return `/smart-scripts/${sourceType}/${entryorguid}`
    }
    default:
      return null
  }
}

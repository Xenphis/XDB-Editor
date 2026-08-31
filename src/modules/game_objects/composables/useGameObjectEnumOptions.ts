import { computed, type ComputedRef } from 'vue'
import { useI18n } from 'vue-i18n'
import type { BitmaskOption, SelectOption } from '@core/types/common'
import {
  spawn_mask_options,
  go_flag_options,
  invisibility_type_options,
  game_object_type_options,
} from '@/modules/game_objects/types/defines'

/**
 * Translated, locale-reactive versions of every enum/bitmask option list consumed by the
 * GameObject (gameobject_template + gameobject) editors. `defines.ts` stays the source of
 * truth for value/hex — only the display name/comment is swapped for a
 * `gameobject_enums.<category>.*` i18n lookup.
 */
export function useGameObjectEnumOptions() {
  const { t } = useI18n()

  function translate<T extends BitmaskOption | SelectOption>(category: string, options: T[]): ComputedRef<T[]> {
    return computed(() => options.map(o => ({
      ...o,
      name: t(`gameobject_enums.${category}.${o.value}.name`),
      comment: o.comment ? t(`gameobject_enums.${category}.${o.value}.comment`) : o.comment,
    })))
  }

  return {
    spawnMaskOptions: translate('spawn_mask_options', spawn_mask_options),
    goFlagOptions: translate('go_flag_options', go_flag_options),
    invisibilityTypeOptions: translate('invisibility_type_options', invisibility_type_options),
    gameObjectTypeOptions: translate('game_object_type_options', game_object_type_options),
  }
}

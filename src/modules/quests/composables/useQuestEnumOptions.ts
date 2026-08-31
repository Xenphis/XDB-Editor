import { computed, type ComputedRef } from 'vue'
import { useI18n } from 'vue-i18n'
import type { BitmaskOption } from '@core/types/common'
import { quest_flags_options } from '@/modules/quests/types/quest_template'
import { quest_special_flags_options } from '@/modules/quests/types/quest_template_addon'

/**
 * Translated, locale-reactive versions of the quest_template/quest_template_addon bitmask
 * option lists. The flag `name` is a TrinityCore constant identifier (e.g. `STAY_ALIVE`) and
 * stays the same in every locale — only `comment` (the human-readable description shown in
 * BitmaskField) is translated.
 */
export function useQuestEnumOptions() {
  const { t } = useI18n()

  function translate<T extends BitmaskOption>(category: string, options: T[]): ComputedRef<T[]> {
    return computed(() => options.map(o => ({
      ...o,
      name: t(`quest_enums.${category}.${o.value}.name`),
      comment: o.comment ? t(`quest_enums.${category}.${o.value}.comment`) : o.comment,
    })))
  }

  return {
    questFlagsOptions: translate('quest_flags_options', quest_flags_options),
    questSpecialFlagsOptions: translate('quest_special_flags_options', quest_special_flags_options),
  }
}

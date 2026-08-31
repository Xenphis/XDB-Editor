import { computed, type ComputedRef } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  item_class_options,
  item_subclass_options,
  item_quality_options,
  inventory_type_options,
  honor_rank_options,
  reputation_rank_options,
  stat_type_options,
  damage_type_options,
  spell_trigger_options,
  bonding_options,
  language_options,
  material_options,
  sheath_options,
  socket_color_options,
  bag_family_options,
  totem_category_options,
  food_type_options,
  ITEM_FLAGS,
  ITEM_FLAGS_EXTRA,
  ALLOWABLE_CLASS,
  ALLOWABLE_RACE,
} from '@/modules/item/types/defines'

/**
 * Translated, locale-reactive versions of every enum/bitmask option list consumed by the
 * item_template editor. `defines.ts` stays the source of truth for value/hex — only the
 * display name/comment is swapped for an `item_enums.<category>.*` i18n lookup.
 */
export function useItemEnumOptions() {
  const { t } = useI18n()

  function translate<T extends { value: number | string; name: string; comment?: string }>(category: string, options: T[]): ComputedRef<T[]> {
    return computed(() => options.map(o => ({
      ...o,
      name: t(`item_enums.${category}.${o.value}.name`),
      comment: o.comment ? t(`item_enums.${category}.${o.value}.comment`) : o.comment,
    })))
  }

  return {
    itemClassOptions: translate('item_class_options', item_class_options),
    itemSubclassOptions: translate('item_subclass_options', item_subclass_options),
    itemQualityOptions: translate('item_quality_options', item_quality_options),
    inventoryTypeOptions: translate('inventory_type_options', inventory_type_options),
    honorRankOptions: translate('honor_rank_options', honor_rank_options),
    reputationRankOptions: translate('reputation_rank_options', reputation_rank_options),
    statTypeOptions: translate('stat_type_options', stat_type_options),
    damageTypeOptions: translate('damage_type_options', damage_type_options),
    spellTriggerOptions: translate('spell_trigger_options', spell_trigger_options),
    bondingOptions: translate('bonding_options', bonding_options),
    languageOptions: translate('language_options', language_options),
    materialOptions: translate('material_options', material_options),
    sheathOptions: translate('sheath_options', sheath_options),
    socketColorOptions: translate('socket_color_options', socket_color_options),
    bagFamilyOptions: translate('bag_family_options', bag_family_options),
    totemCategoryOptions: translate('totem_category_options', totem_category_options),
    foodTypeOptions: translate('food_type_options', food_type_options),
    itemFlags: translate('ITEM_FLAGS', ITEM_FLAGS),
    itemFlagsExtra: translate('ITEM_FLAGS_EXTRA', ITEM_FLAGS_EXTRA),
    allowableClassOptions: translate('ALLOWABLE_CLASS', ALLOWABLE_CLASS),
    allowableRaceOptions: translate('ALLOWABLE_RACE', ALLOWABLE_RACE),
  }
}

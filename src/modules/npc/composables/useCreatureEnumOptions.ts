import { computed, type ComputedRef } from 'vue'
import { useI18n } from 'vue-i18n'
import type { BitmaskOption, SelectOption } from '@core/types/common'
import { locale_options as creatureTextLocaleOptions, type LocaleSelectOption } from '@/modules/npc/types/creature_template/creature_text_locale'
import {
  npc_flags,
  unit_flags_options,
  unit_flags2_options,
  dynamicflags_options,
  type_flags_options,
  mechanic_immune_mask_options,
  spell_school_immune_mask_options,
  flags_extra_options,
  movement_type_options,
  spawn_mask_options,
  stand_state_types,
  anim_tier_types,
  visibility_distance_options,
  sheath_state_types,
  spell_school_types,
  vis_flags_options,
  pvp_flags_options,
  difficulty_entry_options,
  icon_name,
  rank_options,
  dmg_school_options,
  unit_class_options,
  family_options,
  type_options,
  ground_movement_options,
  swim_movement_options,
  flight_movement_options,
  rooted_options,
  chase_movement_options,
  random_movement_options,
  creature_text_type_options,
  creature_text_language_options,
  creature_text_range_options,
} from '@/modules/npc/types/defines'

/**
 * Translated, locale-reactive versions of every enum/bitmask option list consumed by the
 * Creature (creature_template + creature) editors. `defines.ts` stays the source of truth
 * for value/hex — only the display name/comment is swapped for a `creature_enums.<category>.*`
 * i18n lookup, so callers keep passing the result straight into <Select>/<BitmaskField> exactly
 * like the raw defines.ts arrays before.
 */
export function useCreatureEnumOptions() {
  const { t } = useI18n()

  function translate<T extends BitmaskOption | SelectOption>(category: string, options: T[]): ComputedRef<T[]> {
    return computed(() => options.map(o => ({
      ...o,
      name: t(`creature_enums.${category}.${o.value}.name`),
      comment: o.comment ? t(`creature_enums.${category}.${o.value}.comment`) : o.comment,
    })))
  }

  function translateLocale(options: LocaleSelectOption[]): ComputedRef<LocaleSelectOption[]> {
    return computed(() => options.map(o => ({
      ...o,
      name: t(`creature_enums.creature_text_locale.${o.value}.name`),
    })))
  }

  return {
    npcFlags: translate('npc_flags', npc_flags),
    unitFlagsOptions: translate('unit_flags_options', unit_flags_options),
    unitFlags2Options: translate('unit_flags2_options', unit_flags2_options),
    dynamicflagsOptions: translate('dynamicflags_options', dynamicflags_options),
    typeFlagsOptions: translate('type_flags_options', type_flags_options),
    mechanicImmuneMaskOptions: translate('mechanic_immune_mask_options', mechanic_immune_mask_options),
    spellSchoolImmuneMaskOptions: translate('spell_school_immune_mask_options', spell_school_immune_mask_options),
    flagsExtraOptions: translate('flags_extra_options', flags_extra_options),
    movementTypeOptions: translate('movement_type_options', movement_type_options),
    spawnMaskOptions: translate('spawn_mask_options', spawn_mask_options),
    standStateOptions: translate('stand_state_types', stand_state_types),
    animTierOptions: translate('anim_tier_types', anim_tier_types),
    visibilityDistanceOptions: translate('visibility_distance_options', visibility_distance_options),
    sheathStateOptions: translate('sheath_state_types', sheath_state_types),
    spellSchoolOptions: translate('spell_school_types', spell_school_types),
    visFlagsOptions: translate('vis_flags_options', vis_flags_options),
    pvpFlagsOptions: translate('pvp_flags_options', pvp_flags_options),
    difficultyEntryOptions: translate('difficulty_entry_options', difficulty_entry_options),
    iconOptions: translate('icon_name', icon_name),
    rankOptions: translate('rank_options', rank_options),
    dmgSchoolOptions: translate('dmg_school_options', dmg_school_options),
    unitClassOptions: translate('unit_class_options', unit_class_options),
    familyOptions: translate('family_options', family_options),
    typeOptions: translate('type_options', type_options),
    groundMovementOptions: translate('ground_movement_options', ground_movement_options),
    swimMovementOptions: translate('swim_movement_options', swim_movement_options),
    flightMovementOptions: translate('flight_movement_options', flight_movement_options),
    rootedOptions: translate('rooted_options', rooted_options),
    chaseMovementOptions: translate('chase_movement_options', chase_movement_options),
    randomMovementOptions: translate('random_movement_options', random_movement_options),
    textTypeOptions: translate('creature_text_type_options', creature_text_type_options),
    textLanguageOptions: translate('creature_text_language_options', creature_text_language_options),
    textRangeOptions: translate('creature_text_range_options', creature_text_range_options),
    textLocaleOptions: translateLocale(creatureTextLocaleOptions),
  }
}

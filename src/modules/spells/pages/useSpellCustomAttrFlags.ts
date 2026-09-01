import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { BitmaskOption } from '@core/types/common'
import { spell_custom_attr_flag_defs } from '@/modules/spells/types'

/**
 * Resolves `spell_custom_attr_flag_defs` into the `BitmaskOption[]`
 * `BitmaskField` expects, with `name`/`comment` translated instead of
 * hardcoded — see the doc comment on `SpellCustomAttrFlagDef`.
 */
export function useSpellCustomAttrFlags() {
  const { t } = useI18n()

  return computed<BitmaskOption[]>(() =>
    spell_custom_attr_flag_defs.map(def => ({
      value: def.value,
      hex: def.hex,
      name: t(`spells.customAttrFlags.${def.key}.name`),
      comment: t(`spells.customAttrFlags.${def.key}.comment`),
    })),
  )
}

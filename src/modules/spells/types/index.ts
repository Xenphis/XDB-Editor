/**
 * `spell_bonus_data`, `spell_threat`, `spell_custom_attr`: optional per-spell
 * override rows edited together as one spell's "tuning". Each `*Form` type
 * mirrors its table's columns minus `entry` — `entry` is the shared key,
 * injected by the `ReactiveSubTable` bindings in `store.ts`, exactly like
 * `creature_template_addon`'s `AddonForm` in the NPC module. The plain
 * `SpellBonusData` / `SpellThreat` / `SpellCustomAttr` types (with `entry`)
 * mirror the Rust structs one-for-one, for `service.ts`.
 */

export interface SpellBonusData extends SpellBonusForm {
  entry: number
}

export interface SpellThreat extends SpellThreatForm {
  entry: number
}

export interface SpellCustomAttr extends SpellCustomAttrForm {
  entry: number
}

/** `spell_bonus_data`: healing/damage coefficients TrinityCore would
 *  otherwise compute from the spell's own effect data. */
export interface SpellBonusForm {
  direct_bonus: number
  dot_bonus: number
  ap_bonus: number
  ap_dot_bonus: number
  comments: string | null
}

export function createDefaultSpellBonusForm(): SpellBonusForm {
  return { direct_bonus: 0, dot_bonus: 0, ap_bonus: 0, ap_dot_bonus: 0, comments: null }
}

/** `spell_threat`: threat overrides. `pctMod` defaults to 1 (its DB default)
 *  so a freshly added row is a no-op multiplier until edited. */
export interface SpellThreatForm {
  flatMod: number | null
  pctMod: number
  apPctMod: number
}

export function createDefaultSpellThreatForm(): SpellThreatForm {
  return { flatMod: null, pctMod: 1, apPctMod: 0 }
}

/** `spell_custom_attr`: `SpellCustomAttributes` bitmask. */
export interface SpellCustomAttrForm {
  attributes: number
}

export function createDefaultSpellCustomAttrForm(): SpellCustomAttrForm {
  return { attributes: 0 }
}

/**
 * `SpellCustomAttributes` (TrinityCore 3.3.5, `SpellInfo.h`): engine-behavior
 * flags for a spell, distinct from the DBC's own `Attributes` fields — these
 * are core-computed or DB-overridden, not authored by Blizzard.
 *
 * `value`/`hex` are fixed data; `key` is only an i18n lookup key (resolved
 * against `spells.customAttrFlags.<key>.name` / `.comment` — see
 * `useSpellCustomAttrFlags` in `pages/`) rather than the flags carrying their
 * own hardcoded English label the way `BitmaskOption` normally would, so the
 * bitmask dialog is translated like the rest of this module instead of being
 * the one untranslated part of it.
 */
export interface SpellCustomAttrFlagDef {
  value: number
  hex: string
  key: string
}

export const spell_custom_attr_flag_defs: SpellCustomAttrFlagDef[] = [
  { value: 0x00000001, hex: '0x00000001', key: 'enchantProc' },
  { value: 0x00000002, hex: '0x00000002', key: 'coneBack' },
  { value: 0x00000004, hex: '0x00000004', key: 'coneLine' },
  { value: 0x00000008, hex: '0x00000008', key: 'shareDamage' },
  { value: 0x00000010, hex: '0x00000010', key: 'noInitialThreat' },
  { value: 0x00000020, hex: '0x00000020', key: 'auraCc' },
  { value: 0x00000040, hex: '0x00000040', key: 'dontBreakStealth' },
  { value: 0x00000080, hex: '0x00000080', key: 'canCrit' },
  { value: 0x00000100, hex: '0x00000100', key: 'directDamage' },
  { value: 0x00000200, hex: '0x00000200', key: 'charge' },
  { value: 0x00000400, hex: '0x00000400', key: 'pickpocket' },
  { value: 0x00000800, hex: '0x00000800', key: 'rollingPeriodic' },
  { value: 0x00001000, hex: '0x00001000', key: 'negativeEffect0' },
  { value: 0x00002000, hex: '0x00002000', key: 'negativeEffect1' },
  { value: 0x00004000, hex: '0x00004000', key: 'negativeEffect2' },
  { value: 0x00008000, hex: '0x00008000', key: 'ignoreArmor' },
  { value: 0x00010000, hex: '0x00010000', key: 'requiresTargetFacingCaster' },
  { value: 0x00020000, hex: '0x00020000', key: 'requiresCasterBehindTarget' },
  { value: 0x00040000, hex: '0x00040000', key: 'allowInflightTarget' },
  { value: 0x00080000, hex: '0x00080000', key: 'needsAmmoData' },
  { value: 0x00100000, hex: '0x00100000', key: 'binarySpell' },
  { value: 0x00200000, hex: '0x00200000', key: 'schoolmaskNormalWithMagic' },
  { value: 0x00400000, hex: '0x00400000', key: 'deprecatedLiquidAura' },
  { value: 0x00800000, hex: '0x00800000', key: 'isTalent' },
  { value: 0x01000000, hex: '0x01000000', key: 'auraCannotBeSaved' },
  { value: 0x02000000, hex: '0x02000000', key: 'canTargetAnyPrivateObject' },
]

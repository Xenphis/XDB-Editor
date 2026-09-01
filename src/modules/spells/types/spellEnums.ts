/**
 * Small, fixed TrinityCore 3.3.5 enums (`SharedDefines.h`) shown on the
 * spells Info tab. Unlike `spellEffectNames`/`spellAuraNames` (generated,
 * left in their raw English DBC-derived form — see that file's doc comment),
 * these are compact enough to translate properly: each maps an id to an i18n
 * key resolved against `spells.<category>.<key>` in the module locales.
 */

/** `SpellSchoolMask`: a spell's school(s) is a bitmask, not a single value
 *  (e.g. Frostfire = Fire | Frost) — hence a list of (bit, key) pairs rather
 *  than a lookup by a single numeric value. */
export interface SpellSchoolOption {
  mask: number
  key: string
  /** WoW's own school color, for the badge — not translated. */
  color: string
}

export const spellSchools: SpellSchoolOption[] = [
  { mask: 0x01, key: 'physical', color: '#c79c6e' },
  { mask: 0x02, key: 'holy', color: '#fffea3' },
  { mask: 0x04, key: 'fire', color: '#ff7c0a' },
  { mask: 0x08, key: 'nature', color: '#4dc94d' },
  { mask: 0x10, key: 'frost', color: '#68ccef' },
  { mask: 0x20, key: 'shadow', color: '#8788ee' },
  { mask: 0x40, key: 'arcane', color: '#ff80ff' },
]

/** `DispelType`. 11 (`DESPEL_OLD_UNUSED`) is dead in TrinityCore itself. */
export const dispelTypeKeys: Record<number, string> = {
  0: 'none',
  1: 'magic',
  2: 'curse',
  3: 'disease',
  4: 'poison',
  5: 'stealth',
  6: 'invisibility',
  7: 'all',
  8: 'npcOnly',
  9: 'enrage',
  10: 'zgTicket',
}

/** `Mechanics`. */
export const mechanicKeys: Record<number, string> = {
  0: 'none',
  1: 'charm',
  2: 'disoriented',
  3: 'disarm',
  4: 'distract',
  5: 'fear',
  6: 'grip',
  7: 'root',
  8: 'slowAttack',
  9: 'silence',
  10: 'sleep',
  11: 'snare',
  12: 'stun',
  13: 'freeze',
  14: 'knockout',
  15: 'bleed',
  16: 'bandage',
  17: 'polymorph',
  18: 'banish',
  19: 'shield',
  20: 'shackle',
  21: 'mount',
  22: 'infected',
  23: 'turn',
  24: 'horror',
  25: 'invulnerability',
  26: 'interrupt',
  27: 'daze',
  28: 'discovery',
  29: 'immuneShield',
  30: 'sapped',
  31: 'enraged',
}

/** `Powers`. -2 (`POWER_HEALTH`) is real: a few spells cost health. */
export const powerTypeKeys: Record<number, string> = {
  [-2]: 'health',
  0: 'mana',
  1: 'rage',
  2: 'focus',
  3: 'energy',
  4: 'happiness',
  5: 'rune',
  6: 'runicPower',
}

/** `SpellFamilyNames` — resolves `SpellClassSet` (see `SpellInfo.classSet`)
 *  to a readable family name. Gaps (2, 14, 16) are unused in TrinityCore. */
export const spellFamilyKeys: Record<number, string> = {
  0: 'generic',
  1: 'unk1',
  3: 'mage',
  4: 'warrior',
  5: 'warlock',
  6: 'priest',
  7: 'druid',
  8: 'rogue',
  9: 'hunter',
  10: 'paladin',
  11: 'shaman',
  12: 'unk2',
  13: 'potion',
  15: 'deathKnight',
  17: 'pet',
}

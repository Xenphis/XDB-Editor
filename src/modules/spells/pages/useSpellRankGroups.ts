import type { SpellInfo } from '@core/wow/spellDbc'

export interface SpellRankGroup {
  /** `name::classSet` — unique across groups, unlike `name` alone: two
   *  different families can (and do) share a display name. Use this for
   *  Vue `:key` and any expand/collapse tracking. */
  key: string
  /** Shared spell name, for display. */
  name: string
  /** Every rank sharing that name, in the order the search returned them
   *  (already name-then-id sorted server-side, so lowest rank first). */
  entries: SpellInfo[]
}

/**
 * Groups spells that share an exact name *and* `classSet` — WoW's own
 * convention for a rank chain ("Fireball" / "Fireball" / "Fireball"…, told
 * apart only by their `rank` text). This is a display-only approximation,
 * the same one MangosSuperUI's spell browser uses ("name + spellFamilyName").
 *
 * `classSet` matters: plenty of generic-family NPC abilities reuse a common
 * name — a dozen different creatures each have their own "Charge" — and
 * without it every one of those would merge into the Warrior's real 6-rank
 * "Charge" chain. `spell_ranks` is TrinityCore's actual authoritative chain
 * once that table gets its own editor; this stays a cheap way to browse
 * ranks before then.
 */
export function groupSpellsByRank(spells: SpellInfo[]): SpellRankGroup[] {
  const order: string[] = []
  const byKey = new Map<string, SpellRankGroup>()

  for (const spell of spells) {
    const name = spell.name || `#${spell.id}`
    const key = `${name}::${spell.classSet}`
    let group = byKey.get(key)
    if (!group) {
      group = { key, name, entries: [] }
      byKey.set(key, group)
      order.push(key)
    }
    group.entries.push(spell)
  }

  return order.map(key => byKey.get(key)!)
}

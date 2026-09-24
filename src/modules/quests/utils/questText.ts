/**
 * How the 3.3.5 client renders quest text, for the in-game preview.
 *
 * Quest strings carry a few substitution codes the client expands per player:
 * `$B` is a line break, `$N` / `$R` / `$C` the player's name / race / class
 * (race and class lowercased when the code is lowercase), and
 * `$Gmale:female;` picks the variant matching the player's gender. Anything
 * else is literal text.
 */

export type QuestTextSegment =
  | { kind: 'text'; value: string }
  | { kind: 'break' }
  /** A substituted code: `value` is what the player would read, `code` the source. */
  | { kind: 'var'; code: string; value: string }

/** The sample player the preview substitutes into `$N` / `$R` / `$C`. */
export interface QuestTextPlayer {
  name: string
  race: string
  class: string
}

const CODE_RE = /\$([BbNnRrCc])|\$[Gg]([^:;$]*):([^;$]*);/g

export function parseQuestText(text: string | null | undefined, player: QuestTextPlayer): QuestTextSegment[] {
  if (!text) return []
  const segments: QuestTextSegment[] = []
  let last = 0
  for (const match of text.matchAll(CODE_RE)) {
    const index = match.index ?? 0
    if (index > last) segments.push({ kind: 'text', value: text.slice(last, index) })
    last = index + match[0].length

    const code = match[1]
    if (code === undefined) {
      // $Gmale:female; — the preview plays a male character.
      segments.push({ kind: 'var', code: match[0], value: match[2] ?? '' })
    } else if (code === 'B' || code === 'b') {
      segments.push({ kind: 'break' })
    } else if (code === 'N' || code === 'n') {
      segments.push({ kind: 'var', code: match[0], value: player.name })
    } else {
      const value = code === 'R' || code === 'r' ? player.race : player.class
      segments.push({ kind: 'var', code: match[0], value: code === code.toLowerCase() ? value.toLowerCase() : value })
    }
  }
  if (last < text.length) segments.push({ kind: 'text', value: text.slice(last) })
  return segments
}

export interface Coins {
  gold: number
  silver: number
  copper: number
}

/** Splits an amount of copper into the gold / silver / copper the money frame shows. */
export function splitMoney(copper: number): Coins {
  const total = Math.abs(Math.trunc(copper))
  return {
    gold: Math.floor(total / 10000),
    silver: Math.floor((total % 10000) / 100),
    copper: total % 100,
  }
}

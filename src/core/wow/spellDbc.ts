/**
 * Spell identity read from the user's WoW client.
 *
 * The world database has no `spell` table — a spell's name, rank and icon live
 * in `Spell.dbc`, and every `spell_*` table is only an overlay keyed on a
 * SpellID. The Rust side indexes those DBCs out of the MPQ patch chain
 * (`spell_dbc.rs`); this is the frontend's door to that index.
 *
 * This is the one file under `@core` that reaches into a module: opening the
 * client is the map editor's `ensureClientLoaded`, and the client path is its
 * store. Keeping the import here means the components consuming spells stay
 * free of it. (A later cleanup could hoist the client bootstrap into
 * `@core/wow`, which is where it arguably belongs now that three features use
 * it — out of scope here.)
 */
import { invoke } from '@tauri-apps/api/core'
import { ensureClientLoaded } from '@/modules/map_editor/service'
import { useMapEditorStore } from '@/modules/map_editor/store'

/** One spell, as indexed from Spell.dbc + SpellIcon.dbc. Mirrors the Rust struct. */
export interface SpellInfo {
  id: number
  name: string
  /** `NameSubtext`: "Rank 3", "Passive"… Empty for most spells. */
  rank: string
  /** MPQ path of the icon BLP (serve through `blpTextureUrl`), '' when none. */
  icon: string
  /** `SpellClassSet`: 0 (generic) or a player class id — for grouping same-named
   *  spells into a rank chain without merging unrelated same-named ones (a
   *  generic-family NPC "Charge" alongside the Warrior's real rank chain). */
  classSet: number
  /** Whether any effect applies an aura — the "Spells" / "Auras" list filter. */
  isAura: boolean
}

/** The "Sorts" / "Auras" list filter; `undefined` means no filter. */
export type SpellKind = 'spell' | 'aura'

/** One of a spell's 3 effect slots — see `SpellDetail.effects`. */
export interface SpellEffectDetail {
  effectType: number
  /** Signed: plenty of effects (snares, stat reductions…) carry a negative value. */
  basePoints: number
  /** 0 when this effect slot isn't an aura-applying one. */
  auraType: number
  implicitTargetA: number
}

/**
 * The read-only "Info" tab record for one spell — every `Spell.dbc` field
 * `spell_dbc.rs` surfaces, including cast time / duration / range already
 * resolved from their own cross-reference DBCs into seconds and yards.
 */
export interface SpellDetail {
  id: number
  name: string
  rank: string
  icon: string
  schoolMask: number
  dispelType: number
  mechanic: number
  classSet: number
  isAura: boolean
  isPassive: boolean
  /** Signed: `POWER_HEALTH` is -2 (a handful of spells cost health). */
  powerType: number
  manaCost: number
  manaCostPerLevel: number
  recoveryTimeMs: number
  categoryRecoveryTimeMs: number
  category: number
  /** Percent, 0-100. */
  procChance: number
  procCharges: number
  spellLevel: number
  baseLevel: number
  maxLevel: number
  /** 0 = instant cast. */
  castingTimeIndex: number
  castTimeMs: number | null
  /** 0 = no duration. */
  durationIndex: number
  durationMs: number | null
  /** 0 = melee range. */
  rangeIndex: number
  rangeMin: number | null
  rangeMax: number | null
  effects: [SpellEffectDetail, SpellEffectDetail, SpellEffectDetail]
}

/**
 * No WoW client is configured, so spells cannot be named.
 *
 * Callers must treat this as a degraded mode, never a failure: spell tables
 * stay editable with raw ids, they just lose the labels.
 */
export class NoClientError extends Error {
  constructor() {
    super('no client path configured')
    this.name = 'NoClientError'
  }
}

/** Whether a client folder is configured at all (drives empty states). */
export function hasClientConfigured(): boolean {
  return useMapEditorStore().clientPath.trim().length > 0
}

/**
 * Makes sure the MPQ chain is open before a spell lookup. Shared with the map
 * editor and the model preview, so whoever needs the client first pays for it.
 * Exported for the other client lookups under `@core/wow` (item icons), so
 * this file stays the only one reaching into the map editor module.
 */
export async function ensureClient(): Promise<void> {
  const path = useMapEditorStore().clientPath.trim()
  if (!path) throw new NoClientError()
  await ensureClientLoaded(path)
}

/** Searches spells by name, or by exact id when the query is a number,
 *  optionally restricted to spells or auras. */
export async function searchSpells(search: string, limit?: number, kind?: SpellKind): Promise<SpellInfo[]> {
  await ensureClient()
  return invoke<SpellInfo[]>('client_spell_search', { search, limit, kind })
}

/** Resolves spell ids to their client name/rank/icon. Unknown ids are omitted. */
export async function resolveSpellNames(ids: number[]): Promise<Record<number, SpellInfo>> {
  if (ids.length === 0) return {}
  await ensureClient()
  return invoke<Record<number, SpellInfo>>('client_spell_names', { ids })
}

/** The full read-only DBC record for one spell, `null` if the client doesn't have it. */
export async function fetchSpellDetail(entry: number): Promise<SpellDetail | null> {
  await ensureClient()
  return invoke<SpellDetail | null>('client_spell_detail', { entry })
}

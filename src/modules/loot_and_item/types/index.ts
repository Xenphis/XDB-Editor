import type { LootTemplate } from './loot/loot_template'

export type { LootTemplate }

/**
 * The profession loot tables edited by this module, keyed by the slug that
 * appears in the route (`/loot-items/<type>`) and in the type dropdown.
 *
 * `creature_loot_template` and `gameobject_loot_template` share the same shape
 * but are not here on purpose: the gameobject one is already edited from the
 * GameObject editor's Loot tab, and two screens writing one table would be two
 * sources of truth. The backend keeps the same list (`commands/loot_template.rs`).
 */
export const LOOT_TYPES = [
  'fishing',
  'milling',
  'pickpocketing',
  'disenchant',
  'skinning',
  'prospecting',
] as const

export type LootType = (typeof LOOT_TYPES)[number]

/** Real table name, for the editor header and the generated SQL. */
export const LOOT_TABLE_NAMES: Record<LootType, string> = {
  fishing: 'fishing_loot_template',
  milling: 'milling_loot_template',
  pickpocketing: 'pickpocketing_loot_template',
  disenchant: 'disenchant_loot_template',
  skinning: 'skinning_loot_template',
  prospecting: 'prospecting_loot_template',
}

export function isLootType(value: unknown): value is LootType {
  return typeof value === 'string' && (LOOT_TYPES as readonly string[]).includes(value)
}

/**
 * One entry of a loot table: the id, how many rows hang off it, and what that
 * id resolves to when it can be joined to something nameable — an item for
 * milling/prospecting/disenchant, a creature for skinning/pickpocketing.
 * `fishing` entries are AreaTable ids, whose names live in the client DBCs
 * rather than the world DB, so their label is always null.
 */
export interface LootGroup {
  entry: number
  rowCount: number
  label: string | null
}

/**
 * One loot row, plus the looted item's identity for display only — the two
 * joined fields are never written back. They are null on rows that point at a
 * `reference_loot_template` entry instead of a real item.
 */
export interface LootRow extends LootTemplate {
  itemName: string | null
  itemQuality: number | null
}

import { invoke } from '@tauri-apps/api/core'
import type { LootGroup, LootRow, LootType } from './types'

/**
 * Backend calls for the profession loot tables. The six tables share one
 * schema, so one command set covers them all and `lootType` picks which —
 * validated against a fixed list on the Rust side, since a table name can't be
 * a bound parameter (see `commands/loot_template.rs`).
 *
 * There is deliberately no `save`: edits go through the standard diff pipeline
 * (`ArraySubTable` → `createEntityEditorStore.saveCurrent` → `execute_batch`),
 * which writes targeted INSERT/UPDATE/DELETE per `(Entry, Item)` instead of
 * wiping and re-inserting a whole entry.
 */

/** Every entry of one loot table, with its row count and display label. */
export function getLootGroups(lootType: LootType): Promise<LootGroup[]> {
  return invoke<LootGroup[]>('get_loot_groups', { lootType })
}

/** The rows of one entry, ordered by drop group then item. */
export function getLootRows(lootType: LootType, entry: number): Promise<LootRow[]> {
  return invoke<LootRow[]>('get_loot_rows', { lootType, entry })
}

/** Drops every row of one entry; what points at it is left untouched. */
export function deleteLootEntry(lootType: LootType, entry: number): Promise<void> {
  return invoke('delete_loot_entry', { lootType, entry })
}

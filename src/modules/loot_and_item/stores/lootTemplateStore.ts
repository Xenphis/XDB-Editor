import { defineStore } from 'pinia'
import { ref } from 'vue'
import { escapeSQL } from '@core/utils/sql'
import type { CompositeKeyConfig } from '@core/composables/useQueryGenerator'
import { ArraySubTable } from '@core/stores/SubTableManager'
import { createEntityEditorStore } from '@core/stores/createEntityEditorStore'
import * as lootService from '../service'
import { LOOT_TABLE_NAMES, type LootGroup, type LootRow, type LootType } from '../types'

/**
 * One editor store per loot type.
 *
 * `createEntityEditorStore` binds its table name once, at construction, so a
 * single store cannot serve six tables. Hence a memoized factory: each loot
 * type gets its own Pinia store, its own sub-table and its own SQL scope.
 *
 * That also buys the behaviour you want from the type dropdown — switching from
 * Skinning to Fishing and back leaves the skinning edits exactly where they
 * were, instead of a shared store quietly dropping them.
 */

/** Blank row, matching the table defaults (Chance 100, LootMode 1, counts 1). */
export function createLootRow(item: number, template: Partial<LootRow> = {}): LootRow {
  return {
    Entry: 0,
    Item: item,
    Reference: 0,
    Chance: 100,
    QuestRequired: false,
    LootMode: 1,
    GroupId: 0,
    MinCount: 1,
    MaxCount: 1,
    Comment: null,
    itemName: null,
    itemQuality: null,
    ...template,
  }
}

/**
 * `(Entry, Item)` is the whole primary key, so `childKey: 'Item'` is enough to
 * identify a row — no `getUniqueKey` needed, unlike npc_vendor's three-column
 * key. `Entry` is excluded from `columns`: it is the parent id, written by the
 * generator itself.
 *
 * `itemName` / `itemQuality` are joined for display and must stay out of both
 * `columns` and `toSqlValues`, or the generated SQL would try to write columns
 * the table doesn't have.
 */
function lootConfig(table: string): Omit<CompositeKeyConfig<LootRow>, 'parentId'> {
  return {
    table,
    parentKey: 'Entry',
    childKey: 'Item',
    columns: ['Reference', 'Chance', 'QuestRequired', 'LootMode', 'GroupId', 'MinCount', 'MaxCount', 'Comment'],
    isEqual: (a, b) =>
      a.Reference === b.Reference &&
      a.Chance === b.Chance &&
      a.QuestRequired === b.QuestRequired &&
      a.LootMode === b.LootMode &&
      a.GroupId === b.GroupId &&
      a.MinCount === b.MinCount &&
      a.MaxCount === b.MaxCount &&
      a.Comment === b.Comment,
    toSqlValues: (e) => [
      e.Reference,
      e.Chance,
      e.QuestRequired ? 1 : 0,
      e.LootMode,
      e.GroupId,
      e.MinCount,
      e.MaxCount,
      e.Comment != null ? `'${escapeSQL(e.Comment)}'` : null,
    ],
  }
}

/**
 * The edited "entity" is nothing but the key: every column of a loot table
 * lives in its rows. Same shape as npc_vendor's `VendorKey`, and the same
 * reason — `load` always returns a key, so the editor never takes the
 * "new entity" path and never emits a stray INSERT on the main table.
 */
interface LootEntryKey {
  Entry: number
}

function buildLootStore(lootType: LootType) {
  const table = LOOT_TABLE_NAMES[lootType]

  return defineStore(`lootTemplate:${lootType}`, () => {
    // --- List state ---
    const groups = ref<LootGroup[]>([])
    const loading = ref(false)
    const listLoaded = ref(false)

    const rows = new ArraySubTable<LootRow>({
      tableName: table,
      compositeConfig: lootConfig(table),
      fieldPrefix: 'loot_row',
      summarize: (e) =>
        e.Reference > 0
          ? `reference ${e.Reference} (${e.Chance}%)`
          : `item ${e.Item} (${e.Chance}%)`,
    })

    const editor = createEntityEditorStore<LootEntryKey>({
      tableName: table,
      primaryKey: 'Entry',
      createDefault: () => ({ Entry: 0 }),
      load: async (entry) => ({ Entry: entry }),
      delete: (entry: number) => lootService.deleteLootEntry(lootType, entry),
      subTables: [
        {
          manager: rows,
          load: async (entry) => {
            const loaded = await lootService.getLootRows(lootType, entry).catch(() => [] as LootRow[])
            return loaded.map(row => ({ ...row }))
          },
        },
      ],
    })

    /** A row is taken when its `Item` exists: that is half the primary key, so
        re-adding it would collide with the row already there. */
    function hasRow(item: number): boolean {
      return rows.newEntries.value.some(e => e.Item === item)
    }

    function addRow(row: LootRow) {
      rows.pushNewEntry(row)
    }

    function removeRow(index: number) {
      rows.removeNewEntry(index)
    }

    async function loadGroups() {
      loading.value = true
      try {
        groups.value = await lootService.getLootGroups(lootType)
        listLoaded.value = true
      } finally {
        loading.value = false
      }
    }

    return {
      lootType,
      table,
      groups,
      loading,
      listLoaded,
      rows,
      ...editor,
      hasRow,
      addRow,
      removeRow,
      loadGroups,
    }
  })
}

const definitions = new Map<LootType, ReturnType<typeof buildLootStore>>()

/** The store for one loot type, built once per type and reused after that. */
export function useLootTemplateStore(lootType: LootType) {
  let definition = definitions.get(lootType)
  if (!definition) {
    definition = buildLootStore(lootType)
    definitions.set(lootType, definition)
  }
  return definition()
}

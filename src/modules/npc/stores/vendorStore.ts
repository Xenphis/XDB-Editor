import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { NpcVendorGroup, NpcVendorItem } from '@/modules/npc/types/npc/npc_vendor'
import type { CompositeKeyConfig } from '@core/composables/useQueryGenerator'
import { ArraySubTable } from '@core/stores/SubTableManager'
import { createEntityEditorStore } from '@core/stores/createEntityEditorStore'
import * as npcService from '@/modules/npc/service'

/**
 * One `npc_vendor` row, plus the joined item identity used for display only
 * (`itemName` / `itemQuality` are never written back).
 */
export interface VendorStockEntry {
  item: number
  slot: number
  maxcount: number
  incrtime: number
  ExtendedCost: number
  itemName: string | null
  itemQuality: number | null
}

/**
 * `npc_vendor` has a three-column primary key (entry, item, ExtendedCost): the
 * same item may be sold twice by one vendor at two different extended costs
 * (for gold and for a token, say). `childKey` alone would collapse those two
 * rows into one, so the identity and the DELETE/UPDATE target are both built
 * from the full key.
 */
const stockConfig: Omit<CompositeKeyConfig<VendorStockEntry>, 'parentId'> = {
  table: 'npc_vendor',
  parentKey: 'entry',
  childKey: 'item',
  columns: ['slot', 'maxcount', 'incrtime', 'ExtendedCost'],
  getUniqueKey: (e) => `${e.item}:${e.ExtendedCost}`,
  buildWhereClause: (e, parentId) =>
    `\`entry\` = ${parentId} AND \`item\` = ${e.item} AND \`ExtendedCost\` = ${e.ExtendedCost}`,
  isEqual: (a, b) =>
    a.slot === b.slot &&
    a.maxcount === b.maxcount &&
    a.incrtime === b.incrtime &&
    a.ExtendedCost === b.ExtendedCost,
  toSqlValues: (e) => [e.slot, e.maxcount, e.incrtime, e.ExtendedCost],
}

/** The main "entity" carries nothing but the key: all columns live in rows. */
interface VendorKey {
  entry: number
}

function createDefaultForm(): VendorKey {
  return { entry: 0 }
}

export function createStockEntry(item: number, template: Partial<VendorStockEntry> = {}): VendorStockEntry {
  return {
    item,
    slot: 0,
    maxcount: 0,
    incrtime: 0,
    ExtendedCost: 0,
    itemName: null,
    itemQuality: null,
    ...template,
  }
}

export const useVendorStore = defineStore('npcVendor', () => {
  // --- List state ---
  const vendors = ref<NpcVendorGroup[]>([])
  const loading = ref(false)
  const listLoaded = ref(false)

  /** npcflag of the creature being edited — drives the "not a vendor" warning. */
  const npcflag = ref<number | null>(null)

  const stock = new ArraySubTable<VendorStockEntry>({
    tableName: 'npc_vendor',
    compositeConfig: stockConfig,
    fieldPrefix: 'npc_vendor',
    summarize: (e) => `item ${e.item}, max ${e.maxcount}, cost ${e.ExtendedCost}`,
  })

  const editor = createEntityEditorStore<VendorKey>({
    tableName: 'npc_vendor',
    primaryKey: 'entry',
    createDefault: createDefaultForm,
    load: async (entry) => ({ entry }),
    delete: npcService.deleteNpcVendor,
    subTables: [
      {
        manager: stock,
        load: async (entry) => {
          const rows = await npcService.getNpcVendor(entry).catch(() => [] as NpcVendorItem[])
          return rows.map(row => createStockEntry(row.item, {
            slot: row.slot,
            maxcount: row.maxcount,
            incrtime: row.incrtime,
            ExtendedCost: row.ExtendedCost,
            itemName: row.itemName,
            itemQuality: row.itemQuality,
          }))
        },
      },
    ],
  })

  /** Rows keep the order the query returned them in (slot, then item). They are
      deliberately not re-sorted reactively: `slot` is editable, and re-sorting
      would move a row out from under the cursor while it is being typed in. */

  /** A row is already taken when its (item, ExtendedCost) pair exists — that
      pair is the primary key, so re-adding it would overwrite the first row. */
  function hasStockEntry(item: number, extendedCost = 0): boolean {
    return stock.newEntries.value.some(e => e.item === item && e.ExtendedCost === extendedCost)
  }

  function addStockEntry(entry: VendorStockEntry) {
    stock.pushNewEntry(entry)
  }

  /** Resolves the edited creature's npcflag. Looked up rather than read from
      the list because a vendor being created is not in the list yet. */
  async function loadNpcflag(entry: number) {
    const matches = await npcService.searchVendorCreatures(String(entry), 50).catch(() => [])
    npcflag.value = matches.find(c => c.entry === entry)?.npcflag ?? null
  }

  // --- List actions ---
  function setVendors(data: NpcVendorGroup[]) {
    vendors.value = data
  }

  function markListLoaded() {
    listLoaded.value = true
  }

  return {
    // list
    vendors,
    loading,
    listLoaded,
    npcflag,
    // sub-table
    stock,
    ...editor,
    // actions
    hasStockEntry,
    addStockEntry,
    loadNpcflag,
    setVendors,
    markListLoaded,
  }
})

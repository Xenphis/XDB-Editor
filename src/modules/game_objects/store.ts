import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { GameObjectTemplate } from '@/modules/game_objects/types/gameobject_template/gameobject_template'
import { ReactiveSubTable, ArraySubTable } from '@core/stores/SubTableManager'
import type { CompositeKeyConfig } from '@core/composables/useQueryGenerator'
import { createEntityEditorStore } from '@core/stores/createEntityEditorStore'
import { escapeSQL } from '@core/utils/sql'
import * as gameObjectService from '@/modules/game_objects/service'
import type { EntityQuestRelations } from '@/modules/game_objects/service'

// ─── Interfaces ──────────────────────────────────────────────────────

export interface AddonForm {
  faction: number
  flags: number
  mingold: number
  maxgold: number
  artkit0: number
  artkit1: number
  artkit2: number
  artkit3: number
}

export interface SpawnOverridesForm {
  faction: number
  flags: number
}

export interface SpawnAddonForm {
  parent_rotation0: number
  parent_rotation1: number
  parent_rotation2: number
  parent_rotation3: number
  invisibilityType: number
  invisibilityValue: number
}

export interface LootEntry {
  Item: number
  Reference: number
  Chance: number
  QuestRequired: boolean
  LootMode: number
  GroupId: number
  MinCount: number
  MaxCount: number
  Comment: string | null
}

export interface QuestItemEntry {
  Idx: number
  ItemId: number
}

export interface GoLocaleEntry {
  locale: string
  name: string | null
  castBarCaption: string | null
}

// ─── Default factories ──────────────────────────────────────────────

export function createDefaultAddonForm(): AddonForm {
  return { faction: 0, flags: 0, mingold: 0, maxgold: 0, artkit0: 0, artkit1: 0, artkit2: 0, artkit3: 0 }
}

export function createDefaultSpawnOverridesForm(): SpawnOverridesForm {
  return { faction: 0, flags: 0 }
}

export function createDefaultSpawnAddonForm(): SpawnAddonForm {
  return { parent_rotation0: 0, parent_rotation1: 0, parent_rotation2: 0, parent_rotation3: 0, invisibilityType: 0, invisibilityValue: 0 }
}

function createDefaultForm(): GameObjectTemplate {
  return {
    entry: 0, type: 0, displayId: 0, name: '', IconName: '', castBarCaption: '', unk1: '',
    size: 1,
    Data0: 0, Data1: 0, Data2: 0, Data3: 0, Data4: 0, Data5: 0, Data6: 0, Data7: 0,
    Data8: 0, Data9: 0, Data10: 0, Data11: 0, Data12: 0, Data13: 0, Data14: 0, Data15: 0,
    Data16: 0, Data17: 0, Data18: 0, Data19: 0, Data20: 0, Data21: 0, Data22: 0, Data23: 0,
    AIName: '', ScriptName: '', StringId: null, VerifiedBuild: null,
  }
}

// ─── Composite key configs ──────────────────────────────────────────

const lootConfig: Omit<CompositeKeyConfig<LootEntry>, 'parentId'> = {
  table: 'gameobject_loot_template',
  parentKey: 'Entry',
  childKey: 'Item',
  columns: ['Reference', 'Chance', 'QuestRequired', 'LootMode', 'GroupId', 'MinCount', 'MaxCount', 'Comment'],
  isEqual: (a, b) =>
    a.Reference === b.Reference && a.Chance === b.Chance && a.QuestRequired === b.QuestRequired &&
    a.LootMode === b.LootMode && a.GroupId === b.GroupId && a.MinCount === b.MinCount &&
    a.MaxCount === b.MaxCount && a.Comment === b.Comment,
  toSqlValues: (e) => [
    e.Reference, e.Chance, e.QuestRequired ? 1 : 0, e.LootMode,
    e.GroupId, e.MinCount, e.MaxCount, e.Comment != null ? `'${escapeSQL(e.Comment)}'` : null,
  ],
}

const questItemConfig: Omit<CompositeKeyConfig<QuestItemEntry>, 'parentId'> = {
  table: 'gameobject_questitem',
  parentKey: 'GameObjectEntry',
  childKey: 'Idx',
  columns: ['ItemId', 'VerifiedBuild'],
  isEqual: (a, b) => a.ItemId === b.ItemId,
  toSqlValues: (e) => [e.ItemId, 0],
}

const goLocaleConfig: Omit<CompositeKeyConfig<GoLocaleEntry>, 'parentId'> = {
  table: 'gameobject_template_locale',
  parentKey: 'entry',
  childKey: 'locale',
  columns: ['name', 'castBarCaption', 'VerifiedBuild'],
  isEqual: (a, b) => a.name === b.name && a.castBarCaption === b.castBarCaption,
  toSqlValues: (e) => [
    e.name != null ? `'${escapeSQL(e.name)}'` : null,
    e.castBarCaption != null ? `'${escapeSQL(e.castBarCaption)}'` : null,
    0,
  ],
}

// ─── Quest relations (gameobject ↔ quest, jonction sans colonne de valeur) ───

export interface GameobjectQuestRelEntry {
  id: number
  quest: number
}

function gameobjectQuestRelConfig(table: string): Omit<CompositeKeyConfig<GameobjectQuestRelEntry>, 'parentId'> {
  return {
    table,
    parentKey: 'id',
    childKey: 'quest',
    columns: [],
    isEqual: () => true,
    toSqlValues: () => [],
  }
}

let gameobjectRelCache: { id: number; promise: Promise<EntityQuestRelations | null> } | null = null
function loadGameobjectQuestRelations(entry: number): Promise<EntityQuestRelations | null> {
  if (!gameobjectRelCache || gameobjectRelCache.id !== entry) {
    const e = { id: entry, promise: gameObjectService.getGameObjectQuestRelations(entry).catch(() => null) }
    gameobjectRelCache = e
    e.promise.finally(() => { if (gameobjectRelCache === e) gameobjectRelCache = null })
  }
  return gameobjectRelCache.promise
}

// ─── Store ──────────────────────────────────────────────────────────

export const useGameObjectModuleStore = defineStore('gameObjectModule', () => {
  // --- List state ---
  const gameObjects = ref<GameObjectTemplate[]>([])
  const loading = ref(false)
  const currentSearch = ref('')
  const currentTypeFilter = ref<number | null>(null)
  const listLoaded = ref(false)

  // --- Sub-table managers ---
  const addon = new ReactiveSubTable<AddonForm>({
    tableName: 'gameobject_template_addon',
    primaryKey: 'entry',
    createDefault: createDefaultAddonForm,
  })

  const spawnOverrides = new ReactiveSubTable<SpawnOverridesForm>({
    tableName: 'gameobject_overrides',
    primaryKey: 'spawnId',
    createDefault: createDefaultSpawnOverridesForm,
  })

  const spawnAddon = new ReactiveSubTable<SpawnAddonForm>({
    tableName: 'gameobject_addon',
    primaryKey: 'guid',
    createDefault: createDefaultSpawnAddonForm,
  })

  const loot = new ArraySubTable<LootEntry>({
    tableName: 'gameobject_loot_template',
    compositeConfig: lootConfig,
    fieldPrefix: 'loot_item',
    summarize: (e) => `Item ${e.Item} (${e.Chance}%)`,
  })

  const questStarters = new ArraySubTable<GameobjectQuestRelEntry>({
    tableName: 'gameobject_queststarter',
    compositeConfig: gameobjectQuestRelConfig('gameobject_queststarter'),
    fieldPrefix: 'quest_starter',
    summarize: (e) => `quest ${e.quest}`,
  })

  const questEnders = new ArraySubTable<GameobjectQuestRelEntry>({
    tableName: 'gameobject_questender',
    compositeConfig: gameobjectQuestRelConfig('gameobject_questender'),
    fieldPrefix: 'quest_ender',
    summarize: (e) => `quest ${e.quest}`,
  })

  const questItems = new ArraySubTable<QuestItemEntry>({
    tableName: 'gameobject_questitem',
    compositeConfig: questItemConfig,
    fieldPrefix: 'quest_item',
    summarize: (e) => String(e.ItemId),
  })

  const locales = new ArraySubTable<GoLocaleEntry>({
    tableName: 'gameobject_template_locale',
    compositeConfig: goLocaleConfig,
    fieldPrefix: 'locale',
    summarize: (e) => `[${e.locale}] ${e.name || '(empty)'}`,
  })

  const editor = createEntityEditorStore<GameObjectTemplate>({
    tableName: 'gameobject_template',
    primaryKey: 'entry',
    createDefault: createDefaultForm,
    load: gameObjectService.getGameObject,
    delete: gameObjectService.deleteGameObject,
    subTables: [
      {
        manager: addon,
        load: async (entry) => {
          const data = await gameObjectService.getGameObjectAddon(entry).catch(() => null)
          if (!data) return null
          const { entry: _entry, ...addonFields } = data
          return addonFields as AddonForm
        },
        commitWhenMissing: true,
      },
      {
        manager: loot,
        load: async (entry) => {
          const rows = await gameObjectService.getGameObjectLoot(entry).catch(() => [])
          return rows.map(row => ({
            Item: row.Item,
            Reference: row.Reference,
            Chance: row.Chance,
            QuestRequired: row.QuestRequired,
            LootMode: row.LootMode,
            GroupId: row.GroupId,
            MinCount: row.MinCount,
            MaxCount: row.MaxCount,
            Comment: row.Comment,
          })) satisfies LootEntry[]
        },
      },
      {
        manager: questStarters,
        load: async (entry) => {
          const rel = await loadGameobjectQuestRelations(entry)
          return (rel?.starters ?? []).map(q => ({ id: entry, quest: q })) satisfies GameobjectQuestRelEntry[]
        },
      },
      {
        manager: questEnders,
        load: async (entry) => {
          const rel = await loadGameobjectQuestRelations(entry)
          return (rel?.enders ?? []).map(q => ({ id: entry, quest: q })) satisfies GameobjectQuestRelEntry[]
        },
      },
      {
        manager: questItems,
        load: async (entry) => {
          const rows = await gameObjectService.getGameObjectQuestItems(entry).catch(() => [])
          return rows.map(row => ({ Idx: row.Idx, ItemId: row.ItemId })) satisfies QuestItemEntry[]
        },
      },
      {
        manager: locales,
        load: async (entry) => {
          const rows = await gameObjectService.getGameObjectLocales(entry).catch(() => [])
          return rows.map(row => ({
            locale: row.locale,
            name: row.name ?? null,
            castBarCaption: row.castBarCaption ?? null,
          })) satisfies GoLocaleEntry[]
        },
      },
    ],
  })

  function markListLoaded() {
    listLoaded.value = true
  }

  function setGameObjects(data: GameObjectTemplate[]) {
    gameObjects.value = data
  }

  return {
    gameObjects, loading, currentSearch, currentTypeFilter, listLoaded,
    addon, loot, spawnAddon, spawnOverrides, questStarters, questEnders, questItems, locales,
    ...editor,
    editingEntry: editor.editingId,
    markListLoaded, setGameObjects,
  }
})

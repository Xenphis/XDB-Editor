import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { QuestTemplate } from '@/modules/quests/types/quest_template'
import type { CompositeKeyConfig } from '@core/composables/useQueryGenerator'
import { ReactiveSubTable, ArraySubTable } from '@core/stores/SubTableManager'
import { createEntityEditorStore } from '@core/stores/createEntityEditorStore'
import { escapeSQL } from '@core/utils/sql'
import * as questService from '@/modules/quests/service'
import type { QuestRelations } from '@/modules/quests/service'

// ─── Interfaces ──────────────────────────────────────────────────────

export interface AddonForm {
  MaxLevel: number
  AllowableClasses: number
  SourceSpellID: number
  PrevQuestID: number
  NextQuestID: number
  ExclusiveGroup: number
  BreadcrumbForQuestId: number
  RewardMailTemplateID: number
  RewardMailDelay: number
  RequiredSkillID: number
  RequiredSkillPoints: number
  RequiredMinRepFaction: number
  RequiredMaxRepFaction: number
  RequiredMinRepValue: number
  RequiredMaxRepValue: number
  ProvidedItemCount: number
  SpecialFlags: number
}

export interface OfferRewardForm {
  Emote1: number
  Emote2: number
  Emote3: number
  Emote4: number
  EmoteDelay1: number
  EmoteDelay2: number
  EmoteDelay3: number
  EmoteDelay4: number
  RewardText: string
}

export interface RequestItemsForm {
  EmoteOnComplete: number
  EmoteOnCompleteDelay: number
  EmoteOnIncomplete: number
  EmoteOnIncompleteDelay: number
  CompletionText: string
}

export interface DetailsForm {
  Emote1: number
  Emote2: number
  Emote3: number
  Emote4: number
  EmoteDelay1: number
  EmoteDelay2: number
  EmoteDelay3: number
  EmoteDelay4: number
}

export interface LocaleEntry {
  locale: string
  LogTitle: string | null
  QuestDescription: string | null
  LogDescription: string | null
  AreaDescription: string | null
  QuestCompletionLog: string | null
  ObjectiveText1: string | null
  ObjectiveText2: string | null
  ObjectiveText3: string | null
  ObjectiveText4: string | null
}

export interface OfferRewardLocaleEntry {
  locale: string
  RewardText: string | null
}

export interface RequestItemsLocaleEntry {
  locale: string
  CompletionText: string | null
}

// ─── Default factories ──────────────────────────────────────────────

export function createDefaultAddonForm(): AddonForm {
  return {
    MaxLevel: 0, AllowableClasses: 0, SourceSpellID: 0,
    PrevQuestID: 0, NextQuestID: 0, ExclusiveGroup: 0, BreadcrumbForQuestId: 0,
    RewardMailTemplateID: 0, RewardMailDelay: 0,
    RequiredSkillID: 0, RequiredSkillPoints: 0,
    RequiredMinRepFaction: 0, RequiredMaxRepFaction: 0,
    RequiredMinRepValue: 0, RequiredMaxRepValue: 0,
    ProvidedItemCount: 0, SpecialFlags: 0,
  }
}

export function createDefaultOfferReward(): OfferRewardForm {
  return { Emote1: 0, Emote2: 0, Emote3: 0, Emote4: 0, EmoteDelay1: 0, EmoteDelay2: 0, EmoteDelay3: 0, EmoteDelay4: 0, RewardText: '' }
}

export function createDefaultRequestItems(): RequestItemsForm {
  return { EmoteOnComplete: 0, EmoteOnCompleteDelay: 0, EmoteOnIncomplete: 0, EmoteOnIncompleteDelay: 0, CompletionText: '' }
}

export function createDefaultDetails(): DetailsForm {
  return { Emote1: 0, Emote2: 0, Emote3: 0, Emote4: 0, EmoteDelay1: 0, EmoteDelay2: 0, EmoteDelay3: 0, EmoteDelay4: 0 }
}

function createDefaultForm(): QuestTemplate {
  return {
    ID: 0, QuestType: 2, QuestLevel: 0, MinLevel: 0,
    QuestSortID: 0, QuestInfoID: 0, SuggestedGroupNum: 0,
    RequiredFactionId1: 0, RequiredFactionId2: 0,
    RequiredFactionValue1: 0, RequiredFactionValue2: 0,
    RewardNextQuest: 0, RewardXPDifficulty: 0,
    RewardMoney: 0, RewardBonusMoney: 0,
    RewardDisplaySpell: 0, RewardSpell: 0,
    RewardHonor: 0, RewardKillHonor: 0,
    StartItem: 0, Flags: 0, RequiredPlayerKills: 0,
    RewardItem1: 0, RewardAmount1: 0,
    RewardItem2: 0, RewardAmount2: 0,
    RewardItem3: 0, RewardAmount3: 0,
    RewardItem4: 0, RewardAmount4: 0,
    ItemDrop1: 0, ItemDropQuantity1: 0,
    ItemDrop2: 0, ItemDropQuantity2: 0,
    ItemDrop3: 0, ItemDropQuantity3: 0,
    ItemDrop4: 0, ItemDropQuantity4: 0,
    RewardChoiceItemID1: 0, RewardChoiceItemQuantity1: 0,
    RewardChoiceItemID2: 0, RewardChoiceItemQuantity2: 0,
    RewardChoiceItemID3: 0, RewardChoiceItemQuantity3: 0,
    RewardChoiceItemID4: 0, RewardChoiceItemQuantity4: 0,
    RewardChoiceItemID5: 0, RewardChoiceItemQuantity5: 0,
    RewardChoiceItemID6: 0, RewardChoiceItemQuantity6: 0,
    POIContinent: 0, POIx: 0, POIy: 0, POIPriority: 0,
    RewardTitle: 0, RewardTalents: 0, RewardArenaPoints: 0,
    RewardFactionID1: 0, RewardFactionValue1: 0, RewardFactionOverride1: 0,
    RewardFactionID2: 0, RewardFactionValue2: 0, RewardFactionOverride2: 0,
    RewardFactionID3: 0, RewardFactionValue3: 0, RewardFactionOverride3: 0,
    RewardFactionID4: 0, RewardFactionValue4: 0, RewardFactionOverride4: 0,
    RewardFactionID5: 0, RewardFactionValue5: 0, RewardFactionOverride5: 0,
    RewardFactionFlags: 0,
    TimeAllowed: 0, AllowableRaces: 0,
    LogTitle: undefined, LogDescription: undefined, QuestDescription: undefined,
    AreaDescription: undefined, QuestCompletionLog: undefined,
    RequiredNpcOrGo1: 0, RequiredNpcOrGo2: 0, RequiredNpcOrGo3: 0, RequiredNpcOrGo4: 0,
    RequiredNpcOrGoCount1: 0, RequiredNpcOrGoCount2: 0, RequiredNpcOrGoCount3: 0, RequiredNpcOrGoCount4: 0,
    RequiredItemId1: 0, RequiredItemId2: 0, RequiredItemId3: 0,
    RequiredItemId4: 0, RequiredItemId5: 0, RequiredItemId6: 0,
    RequiredItemCount1: 0, RequiredItemCount2: 0, RequiredItemCount3: 0,
    RequiredItemCount4: 0, RequiredItemCount5: 0, RequiredItemCount6: 0,
    ObjectiveText1: undefined, ObjectiveText2: undefined, ObjectiveText3: undefined, ObjectiveText4: undefined,
    VerifiedBuild: undefined,
  }
}

// ─── Composite key configs ───────────────────────────────────────────

const offerRewardLocaleConfig: Omit<CompositeKeyConfig<OfferRewardLocaleEntry>, 'parentId'> = {
  table: 'quest_offer_reward_locale',
  parentKey: 'ID',
  childKey: 'locale',
  columns: ['RewardText', 'VerifiedBuild'],
  isEqual: (a, b) => a.RewardText === b.RewardText,
  toSqlValues: (e) => [
    e.RewardText != null ? `'${escapeSQL(e.RewardText)}'` : null,
    0,
  ],
}

const requestItemsLocaleConfig: Omit<CompositeKeyConfig<RequestItemsLocaleEntry>, 'parentId'> = {
  table: 'quest_request_items_locale',
  parentKey: 'ID',
  childKey: 'locale',
  columns: ['CompletionText', 'VerifiedBuild'],
  isEqual: (a, b) => a.CompletionText === b.CompletionText,
  toSqlValues: (e) => [
    e.CompletionText != null ? `'${escapeSQL(e.CompletionText)}'` : null,
    0,
  ],
}

const localeConfig: Omit<CompositeKeyConfig<LocaleEntry>, 'parentId'> = {
  table: 'quest_template_locale',
  parentKey: 'ID',
  childKey: 'locale',
  columns: ['LogTitle', 'QuestDescription', 'LogDescription', 'AreaDescription', 'QuestCompletionLog',
            'ObjectiveText1', 'ObjectiveText2', 'ObjectiveText3', 'ObjectiveText4', 'VerifiedBuild'],
  isEqual: (a, b) =>
    a.LogTitle === b.LogTitle &&
    a.QuestDescription === b.QuestDescription &&
    a.LogDescription === b.LogDescription &&
    a.AreaDescription === b.AreaDescription &&
    a.QuestCompletionLog === b.QuestCompletionLog &&
    a.ObjectiveText1 === b.ObjectiveText1 &&
    a.ObjectiveText2 === b.ObjectiveText2 &&
    a.ObjectiveText3 === b.ObjectiveText3 &&
    a.ObjectiveText4 === b.ObjectiveText4,
  toSqlValues: (e) => [
    e.LogTitle != null ? `'${escapeSQL(e.LogTitle)}'` : null,
    e.QuestDescription != null ? `'${escapeSQL(e.QuestDescription)}'` : null,
    e.LogDescription != null ? `'${escapeSQL(e.LogDescription)}'` : null,
    e.AreaDescription != null ? `'${escapeSQL(e.AreaDescription)}'` : null,
    e.QuestCompletionLog != null ? `'${escapeSQL(e.QuestCompletionLog)}'` : null,
    e.ObjectiveText1 != null ? `'${escapeSQL(e.ObjectiveText1)}'` : null,
    e.ObjectiveText2 != null ? `'${escapeSQL(e.ObjectiveText2)}'` : null,
    e.ObjectiveText3 != null ? `'${escapeSQL(e.ObjectiveText3)}'` : null,
    e.ObjectiveText4 != null ? `'${escapeSQL(e.ObjectiveText4)}'` : null,
    0,
  ],
}

// ─── Quest givers / enders (jonction id ↔ quest, sans colonne de valeur) ─────

export interface RelationEntry {
  id: number
  quest: number
}

function relationConfig(table: string): Omit<CompositeKeyConfig<RelationEntry>, 'parentId'> {
  return {
    table,
    parentKey: 'quest',
    childKey: 'id',
    columns: [],
    isEqual: () => true,
    toSqlValues: () => [],
  }
}

// Cache court (un cycle de chargement) pour éviter 4 appels identiques quand
// les 4 sous-tables de relations se chargent en parallèle pour la même quête.
let questRelCache: { id: number; promise: Promise<QuestRelations | null> } | null = null
function loadQuestRelations(id: number): Promise<QuestRelations | null> {
  if (!questRelCache || questRelCache.id !== id) {
    const entry = { id, promise: questService.getQuestRelations(id).catch(() => null) }
    questRelCache = entry
    entry.promise.finally(() => { if (questRelCache === entry) questRelCache = null })
  }
  return questRelCache.promise
}

// ─── Store ──────────────────────────────────────────────────────────

export const useQuestModuleStore = defineStore('questModule', () => {
  // --- List state ---
  const quests = ref<QuestTemplate[]>([])
  const loading = ref(false)
  const currentSearch = ref('')
  const listLoaded = ref(false)

  // --- Sub-table managers ---
  const addon = new ReactiveSubTable<AddonForm>({
    tableName: 'quest_template_addon',
    primaryKey: 'ID',
    createDefault: createDefaultAddonForm,
  })

  const offerReward = new ReactiveSubTable<OfferRewardForm>({
    tableName: 'quest_offer_reward',
    primaryKey: 'ID',
    createDefault: createDefaultOfferReward,
  })

  const requestItems = new ReactiveSubTable<RequestItemsForm>({
    tableName: 'quest_request_items',
    primaryKey: 'ID',
    createDefault: createDefaultRequestItems,
  })

  const details = new ReactiveSubTable<DetailsForm>({
    tableName: 'quest_details',
    primaryKey: 'ID',
    createDefault: createDefaultDetails,
  })

  const creatureStarters = new ArraySubTable<RelationEntry>({
    tableName: 'creature_queststarter',
    compositeConfig: relationConfig('creature_queststarter'),
    fieldPrefix: 'creature_starter',
    summarize: (e) => `creature ${e.id}`,
  })

  const creatureEnders = new ArraySubTable<RelationEntry>({
    tableName: 'creature_questender',
    compositeConfig: relationConfig('creature_questender'),
    fieldPrefix: 'creature_ender',
    summarize: (e) => `creature ${e.id}`,
  })

  const gameobjectStarters = new ArraySubTable<RelationEntry>({
    tableName: 'gameobject_queststarter',
    compositeConfig: relationConfig('gameobject_queststarter'),
    fieldPrefix: 'go_starter',
    summarize: (e) => `gameobject ${e.id}`,
  })

  const gameobjectEnders = new ArraySubTable<RelationEntry>({
    tableName: 'gameobject_questender',
    compositeConfig: relationConfig('gameobject_questender'),
    fieldPrefix: 'go_ender',
    summarize: (e) => `gameobject ${e.id}`,
  })

  const locales = new ArraySubTable<LocaleEntry>({
    tableName: 'quest_template_locale',
    compositeConfig: localeConfig,
    fieldPrefix: 'locale',
    summarize: (e) => `${e.LogTitle ?? ''} / ${e.QuestDescription ?? ''}`,
  })

  const offerRewardLocales = new ArraySubTable<OfferRewardLocaleEntry>({
    tableName: 'quest_offer_reward_locale',
    compositeConfig: offerRewardLocaleConfig,
    fieldPrefix: 'offer_locale',
    summarize: (e) => e.RewardText ?? '',
  })

  const requestItemsLocales = new ArraySubTable<RequestItemsLocaleEntry>({
    tableName: 'quest_request_items_locale',
    compositeConfig: requestItemsLocaleConfig,
    fieldPrefix: 'req_locale',
    summarize: (e) => e.CompletionText ?? '',
  })

  const editor = createEntityEditorStore<QuestTemplate>({
    tableName: 'quest_template',
    primaryKey: 'ID',
    createDefault: createDefaultForm,
    load: questService.getQuest,
    delete: questService.deleteQuest,
    subTables: [
      {
        manager: addon,
        load: async (id) => {
          const data = await questService.getQuestAddon(id).catch(() => null)
          if (!data) return null
          const { ID: _id, ...addonFields } = data
          return addonFields as AddonForm
        },
        commitWhenMissing: true,
      },
      {
        manager: offerReward,
        load: async (id) => {
          const data = await questService.getQuestOfferReward(id).catch(() => null)
          if (!data) return null
          return {
            Emote1: data.Emote1, Emote2: data.Emote2, Emote3: data.Emote3, Emote4: data.Emote4,
            EmoteDelay1: data.EmoteDelay1, EmoteDelay2: data.EmoteDelay2,
            EmoteDelay3: data.EmoteDelay3, EmoteDelay4: data.EmoteDelay4,
            RewardText: data.RewardText ?? '',
          } satisfies OfferRewardForm
        },
        commitWhenMissing: true,
      },
      {
        manager: requestItems,
        load: async (id) => {
          const data = await questService.getQuestRequestItems(id).catch(() => null)
          if (!data) return null
          return {
            EmoteOnComplete: data.EmoteOnComplete,
            EmoteOnCompleteDelay: data.EmoteOnCompleteDelay,
            EmoteOnIncomplete: data.EmoteOnIncomplete,
            EmoteOnIncompleteDelay: data.EmoteOnIncompleteDelay,
            CompletionText: data.CompletionText ?? '',
          } satisfies RequestItemsForm
        },
        commitWhenMissing: true,
      },
      {
        manager: details,
        load: async (id) => {
          const data = await questService.getQuestDetails(id).catch(() => null)
          if (!data) return null
          return {
            Emote1: data.Emote1, Emote2: data.Emote2, Emote3: data.Emote3, Emote4: data.Emote4,
            EmoteDelay1: data.EmoteDelay1, EmoteDelay2: data.EmoteDelay2,
            EmoteDelay3: data.EmoteDelay3, EmoteDelay4: data.EmoteDelay4,
          } satisfies DetailsForm
        },
        commitWhenMissing: true,
      },
      {
        manager: locales,
        load: async (id) => {
          const rows = await questService.getQuestLocales(id).catch(() => [])
          return rows.map(row => ({
            locale: row.locale,
            LogTitle: row.LogTitle ?? null,
            QuestDescription: row.QuestDescription ?? null,
            LogDescription: row.LogDescription ?? null,
            AreaDescription: row.AreaDescription ?? null,
            QuestCompletionLog: row.QuestCompletionLog ?? null,
            ObjectiveText1: row.ObjectiveText1 ?? null,
            ObjectiveText2: row.ObjectiveText2 ?? null,
            ObjectiveText3: row.ObjectiveText3 ?? null,
            ObjectiveText4: row.ObjectiveText4 ?? null,
          })) satisfies LocaleEntry[]
        },
      },
      {
        manager: offerRewardLocales,
        load: async (id) => {
          const rows = await questService.getQuestOfferRewardLocales(id).catch(() => [])
          return rows.map(r => ({ locale: r.locale, RewardText: r.RewardText ?? null })) satisfies OfferRewardLocaleEntry[]
        },
      },
      {
        manager: requestItemsLocales,
        load: async (id) => {
          const rows = await questService.getQuestRequestItemsLocales(id).catch(() => [])
          return rows.map(r => ({ locale: r.locale, CompletionText: r.CompletionText ?? null })) satisfies RequestItemsLocaleEntry[]
        },
      },
      {
        manager: creatureStarters,
        load: async (id) => {
          const rel = await loadQuestRelations(id)
          return (rel?.creature_starters ?? []).map(cid => ({ id: cid, quest: id })) satisfies RelationEntry[]
        },
      },
      {
        manager: creatureEnders,
        load: async (id) => {
          const rel = await loadQuestRelations(id)
          return (rel?.creature_enders ?? []).map(cid => ({ id: cid, quest: id })) satisfies RelationEntry[]
        },
      },
      {
        manager: gameobjectStarters,
        load: async (id) => {
          const rel = await loadQuestRelations(id)
          return (rel?.gameobject_starters ?? []).map(gid => ({ id: gid, quest: id })) satisfies RelationEntry[]
        },
      },
      {
        manager: gameobjectEnders,
        load: async (id) => {
          const rel = await loadQuestRelations(id)
          return (rel?.gameobject_enders ?? []).map(gid => ({ id: gid, quest: id })) satisfies RelationEntry[]
        },
      },
    ],
  })

  function markListLoaded() {
    listLoaded.value = true
  }

  function setQuests(data: QuestTemplate[]) {
    quests.value = data
  }

  return {
    quests, loading, currentSearch, listLoaded,
    addon, offerReward, requestItems, details, locales,
    offerRewardLocales, requestItemsLocales,
    creatureStarters, creatureEnders, gameobjectStarters, gameobjectEnders,
    ...editor,
    markListLoaded, setQuests,
  }
})

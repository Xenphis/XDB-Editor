import { invoke } from '@tauri-apps/api/core'
import type { QuestTemplate } from '@/modules/quests/types/quest_template'
import type { QuestTemplateAddon } from '@/modules/quests/types/quest_template_addon'
import type { QuestTemplateLocale } from '@/modules/quests/types/quest_template_locale'
import type { QuestOfferReward } from '@/modules/quests/types/quest_offer_reward'
import type { QuestOfferRewardLocale } from '@/modules/quests/types/quest_offer_reward_locale'
import type { QuestRequestItems } from '@/modules/quests/types/quest_request_items'
import type { QuestRequestItemsLocale } from '@/modules/quests/types/quest_request_items_locale'
import type { QuestDetails } from '@/modules/quests/types/quest_details'
import type { WorldBounds } from '@/modules/map_editor/service'

export interface QuestListResult {
  data: QuestTemplate[]
  total: number
}

/** Restricts the list to quests whose giver spawns on `map`, inside `bounds`
 * (the zone's world rectangle; omitted = the whole map). */
export interface QuestZoneFilter {
  map: number
  bounds?: WorldBounds | null
}

/** 'start' = first quest of a chain, 'single' = quest outside any chain. */
export type QuestChainFilter = 'start' | 'single'

export async function getQuests(
  search?: string,
  limit?: number,
  offset?: number,
  zone?: QuestZoneFilter | null,
  chain?: QuestChainFilter | null,
): Promise<QuestListResult> {
  return invoke('get_quests', {
    search,
    limit,
    offset,
    map: zone?.map,
    minX: zone?.bounds?.minX,
    maxX: zone?.bounds?.maxX,
    minY: zone?.bounds?.minY,
    maxY: zone?.bounds?.maxY,
    chain: chain ?? undefined,
  })
}

export async function getQuest(id: number): Promise<QuestTemplate> {
  return invoke('get_quest', { id })
}

export async function saveQuest(data: QuestTemplate): Promise<void> {
  return invoke('save_quest', { data })
}

export async function deleteQuest(id: number): Promise<void> {
  return invoke('delete_quest', { id })
}

export async function getQuestAddon(id: number): Promise<QuestTemplateAddon | null> {
  return invoke('get_quest_addon', { id })
}

export async function saveQuestAddon(id: number, addon: QuestTemplateAddon): Promise<void> {
  return invoke('save_quest_addon', { id, addon })
}

export async function getQuestLocales(id: number): Promise<QuestTemplateLocale[]> {
  return invoke('get_quest_locales', { id })
}

export async function saveQuestLocales(id: number, locales: QuestTemplateLocale[]): Promise<void> {
  return invoke('save_quest_locales', { id, locales })
}

// ─── quest_offer_reward / quest_request_items / quest_details (1:1) ───────────

export async function getQuestOfferReward(id: number): Promise<QuestOfferReward | null> {
  return invoke('get_quest_offer_reward', { id })
}

export async function saveQuestOfferReward(id: number, data: QuestOfferReward): Promise<void> {
  return invoke('save_quest_offer_reward', { id, data })
}

export async function getQuestRequestItems(id: number): Promise<QuestRequestItems | null> {
  return invoke('get_quest_request_items', { id })
}

export async function getQuestDetails(id: number): Promise<QuestDetails | null> {
  return invoke('get_quest_details', { id })
}

// ─── quest_offer_reward_locale / quest_request_items_locale ───────────────────

export async function getQuestOfferRewardLocales(id: number): Promise<QuestOfferRewardLocale[]> {
  return invoke('get_quest_offer_reward_locales', { id })
}

export async function saveQuestOfferRewardLocales(id: number, locales: QuestOfferRewardLocale[]): Promise<void> {
  return invoke('save_quest_offer_reward_locales', { id, locales })
}

export async function getQuestRequestItemsLocales(id: number): Promise<QuestRequestItemsLocale[]> {
  return invoke('get_quest_request_items_locales', { id })
}

export async function saveQuestRequestItemsLocales(id: number, locales: QuestRequestItemsLocale[]): Promise<void> {
  return invoke('save_quest_request_items_locales', { id, locales })
}

// ─── quest givers / enders (creature + gameobject queststarter/questender) ────

export interface QuestRelations {
  creature_starters: number[]
  creature_enders: number[]
  gameobject_starters: number[]
  gameobject_enders: number[]
}

export async function getQuestRelations(quest: number): Promise<QuestRelations> {
  return invoke('get_quest_relations', { quest })
}

// ─── in-game preview (read-only name lookups) ─────────────────────────────────

export interface QuestPreviewItem {
  entry: number
  name: string
  quality: number
  displayId: number
}

export interface QuestPreviewName {
  entry: number
  name: string
}

export interface QuestPreviewRefs {
  items: QuestPreviewItem[]
  creatures: QuestPreviewName[]
  gameobjects: QuestPreviewName[]
}

export async function getQuestPreviewRefs(
  items: number[],
  creatures: number[],
  gameobjects: number[],
): Promise<QuestPreviewRefs> {
  return invoke('get_quest_preview_refs', { items, creatures, gameobjects })
}

// ─── quest chain graph ────────────────────────────────────────────────────────

export interface QuestChainNode {
  id: number
  /** null = referenced by a link but missing from quest_template. */
  title: string | null
  level: number | null
  min_level: number | null
  quest_type: number | null
  exclusive_group: number
}

export interface QuestChainEdge {
  from: number
  to: number
  /** 'completed' = `to` needs `from` rewarded, 'active' = `from` in the quest log. */
  kind: 'completed' | 'active'
}

export interface QuestChain {
  nodes: QuestChainNode[]
  edges: QuestChainEdge[]
  truncated: boolean
}

export async function getQuestChain(id: number): Promise<QuestChain> {
  return invoke('get_quest_chain', { id })
}

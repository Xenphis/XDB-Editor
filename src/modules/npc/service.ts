import { invoke } from '@tauri-apps/api/core'
import type { CreatureTemplate } from '@/modules/npc/types/creature_template/creature_template'
import type { CreatureTemplateAddon } from '@/modules/npc/types/creature_template/creature_template_addon'
import type { Creature } from '@/modules/npc/types/creature/creature'
import type { CreatureEquipTemplate } from '@/modules/npc/types/creature_template/creature_equip_template'
import type { CreatureTemplateModel } from '@/modules/npc/types/creature_template/creature_template_model'
import type { CreatureTemplateSpell } from '@/modules/npc/types/creature_template/creature_template_spell'
import type { CreatureTemplateLocale } from '@/modules/npc/types/creature_template/creature_template_locale'
import type { CreatureTemplateMovement } from '@/modules/npc/types/creature_template/creature_template_movement'
import type { CreatureTemplateResistance } from '@/modules/npc/types/creature_template/creature_template_resistance'
import type { CreatureAddon } from '@/modules/npc/types/creature/creature_addon'
import type { CreatureMovementOverride } from '@/modules/npc/types/creature/creature_movement_override'
import type { CreatureText } from '@/modules/npc/types/creature_template/creature_text'
import type { CreatureTextLocale } from '@/modules/npc/types/creature_template/creature_text_locale'
import type { CreatureQuestItem } from '@/modules/npc/types/creature_template/creature_questitem'
import type { CreatureOnkillReputation } from '@/modules/npc/types/creature_template/creature_onkill_reputation'
import type { Trainer } from '@/modules/npc/types/trainer/trainer'
import type { TrainerSpell } from '@/modules/npc/types/trainer/trainer_spell'
import type { CreatureDefaultTrainer } from '@/modules/npc/types/trainer/creature_default_trainer'
import type { GossipMenu } from '@/modules/npc/types/gossip/gossip_menu'
import type { GossipMenuOption } from '@/modules/npc/types/gossip/gossip_menu_option'
import type { GossipMenuOptionLocale } from '@/modules/npc/types/gossip/gossip_menu_option_locale'
import type { NpcText } from '@/modules/npc/types/gossip/npc_text'
import type { NpcTextLocale, NpcTextLocaleKey } from '@/modules/npc/types/gossip/npc_text_locale'
import type { CreatureFormationGroup, CreatureFormationMember, CreatureSpawnOption } from '@/modules/npc/types/misc/creature_formations'
import type { NpcVendorGroup, NpcVendorItem, VendorCreatureOption, VendorItemOption } from '@/modules/npc/types/npc/npc_vendor'

export interface NpcListResult {
  data: CreatureTemplate[]
  total: number
}

/** Quêtes démarrées / terminées par cette créature (creature_queststarter / creature_questender). */
export interface EntityQuestRelations {
  starters: number[]
  enders: number[]
}

export async function getNpcs(
  search?: string,
  creatureType?: number,
  limit?: number,
  offset?: number
): Promise<NpcListResult> {
  return invoke('get_npcs', { search, creatureType, limit, offset })
}

export async function getNpc(entry: number): Promise<CreatureTemplate> {
  return invoke('get_npc', { entry })
}

export async function saveNpc(data: CreatureTemplate): Promise<void> {
  return invoke('save_npc', { data })
}

export async function deleteNpc(entry: number): Promise<void> {
  return invoke('delete_npc', { entry })
}

export async function getNpcResistances(entry: number): Promise<CreatureTemplateResistance[]> {
  return invoke('get_npc_resistances', { entry })
}

export async function saveNpcResistances(entry: number, resistances: CreatureTemplateResistance[]): Promise<void> {
  return invoke('save_npc_resistances', { entry, resistances })
}

export async function getNpcMovement(entry: number): Promise<CreatureTemplateMovement | null> {
  return invoke('get_npc_movement', { entry })
}

export async function saveNpcMovement(entry: number, movement: CreatureTemplateMovement): Promise<void> {
  return invoke('save_npc_movement', { entry, movement })
}

export async function getNpcLocales(entry: number): Promise<CreatureTemplateLocale[]> {
  return invoke('get_npc_locales', { entry })
}

export async function saveNpcLocales(entry: number, locales: CreatureTemplateLocale[]): Promise<void> {
  return invoke('save_npc_locales', { entry, locales })
}

export async function getNpcAddon(entry: number): Promise<CreatureTemplateAddon | null> {
  return invoke('get_npc_addon', { entry })
}

export async function saveNpcAddon(entry: number, addon: CreatureTemplateAddon): Promise<void> {
  return invoke('save_npc_addon', { entry, addon })
}

export async function getCreatureSpawns(id: number): Promise<Creature[]> {
  return invoke('get_creature_spawns', { id })
}

export async function saveCreatureSpawn(creature: Creature): Promise<void> {
  return invoke('save_creature_spawn', { creature })
}

export async function deleteCreatureSpawn(guid: number): Promise<void> {
  return invoke('delete_creature_spawn', { guid })
}

export async function getNpcEquip(entry: number): Promise<CreatureEquipTemplate[]> {
  return invoke('get_npc_equip', { entry })
}

export async function saveNpcEquip(entry: number, equips: CreatureEquipTemplate[]): Promise<void> {
  return invoke('save_npc_equip', { entry, equips })
}

export async function getNpcModels(entry: number): Promise<CreatureTemplateModel[]> {
  return invoke('get_npc_models', { entry })
}

export async function saveNpcModels(entry: number, models: CreatureTemplateModel[]): Promise<void> {
  return invoke('save_npc_models', { entry, models })
}

export async function getNpcSpells(entry: number): Promise<CreatureTemplateSpell[]> {
  return invoke('get_npc_spells', { entry })
}

export async function saveNpcSpells(entry: number, spells: CreatureTemplateSpell[]): Promise<void> {
  return invoke('save_npc_spells', { entry, spells })
}

export async function getCreatureQuestItems(entry: number): Promise<CreatureQuestItem[]> {
  return invoke('get_creature_questitem', { entry })
}

export async function saveCreatureQuestItems(entry: number, items: CreatureQuestItem[]): Promise<void> {
  return invoke('save_creature_questitem', { entry, items })
}

// ─── creature_onkill_reputation ───────────────────────────────────────────────

export async function getCreatureOnKillRep(entry: number): Promise<CreatureOnkillReputation | null> {
  return invoke('get_creature_onkill_reputation', { entry })
}

export async function saveCreatureOnKillRep(entry: number, reputation: CreatureOnkillReputation): Promise<void> {
  return invoke('save_creature_onkill_reputation', { entry, reputation })
}

export async function getCreatureTexts(entry: number): Promise<CreatureText[]> {
  return invoke('get_creature_texts', { entry })
}

export async function saveCreatureTexts(entry: number, texts: CreatureText[]): Promise<void> {
  return invoke('save_creature_texts', { entry, texts })
}

export async function getCreatureTextLocales(entry: number): Promise<CreatureTextLocale[]> {
  return invoke('get_creature_text_locales', { entry })
}

export async function saveCreatureTextLocales(entry: number, locales: CreatureTextLocale[]): Promise<void> {
  return invoke('save_creature_text_locales', { entry, locales })
}

// ─── gossip_menu / npc_text ─────────────────────────────────────────────────

export async function getGossipMenuIds(search?: string, limit?: number): Promise<number[]> {
  return invoke('get_gossip_menu_ids', { search, limit })
}

export async function getGossipMenu(menuId: number): Promise<GossipMenu[]> {
  return invoke('get_gossip_menu', { menuId })
}

export async function saveGossipMenu(menuId: number, rows: GossipMenu[]): Promise<void> {
  return invoke('save_gossip_menu', { menuId, rows })
}

export async function getGossipMenuOptions(menuId: number): Promise<GossipMenuOption[]> {
  return invoke('get_gossip_menu_options', { menuId })
}

export async function saveGossipMenuOptions(menuId: number, options: GossipMenuOption[]): Promise<void> {
  return invoke('save_gossip_menu_options', { menuId, options })
}

export async function getGossipMenuOptionLocales(menuId: number): Promise<GossipMenuOptionLocale[]> {
  return invoke('get_gossip_menu_option_locales', { menuId })
}

export async function saveGossipMenuOptionLocales(menuId: number, locales: GossipMenuOptionLocale[]): Promise<void> {
  return invoke('save_gossip_menu_option_locales', { menuId, locales })
}

export async function getNpcTexts(ids: number[]): Promise<NpcText[]> {
  return invoke('get_npc_texts', { ids })
}

export async function saveNpcTexts(texts: NpcText[]): Promise<void> {
  return invoke('save_npc_texts', { texts })
}

export async function getNpcTextLocales(ids: number[]): Promise<NpcTextLocale[]> {
  return invoke('get_npc_text_locales', { ids })
}

export async function saveNpcTextLocales(locales: NpcTextLocale[], deleted: NpcTextLocaleKey[] = []): Promise<void> {
  return invoke('save_npc_text_locales', { locales, deleted })
}

export async function getCreatureAddon(guid: number): Promise<CreatureAddon | null> {
  return invoke('get_creature_addon', { guid })
}

export async function saveCreatureAddon(guid: number, addon: CreatureAddon): Promise<void> {
  return invoke('save_creature_addon', { guid, addon })
}


export async function getCreatureMovementOverride(spawnId: number): Promise<CreatureMovementOverride | null> {
  return invoke('get_creature_movement_override', { spawnId })
}

export async function saveCreatureMovementOverride(spawnId: number, movement: CreatureMovementOverride): Promise<void> {
  return invoke('save_creature_movement_override', { spawnId, movement })
}

// ─── trainer ─────────────────────────────────────────────────────────────────

export async function getTrainers(limit?: number, offset?: number): Promise<Trainer[]> {
  return invoke('get_trainers', { limit, offset })
}

export async function getTrainer(id: number): Promise<Trainer> {
  return invoke('get_trainer', { id })
}

export async function saveTrainer(data: Trainer): Promise<void> {
  return invoke('save_trainer', { data })
}

export async function deleteTrainer(id: number): Promise<void> {
  return invoke('delete_trainer', { id })
}

export async function getTrainerSpells(trainerId: number): Promise<TrainerSpell[]> {
  return invoke('get_trainer_spells', { trainerId })
}

export async function saveTrainerSpells(trainerId: number, spells: TrainerSpell[]): Promise<void> {
  return invoke('save_trainer_spells', { trainerId, spells })
}

export async function getCreatureDefaultTrainers(trainerId: number): Promise<CreatureDefaultTrainer[]> {
  return invoke('get_creature_default_trainers', { trainerId })
}

export async function saveCreatureDefaultTrainers(trainerId: number, entries: CreatureDefaultTrainer[]): Promise<void> {
  return invoke('save_creature_default_trainers', { trainerId, entries })
}

// ─── quest relations (quests this creature starts / ends) ────────────────────

export async function getCreatureQuestRelations(id: number): Promise<EntityQuestRelations> {
  return invoke('get_creature_quest_relations', { id })
}

// ─── creature_formations ─────────────────────────────────────────────────────

export async function getCreatureFormationGroups(): Promise<CreatureFormationGroup[]> {
  return invoke('get_creature_formation_groups')
}

export async function getCreatureFormation(leaderGuid: number): Promise<CreatureFormationMember[]> {
  return invoke('get_creature_formation', { leaderGuid })
}

export async function getCreatureFormationOfMember(memberGuid: number): Promise<CreatureFormationMember | null> {
  return invoke('get_creature_formation_of_member', { memberGuid })
}

export async function searchCreatureSpawns(query: string, map: number | null, limit?: number): Promise<CreatureSpawnOption[]> {
  return invoke('search_creature_spawns', { query, map, limit })
}

export async function deleteCreatureFormation(leaderGuid: number): Promise<void> {
  return invoke('delete_creature_formation', { leaderGuid })
}

// ─── npc_vendor ──────────────────────────────────────────────────────────────

export async function getNpcVendors(): Promise<NpcVendorGroup[]> {
  return invoke('get_npc_vendors')
}

export async function getNpcVendor(entry: number): Promise<NpcVendorItem[]> {
  return invoke('get_npc_vendor', { entry })
}

export async function searchVendorCreatures(query: string, limit?: number): Promise<VendorCreatureOption[]> {
  return invoke('search_vendor_creatures', { query, limit })
}

export async function searchVendorItems(query: string, limit?: number): Promise<VendorItemOption[]> {
  return invoke('search_vendor_items', { query, limit })
}

export async function deleteNpcVendor(entry: number): Promise<void> {
  return invoke('delete_npc_vendor', { entry })
}

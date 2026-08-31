import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CreatureTemplate } from '@/modules/npc/types/creature_template/creature_template'
import type { CompositeKeyConfig } from '@core/composables/useQueryGenerator'
import { ReactiveSubTable, ArraySubTable, DetachedArraySubTable } from '@core/stores/SubTableManager'
import { createEntityEditorStore } from '@core/stores/createEntityEditorStore'
import { escapeSQL, sqlText, sqlNumber } from '@core/utils/sql'
import * as npcService from '@/modules/npc/service'
import type { EntityQuestRelations } from '@/modules/npc/service'
import type { NpcText } from '@/modules/npc/types/gossip/npc_text'
import type { NpcTextLocale } from '@/modules/npc/types/gossip/npc_text_locale'

// ─── Interfaces ──────────────────────────────────────────────────────

export interface ResistanceEntry {
  School: number
  Resistance: number
}

export interface MovementForm {
  Ground: number
  Swim: number
  Flight: number
  Rooted: number
  Chase: number
  Random: number
  InteractionPauseTimer: number
}

export interface AddonForm {
  path_id: number
  mount: number
  MountCreatureID: number
  StandState: number
  AnimTier: number
  VisFlags: number
  SheathState: number
  PvPFlags: number
  emote: number
  visibilityDistanceType: number
  auras: string | null
}

export interface EquipEntry {
  ID: number
  ItemID1: number
  ItemID2: number
  ItemID3: number
}

export interface SpellEntry {
  Index: number
  Spell: number
}

export interface LocaleEntry {
  locale: string
  Name: string
  Title: string | null
}

export interface TextLocaleEntry {
  GroupID: number
  ID: number
  Locale: string
  Text: string | null
}

export interface QuestItemEntry {
  Idx: number
  ItemId: number
}

export interface OnKillRepForm {
  RewOnKillRepFaction1: number
  RewOnKillRepFaction2: number
  MaxStanding1: number
  IsTeamAward1: number
  RewOnKillRepValue1: number
  MaxStanding2: number
  IsTeamAward2: number
  RewOnKillRepValue2: number
  TeamDependent: number
}

export interface TextEntry {
  GroupID: number
  ID: number
  Text: string | null
  Type: number
  Language: number
  Probability: number
  Emote: number
  Duration: number
  Sound: number
  BroadcastTextId: number
  TextRange: number
  comment: string | null
}

export interface GossipMenuEntry {
  TextID: number
  VerifiedBuild: number
}

export interface GossipOptionEntry {
  OptionID: number
  OptionIcon: number
  OptionText: string | null
  OptionBroadcastTextID: number
  OptionType: number
  OptionNpcFlag: number
  ActionMenuID: number
  ActionPoiID: number
  BoxCoded: number
  BoxMoney: number
  BoxText: string | null
  BoxBroadcastTextID: number
  VerifiedBuild: number
}

export interface GossipOptionLocaleEntry {
  OptionID: number
  Locale: string
  OptionText: string | null
  BoxText: string | null
}

// ─── Default factories ──────────────────────────────────────────────

export function createDefaultMovementForm(): MovementForm {
  return { Ground: 1, Swim: 1, Flight: 0, Rooted: 0, Chase: 0, Random: 0, InteractionPauseTimer: 0 }
}

export function createDefaultAddonForm(): AddonForm {
  return { path_id: 0, mount: 0, MountCreatureID: 0, StandState: 0, AnimTier: 0, VisFlags: 0, SheathState: 0, PvPFlags: 0, emote: 0, visibilityDistanceType: 0, auras: null }
}

function createDefaultOnKillRepForm(): OnKillRepForm {
  return {
    RewOnKillRepFaction1: 0,
    RewOnKillRepFaction2: 0,
    MaxStanding1: 0,
    IsTeamAward1: 0,
    RewOnKillRepValue1: 0,
    MaxStanding2: 0,
    IsTeamAward2: 0,
    RewOnKillRepValue2: 0,
    TeamDependent: 0,
  }
}

export function createDefaultNpcText(id: number): NpcText {
  return {
    ID: id,
    text0_0: '', text0_1: null, BroadcastTextID0: 0, lang0: 0, Probability0: 1, EmoteDelay0_0: 0, Emote0_0: 0, EmoteDelay0_1: 0, Emote0_1: 0, EmoteDelay0_2: 0, Emote0_2: 0,
    text1_0: null, text1_1: null, BroadcastTextID1: 0, lang1: 0, Probability1: 0, EmoteDelay1_0: 0, Emote1_0: 0, EmoteDelay1_1: 0, Emote1_1: 0, EmoteDelay1_2: 0, Emote1_2: 0,
    text2_0: null, text2_1: null, BroadcastTextID2: 0, lang2: 0, Probability2: 0, EmoteDelay2_0: 0, Emote2_0: 0, EmoteDelay2_1: 0, Emote2_1: 0, EmoteDelay2_2: 0, Emote2_2: 0,
    text3_0: null, text3_1: null, BroadcastTextID3: 0, lang3: 0, Probability3: 0, EmoteDelay3_0: 0, Emote3_0: 0, EmoteDelay3_1: 0, Emote3_1: 0, EmoteDelay3_2: 0, Emote3_2: 0,
    text4_0: null, text4_1: null, BroadcastTextID4: 0, lang4: 0, Probability4: 0, EmoteDelay4_0: 0, Emote4_0: 0, EmoteDelay4_1: 0, Emote4_1: 0, EmoteDelay4_2: 0, Emote4_2: 0,
    text5_0: null, text5_1: null, BroadcastTextID5: 0, lang5: 0, Probability5: 0, EmoteDelay5_0: 0, Emote5_0: 0, EmoteDelay5_1: 0, Emote5_1: 0, EmoteDelay5_2: 0, Emote5_2: 0,
    text6_0: null, text6_1: null, BroadcastTextID6: 0, lang6: 0, Probability6: 0, EmoteDelay6_0: 0, Emote6_0: 0, EmoteDelay6_1: 0, Emote6_1: 0, EmoteDelay6_2: 0, Emote6_2: 0,
    text7_0: null, text7_1: null, BroadcastTextID7: 0, lang7: 0, Probability7: 0, EmoteDelay7_0: 0, Emote7_0: 0, EmoteDelay7_1: 0, Emote7_1: 0, EmoteDelay7_2: 0, Emote7_2: 0,
    VerifiedBuild: 0,
  }
}

export function createDefaultNpcTextLocale(id: number, locale = ''): NpcTextLocale {
  return {
    ID: id,
    Locale: locale,
    Text0_0: null,
    Text0_1: null,
    Text1_0: null,
    Text1_1: null,
    Text2_0: null,
    Text2_1: null,
    Text3_0: null,
    Text3_1: null,
    Text4_0: null,
    Text4_1: null,
    Text5_0: null,
    Text5_1: null,
    Text6_0: null,
    Text6_1: null,
    Text7_0: null,
    Text7_1: null,
  }
}

function createDefaultForm(): CreatureTemplate {
  return {
    entry: 0, difficulty_entry_1: 0, difficulty_entry_2: 0, difficulty_entry_3: 0,
    KillCredit1: 0, KillCredit2: 0,
    modelid1: 0, modelid2: 0, modelid3: 0, modelid4: 0,
    name: '', subname: null, IconName: null, gossip_menu_id: 0,
    minlevel: 1, maxlevel: 1, exp: 0, faction: 0, npcflag: 0,
    speed_walk: 1, speed_run: 1.14286, scale: 1, rank: 0, dmgschool: 0,
    BaseAttackTime: 2000, RangeAttackTime: 2000, BaseVariance: 1, RangeVariance: 1,
    unit_class: 1, unit_flags: 0, unit_flags2: 0, dynamicflags: 0,
    family: 0, type: 0, type_flags: 0,
    lootid: 0, pickpocketloot: 0, skinloot: 0,
    PetSpellDataId: 0, VehicleId: 0, mingold: 0, maxgold: 0,
    AIName: '', MovementType: 0, HoverHeight: 1,
    HealthModifier: 1, ManaModifier: 1, ArmorModifier: 1, DamageModifier: 1, ExperienceModifier: 1,
    RacialLeader: 0, movementId: 0, RegenHealth: 1,
    mechanic_immune_mask: 0, spell_school_immune_mask: 0, flags_extra: 0,
    ScriptName: '', StringId: null, VerifiedBuild: null,
  }
}

// ─── Composite key configs ──────────────────────────────────────────

const resistanceConfig: Omit<CompositeKeyConfig<ResistanceEntry>, 'parentId'> = {
  table: 'creature_template_resistance',
  parentKey: 'CreatureID',
  childKey: 'School',
  columns: ['Resistance', 'VerifiedBuild'],
  isEqual: (a, b) => a.Resistance === b.Resistance,
  toSqlValues: (e) => [e.Resistance, 0],
  skipInsert: (e) => e.Resistance === 0,
}

const localeConfig: Omit<CompositeKeyConfig<LocaleEntry>, 'parentId'> = {
  table: 'creature_template_locale',
  parentKey: 'entry',
  childKey: 'locale',
  columns: ['Name', 'Title', 'VerifiedBuild'],
  isEqual: (a, b) => a.Name === b.Name && a.Title === b.Title,
  toSqlValues: (e) => [
    `'${escapeSQL(e.Name)}'`,
    e.Title != null ? `'${escapeSQL(e.Title)}'` : null,
    0,
  ],
}

const spellConfig: Omit<CompositeKeyConfig<SpellEntry>, 'parentId'> = {
  table: 'creature_template_spell',
  parentKey: 'CreatureID',
  childKey: 'Index',
  columns: ['Spell', 'VerifiedBuild'],
  isEqual: (a, b) => a.Spell === b.Spell,
  toSqlValues: (e) => [e.Spell, 0],
}

const textConfig: Omit<CompositeKeyConfig<TextEntry>, 'parentId'> = {
  table: 'creature_text',
  parentKey: 'CreatureID',
  childKey: 'GroupID',
  columns: ['ID', 'Text', 'Type', 'Language', 'Probability', 'Emote', 'Duration', 'Sound', 'BroadcastTextId', 'TextRange', 'comment'],
  isEqual: (a, b) => 
    a.ID === b.ID &&
    a.Text === b.Text &&
    a.Type === b.Type &&
    a.Language === b.Language &&
    a.Probability === b.Probability &&
    a.Emote === b.Emote &&
    a.Duration === b.Duration &&
    a.Sound === b.Sound &&
    a.BroadcastTextId === b.BroadcastTextId &&
    a.TextRange === b.TextRange &&
    a.comment === b.comment,
  toSqlValues: (e) => [
    e.ID,
    e.Text != null ? `'${escapeSQL(e.Text)}'` : null,
    e.Type,
    e.Language,
    e.Probability,
    e.Emote,
    e.Duration,
    e.Sound,
    e.BroadcastTextId,
    e.TextRange,
    e.comment != null ? `'${escapeSQL(e.comment)}'` : null,
  ],
  // Composite key: (CreatureID, GroupID, ID)
  getUniqueKey: (e) => `${e.GroupID}:${e.ID}`,
  buildWhereClause: (e, parentId) => `\`CreatureID\` = ${parentId} AND \`GroupID\` = ${e.GroupID} AND \`ID\` = ${e.ID}`,
}

const textLocaleConfig: Omit<CompositeKeyConfig<TextLocaleEntry>, 'parentId'> = {
  table: 'creature_text_locale',
  parentKey: 'CreatureID',
  childKey: 'Locale',
  columns: ['GroupID', 'ID', 'Text'],
  isEqual: (a, b) => a.GroupID === b.GroupID && a.ID === b.ID && a.Text === b.Text,
  toSqlValues: (e) => [
    e.GroupID,
    e.ID,
    e.Text != null ? `'${escapeSQL(e.Text)}'` : null,
  ],
  getUniqueKey: (e) => `${e.GroupID}:${e.ID}:${e.Locale}`,
  buildWhereClause: (e, parentId) =>
    `\`CreatureID\` = ${parentId} AND \`GroupID\` = ${e.GroupID} AND \`ID\` = ${e.ID} AND \`Locale\` = '${escapeSQL(e.Locale)}'`,
}

const equipConfig: Omit<CompositeKeyConfig<EquipEntry>, 'parentId'> = {
  table: 'creature_equip_template',
  parentKey: 'CreatureID',
  childKey: 'ID',
  columns: ['ItemID1', 'ItemID2', 'ItemID3', 'VerifiedBuild'],
  isEqual: (a, b) => a.ItemID1 === b.ItemID1 && a.ItemID2 === b.ItemID2 && a.ItemID3 === b.ItemID3,
  toSqlValues: (e) => [e.ItemID1, e.ItemID2, e.ItemID3, 0],
}

const questItemConfig: Omit<CompositeKeyConfig<QuestItemEntry>, 'parentId'> = {
  table: 'creature_questitem',
  parentKey: 'CreatureEntry',
  childKey: 'Idx',
  columns: ['ItemId', 'VerifiedBuild'],
  isEqual: (a, b) => a.ItemId === b.ItemId,
  toSqlValues: (e) => [e.ItemId, 0],
}

const gossipMenuConfig: Omit<CompositeKeyConfig<GossipMenuEntry>, 'parentId'> = {
  table: 'gossip_menu',
  parentKey: 'MenuID',
  childKey: 'TextID',
  columns: ['VerifiedBuild'],
  isEqual: (a, b) => a.VerifiedBuild === b.VerifiedBuild,
  toSqlValues: (e) => [e.VerifiedBuild],
}

const gossipOptionConfig: Omit<CompositeKeyConfig<GossipOptionEntry>, 'parentId'> = {
  table: 'gossip_menu_option',
  parentKey: 'MenuID',
  childKey: 'OptionID',
  columns: [
    'OptionIcon', 'OptionText', 'OptionBroadcastTextID', 'OptionType', 'OptionNpcFlag',
    'ActionMenuID', 'ActionPoiID', 'BoxCoded', 'BoxMoney', 'BoxText', 'BoxBroadcastTextID', 'VerifiedBuild',
  ],
  isEqual: (a, b) =>
    a.OptionIcon === b.OptionIcon &&
    a.OptionText === b.OptionText &&
    a.OptionBroadcastTextID === b.OptionBroadcastTextID &&
    a.OptionType === b.OptionType &&
    a.OptionNpcFlag === b.OptionNpcFlag &&
    a.ActionMenuID === b.ActionMenuID &&
    a.ActionPoiID === b.ActionPoiID &&
    a.BoxCoded === b.BoxCoded &&
    a.BoxMoney === b.BoxMoney &&
    a.BoxText === b.BoxText &&
    a.BoxBroadcastTextID === b.BoxBroadcastTextID &&
    a.VerifiedBuild === b.VerifiedBuild,
  toSqlValues: (e) => [
    e.OptionIcon,
    sqlText(e.OptionText),
    e.OptionBroadcastTextID,
    e.OptionType,
    e.OptionNpcFlag,
    e.ActionMenuID,
    e.ActionPoiID,
    e.BoxCoded,
    e.BoxMoney,
    sqlText(e.BoxText),
    e.BoxBroadcastTextID,
    e.VerifiedBuild,
  ],
}

const gossipOptionLocaleConfig: Omit<CompositeKeyConfig<GossipOptionLocaleEntry>, 'parentId'> = {
  table: 'gossip_menu_option_locale',
  parentKey: 'MenuID',
  childKey: 'OptionID',
  columns: ['Locale', 'OptionText', 'BoxText'],
  isEqual: (a, b) => a.Locale === b.Locale && a.OptionText === b.OptionText && a.BoxText === b.BoxText,
  toSqlValues: (e) => [
    `'${escapeSQL(e.Locale)}'`,
    sqlText(e.OptionText),
    sqlText(e.BoxText),
  ],
  getUniqueKey: (e) => `${e.OptionID}:${e.Locale}`,
  buildWhereClause: (e, parentId) =>
    `\`MenuID\` = ${parentId} AND \`OptionID\` = ${e.OptionID} AND \`Locale\` = '${escapeSQL(e.Locale)}'`,
}

const npcTextColumns = [
  'ID',
  'text0_0', 'text0_1', 'BroadcastTextID0', 'lang0', 'Probability0', 'EmoteDelay0_0', 'Emote0_0', 'EmoteDelay0_1', 'Emote0_1', 'EmoteDelay0_2', 'Emote0_2',
  'text1_0', 'text1_1', 'BroadcastTextID1', 'lang1', 'Probability1', 'EmoteDelay1_0', 'Emote1_0', 'EmoteDelay1_1', 'Emote1_1', 'EmoteDelay1_2', 'Emote1_2',
  'text2_0', 'text2_1', 'BroadcastTextID2', 'lang2', 'Probability2', 'EmoteDelay2_0', 'Emote2_0', 'EmoteDelay2_1', 'Emote2_1', 'EmoteDelay2_2', 'Emote2_2',
  'text3_0', 'text3_1', 'BroadcastTextID3', 'lang3', 'Probability3', 'EmoteDelay3_0', 'Emote3_0', 'EmoteDelay3_1', 'Emote3_1', 'EmoteDelay3_2', 'Emote3_2',
  'text4_0', 'text4_1', 'BroadcastTextID4', 'lang4', 'Probability4', 'EmoteDelay4_0', 'Emote4_0', 'EmoteDelay4_1', 'Emote4_1', 'EmoteDelay4_2', 'Emote4_2',
  'text5_0', 'text5_1', 'BroadcastTextID5', 'lang5', 'Probability5', 'EmoteDelay5_0', 'Emote5_0', 'EmoteDelay5_1', 'Emote5_1', 'EmoteDelay5_2', 'Emote5_2',
  'text6_0', 'text6_1', 'BroadcastTextID6', 'lang6', 'Probability6', 'EmoteDelay6_0', 'Emote6_0', 'EmoteDelay6_1', 'Emote6_1', 'EmoteDelay6_2', 'Emote6_2',
  'text7_0', 'text7_1', 'BroadcastTextID7', 'lang7', 'Probability7', 'EmoteDelay7_0', 'Emote7_0', 'EmoteDelay7_1', 'Emote7_1', 'EmoteDelay7_2', 'Emote7_2',
  'VerifiedBuild',
] as const satisfies readonly (keyof NpcText)[]

const npcTextLocaleColumns = [
  'ID', 'Locale',
  'Text0_0', 'Text0_1', 'Text1_0', 'Text1_1', 'Text2_0', 'Text2_1', 'Text3_0', 'Text3_1',
  'Text4_0', 'Text4_1', 'Text5_0', 'Text5_1', 'Text6_0', 'Text6_1', 'Text7_0', 'Text7_1',
] as const satisfies readonly (keyof NpcTextLocale)[]

function rowValuesEqual<T extends object>(columns: readonly (keyof T)[], a: T, b: T): boolean {
  return columns.every(column => a[column] === b[column])
}

function toNpcTextSqlValues(entry: NpcText): (string | number | null)[] {
  return npcTextColumns.map(column => {
    const value = entry[column]
    return typeof value === 'string' || value == null ? sqlText(value as string | null | undefined) : sqlNumber(value as number | null | undefined)
  })
}

function toNpcTextLocaleSqlValues(entry: NpcTextLocale): (string | number | null)[] {
  return npcTextLocaleColumns.map(column => {
    const value = entry[column]
    return typeof value === 'string' || value == null ? sqlText(value as string | null | undefined) : sqlNumber(value as number | null | undefined)
  })
}

// ─── Store ──────────────────────────────────────────────────────────

// ─── Quest relations (creature ↔ quest, jonction sans colonne de valeur) ─────

export interface CreatureQuestRelEntry {
  id: number
  quest: number
}

function creatureQuestRelConfig(table: string): Omit<CompositeKeyConfig<CreatureQuestRelEntry>, 'parentId'> {
  return {
    table,
    parentKey: 'id',
    childKey: 'quest',
    columns: [],
    isEqual: () => true,
    toSqlValues: () => [],
  }
}

let creatureRelCache: { id: number; promise: Promise<EntityQuestRelations | null> } | null = null
function loadCreatureQuestRelations(entry: number): Promise<EntityQuestRelations | null> {
  if (!creatureRelCache || creatureRelCache.id !== entry) {
    const e = { id: entry, promise: npcService.getCreatureQuestRelations(entry).catch(() => null) }
    creatureRelCache = e
    e.promise.finally(() => { if (creatureRelCache === e) creatureRelCache = null })
  }
  return creatureRelCache.promise
}

export const useNpcModuleStore = defineStore('npcModule', () => {
  // --- List state ---
  const npcs = ref<CreatureTemplate[]>([])
  const loading = ref(false)
  const currentSearch = ref('')
  const currentTypeFilter = ref<number | null>(null)
  const listLoaded = ref(false)
  const gossipMenuIds = ref<number[]>([])
  const gossipMenuIdsLoading = ref(false)

  // --- Sub-table managers ---
  const resistances = new ArraySubTable<ResistanceEntry>({
    tableName: 'creature_template_resistance',
    compositeConfig: resistanceConfig,
    fieldPrefix: 'resistance_school',
    summarize: (e) => String(e.Resistance),
  })

  const movement = new ReactiveSubTable<MovementForm>({
    tableName: 'creature_template_movement',
    primaryKey: 'CreatureId',
    createDefault: createDefaultMovementForm,
  })

  const addon = new ReactiveSubTable<AddonForm>({
    tableName: 'creature_template_addon',
    primaryKey: 'entry',
    createDefault: createDefaultAddonForm,
  })

  const locales = new ArraySubTable<LocaleEntry>({
    tableName: 'creature_template_locale',
    compositeConfig: localeConfig,
    fieldPrefix: 'locale',
    summarize: (e) => `${e.Name} / ${e.Title ?? ''}`,
  })

  const equips = new ArraySubTable<EquipEntry>({
    tableName: 'creature_equip_template',
    compositeConfig: equipConfig,
    fieldPrefix: 'equip_set',
    summarize: (e) => `${e.ItemID1}/${e.ItemID2}/${e.ItemID3}`,
  })

  const spells = new ArraySubTable<SpellEntry>({
    tableName: 'creature_template_spell',
    compositeConfig: spellConfig,
    fieldPrefix: 'spell_slot',
    summarize: (e) => String(e.Spell),
  })

  const textLocales = new ArraySubTable<TextLocaleEntry>({
    tableName: 'creature_text_locale',
    compositeConfig: textLocaleConfig,
    fieldPrefix: 'text_locale',
    summarize: (e) => `[${e.GroupID}:${e.ID}:${e.Locale}] ${e.Text || '(empty)'}`,
  })

  const texts = new ArraySubTable<TextEntry>({
    tableName: 'creature_text',
    compositeConfig: textConfig,
    fieldPrefix: 'text_group',
    summarize: (e) => `[${e.GroupID}:${e.ID}] ${e.Text || '(empty)'}`,
  })

  const onKillRep = new ReactiveSubTable<OnKillRepForm>({
    tableName: 'creature_onkill_reputation',
    primaryKey: 'creature_id',
    createDefault: createDefaultOnKillRepForm,
  })

  const questItems = new ArraySubTable<QuestItemEntry>({
    tableName: 'creature_questitem',
    compositeConfig: questItemConfig,
    fieldPrefix: 'quest_item',
    summarize: (e) => String(e.ItemId),
  })

  const questStarters = new ArraySubTable<CreatureQuestRelEntry>({
    tableName: 'creature_queststarter',
    compositeConfig: creatureQuestRelConfig('creature_queststarter'),
    fieldPrefix: 'quest_starter',
    summarize: (e) => `quest ${e.quest}`,
  })

  const questEnders = new ArraySubTable<CreatureQuestRelEntry>({
    tableName: 'creature_questender',
    compositeConfig: creatureQuestRelConfig('creature_questender'),
    fieldPrefix: 'quest_ender',
    summarize: (e) => `quest ${e.quest}`,
  })

  const gossipMenus = new ArraySubTable<GossipMenuEntry>({
    tableName: 'gossip_menu',
    compositeConfig: gossipMenuConfig,
    fieldPrefix: 'gossip_text',
    summarize: (e) => `TextID ${e.TextID}`,
  })

  const gossipOptions = new ArraySubTable<GossipOptionEntry>({
    tableName: 'gossip_menu_option',
    compositeConfig: gossipOptionConfig,
    fieldPrefix: 'gossip_option',
    summarize: (e) => `[${e.OptionID}] ${e.OptionText || '(empty)'}`,
  })

  const gossipOptionLocales = new ArraySubTable<GossipOptionLocaleEntry>({
    tableName: 'gossip_menu_option_locale',
    compositeConfig: gossipOptionLocaleConfig,
    fieldPrefix: 'gossip_option_locale',
    summarize: (e) => `[${e.OptionID}:${e.Locale}] ${e.OptionText || e.BoxText || '(empty)'}`,
  })

  const npcTexts = new DetachedArraySubTable<NpcText>({
    tableName: 'npc_text',
    columns: [...npcTextColumns],
    getUniqueKey: (e) => String(e.ID),
    buildWhereClause: (e) => `\`ID\` = ${e.ID}`,
    isEqual: (a, b) => rowValuesEqual(npcTextColumns, a, b),
    toSqlValues: toNpcTextSqlValues,
    fieldPrefix: 'npc_text',
    summarize: (e) => `#${e.ID} ${e.text0_0 || e.text0_1 || '(empty)'}`,
    deleteMissing: false,
  })

  const npcTextLocales = new DetachedArraySubTable<NpcTextLocale>({
    tableName: 'npc_text_locale',
    columns: [...npcTextLocaleColumns],
    getUniqueKey: (e) => `${e.ID}:${e.Locale}`,
    buildWhereClause: (e) => `\`ID\` = ${e.ID} AND \`Locale\` = '${escapeSQL(e.Locale)}'`,
    isEqual: (a, b) => rowValuesEqual(npcTextLocaleColumns, a, b),
    toSqlValues: toNpcTextLocaleSqlValues,
    fieldPrefix: 'npc_text_locale',
    summarize: (e) => `#${e.ID}:${e.Locale}`,
  })

  function getGossipMenuParentId(formData: CreatureTemplate): number {
    const menuId = Number(formData.gossip_menu_id)
    return Number.isFinite(menuId) ? menuId : 0
  }

  function getGossipTextIds(rows: GossipMenuEntry[] = gossipMenus.getNewEntries()): number[] {
    return [...new Set(rows.map(row => Number(row.TextID)).filter(id => Number.isFinite(id) && id > 0))]
  }

  function ensureGossipMenuIdOption(menuId: number) {
    if (menuId > 0 && !gossipMenuIds.value.includes(menuId)) {
      gossipMenuIds.value = [...gossipMenuIds.value, menuId].sort((a, b) => a - b)
    }
  }

  async function fetchGossipMenuRows(menuId: number): Promise<GossipMenuEntry[]> {
    if (menuId <= 0) return []
    const rows = await npcService.getGossipMenu(menuId).catch(() => [])
    return rows.map(row => ({ TextID: row.TextID, VerifiedBuild: row.VerifiedBuild })) satisfies GossipMenuEntry[]
  }

  async function fetchNpcTextsForMenu(menuId: number): Promise<NpcText[]> {
    const menuRows = await fetchGossipMenuRows(menuId)
    const textIds = getGossipTextIds(menuRows)
    if (textIds.length === 0) return []
    const rows = await npcService.getNpcTexts(textIds).catch(() => [])
    const rowMap = new Map(rows.map(row => [row.ID, row]))
    return textIds.map(id => rowMap.get(id) ?? createDefaultNpcText(id))
  }

  async function fetchNpcTextLocalesForMenu(menuId: number): Promise<NpcTextLocale[]> {
    const menuRows = await fetchGossipMenuRows(menuId)
    const textIds = getGossipTextIds(menuRows)
    if (textIds.length === 0) return []
    return npcService.getNpcTextLocales(textIds).catch(() => [])
  }

  async function loadGossipMenu(menuId: number) {
    if (menuId <= 0) {
      gossipMenus.load([])
      gossipOptions.load([])
      gossipOptionLocales.load([])
      npcTexts.load([])
      npcTextLocales.load([])
      return
    }

    ensureGossipMenuIdOption(menuId)
    const [menuRows, optionRows, optionLocaleRows] = await Promise.all([
      fetchGossipMenuRows(menuId),
      npcService.getGossipMenuOptions(menuId).catch(() => []),
      npcService.getGossipMenuOptionLocales(menuId).catch(() => []),
    ])
    const textIds = getGossipTextIds(menuRows)
    const [textRows, textLocaleRows] = await Promise.all([
      textIds.length > 0 ? npcService.getNpcTexts(textIds).catch(() => []) : Promise.resolve([]),
      textIds.length > 0 ? npcService.getNpcTextLocales(textIds).catch(() => []) : Promise.resolve([]),
    ])
    const textMap = new Map(textRows.map(row => [row.ID, row]))

    gossipMenus.load(menuRows)
    gossipOptions.load(optionRows.map(row => ({
      OptionID: row.OptionID,
      OptionIcon: row.OptionIcon,
      OptionText: row.OptionText,
      OptionBroadcastTextID: row.OptionBroadcastTextID,
      OptionType: row.OptionType,
      OptionNpcFlag: row.OptionNpcFlag,
      ActionMenuID: row.ActionMenuID,
      ActionPoiID: row.ActionPoiID,
      BoxCoded: row.BoxCoded,
      BoxMoney: row.BoxMoney,
      BoxText: row.BoxText,
      BoxBroadcastTextID: row.BoxBroadcastTextID,
      VerifiedBuild: row.VerifiedBuild,
    })))
    gossipOptionLocales.load(optionLocaleRows.map(row => ({
      OptionID: row.OptionID,
      Locale: row.Locale,
      OptionText: row.OptionText,
      BoxText: row.BoxText,
    })))
    npcTexts.load(textIds.map(id => textMap.get(id) ?? createDefaultNpcText(id)))
    npcTextLocales.load(textLocaleRows)
  }

  async function loadGossipMenuIds(search = '') {
    gossipMenuIdsLoading.value = true
    try {
      gossipMenuIds.value = await npcService.getGossipMenuIds(search || undefined, 100)
      ensureGossipMenuIdOption(getGossipMenuParentId(editor.formData))
    } finally {
      gossipMenuIdsLoading.value = false
    }
  }

  const editor = createEntityEditorStore<CreatureTemplate>({
    tableName: 'creature_template',
    primaryKey: 'entry',
    createDefault: createDefaultForm,
    load: npcService.getNpc,
    delete: npcService.deleteNpc,
    subTables: [
      {
        manager: resistances,
        load: async (entry) => {
          const rows = await npcService.getNpcResistances(entry).catch(() => [])
          return rows.map(row => ({ School: row.School, Resistance: row.Resistance })) satisfies ResistanceEntry[]
        },
      },
      {
        manager: movement,
        load: async (entry) => {
          const data = await npcService.getNpcMovement(entry).catch(() => null)
          if (!data) return null
          const { CreatureId: _creatureId, ...movementFields } = data
          return movementFields as MovementForm
        },
        commitWhenMissing: true,
      },
      {
        manager: addon,
        load: async (entry) => {
          const data = await npcService.getNpcAddon(entry).catch(() => null)
          if (!data) return null
          const { entry: _entry, ...addonFields } = data
          return addonFields as AddonForm
        },
        commitWhenMissing: true,
      },
      {
        manager: locales,
        load: async (entry) => {
          const rows = await npcService.getNpcLocales(entry).catch(() => [])
          return rows.map(row => ({ locale: row.locale, Name: row.Name, Title: row.Title })) satisfies LocaleEntry[]
        },
      },
      {
        manager: equips,
        load: async (entry) => {
          const rows = await npcService.getNpcEquip(entry).catch(() => [])
          return rows.map(row => ({ ID: row.ID, ItemID1: row.ItemID1, ItemID2: row.ItemID2, ItemID3: row.ItemID3 })) satisfies EquipEntry[]
        },
      },
      {
        manager: spells,
        load: async (entry) => {
          const rows = await npcService.getNpcSpells(entry).catch(() => [])
          return rows.map(row => ({ Index: row.Index, Spell: row.Spell })) satisfies SpellEntry[]
        },
      },
      {
        manager: texts,
        load: async (entry) => {
          const rows = await npcService.getCreatureTexts(entry).catch(() => [])
          return rows.map(row => ({
            GroupID: row.GroupID,
            ID: row.ID,
            Text: row.Text,
            Type: row.Type,
            Language: row.Language,
            Probability: row.Probability,
            Emote: row.Emote,
            Duration: row.Duration,
            Sound: row.Sound,
            BroadcastTextId: row.BroadcastTextId,
            TextRange: row.TextRange,
            comment: row.comment,
          })) satisfies TextEntry[]
        },
      },
      {
        manager: textLocales,
        load: async (entry) => {
          const rows = await npcService.getCreatureTextLocales(entry).catch(() => [])
          return rows.map(row => ({
            GroupID: row.GroupID,
            ID: row.ID,
            Locale: row.Locale,
            Text: row.Text ?? null,
          })) satisfies TextLocaleEntry[]
        },
      },
      {
        manager: questItems,
        load: async (entry) => {
          const rows = await npcService.getCreatureQuestItems(entry).catch(() => [])
          return rows.map(row => ({ Idx: row.Idx, ItemId: row.ItemId })) satisfies QuestItemEntry[]
        },
      },
      {
        manager: questStarters,
        load: async (entry) => {
          const rel = await loadCreatureQuestRelations(entry)
          return (rel?.starters ?? []).map(q => ({ id: entry, quest: q })) satisfies CreatureQuestRelEntry[]
        },
      },
      {
        manager: questEnders,
        load: async (entry) => {
          const rel = await loadCreatureQuestRelations(entry)
          return (rel?.enders ?? []).map(q => ({ id: entry, quest: q })) satisfies CreatureQuestRelEntry[]
        },
      },
      {
        manager: onKillRep,
        load: async (entry) => {
          const data = await npcService.getCreatureOnKillRep(entry).catch(() => null)
          if (!data) return null
          const { creature_id: _creatureId, ...repFields } = data
          return repFields as OnKillRepForm
        },
        commitWhenMissing: true,
      },
      {
        manager: gossipMenus,
        getParentId: getGossipMenuParentId,
        load: async (_entry, formData) => fetchGossipMenuRows(getGossipMenuParentId(formData)),
      },
      {
        manager: gossipOptions,
        getParentId: getGossipMenuParentId,
        load: async (_entry, formData) => {
          const menuId = getGossipMenuParentId(formData)
          if (menuId <= 0) return []
          const rows = await npcService.getGossipMenuOptions(menuId).catch(() => [])
          return rows.map(row => ({
            OptionID: row.OptionID,
            OptionIcon: row.OptionIcon,
            OptionText: row.OptionText,
            OptionBroadcastTextID: row.OptionBroadcastTextID,
            OptionType: row.OptionType,
            OptionNpcFlag: row.OptionNpcFlag,
            ActionMenuID: row.ActionMenuID,
            ActionPoiID: row.ActionPoiID,
            BoxCoded: row.BoxCoded,
            BoxMoney: row.BoxMoney,
            BoxText: row.BoxText,
            BoxBroadcastTextID: row.BoxBroadcastTextID,
            VerifiedBuild: row.VerifiedBuild,
          })) satisfies GossipOptionEntry[]
        },
      },
      {
        manager: gossipOptionLocales,
        getParentId: getGossipMenuParentId,
        load: async (_entry, formData) => {
          const menuId = getGossipMenuParentId(formData)
          if (menuId <= 0) return []
          const rows = await npcService.getGossipMenuOptionLocales(menuId).catch(() => [])
          return rows.map(row => ({
            OptionID: row.OptionID,
            Locale: row.Locale,
            OptionText: row.OptionText,
            BoxText: row.BoxText,
          })) satisfies GossipOptionLocaleEntry[]
        },
      },
      {
        manager: npcTexts,
        getParentId: () => 0,
        load: async (_entry, formData) => fetchNpcTextsForMenu(getGossipMenuParentId(formData)),
      },
      {
        manager: npcTextLocales,
        getParentId: () => 0,
        load: async (_entry, formData) => fetchNpcTextLocalesForMenu(getGossipMenuParentId(formData)),
      },
    ],
  })

  async function setGossipMenuId(menuId: number | string | null | undefined) {
    const nextMenuId = Number(menuId) || 0
    editor.formData.gossip_menu_id = nextMenuId
    await loadGossipMenu(nextMenuId)
  }

  function markListLoaded() {
    listLoaded.value = true
  }

  function setNpcs(data: CreatureTemplate[]) {
    npcs.value = data
  }

  return {
    // List state
    npcs, loading, currentSearch, currentTypeFilter, listLoaded, gossipMenuIds, gossipMenuIdsLoading,
    // Sub-table managers
    resistances, movement, addon, locales, equips, spells, texts, textLocales, questItems, questStarters, questEnders, onKillRep,
    gossipMenus, gossipOptions, gossipOptionLocales, npcTexts, npcTextLocales,
    ...editor,
    editingEntry: editor.editingId,
    markListLoaded, setNpcs, loadGossipMenuIds, loadGossipMenu, setGossipMenuId,
  }
})

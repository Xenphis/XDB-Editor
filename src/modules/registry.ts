import type { RouteRecordRaw } from 'vue-router'
import { npcRoutes } from '@/modules/npc/routes'
import { gameObjectRoutes } from '@/modules/game_objects/routes'
import { itemRoutes } from '@/modules/item/routes'
import { questRoutes } from '@/modules/quests/routes'
import { instanceRoutes } from '@/modules/instances/routes'
import { explorationRoutes } from '@/modules/exploration/routes'
import { classLevelStatsRoutes } from '@/modules/class_level_stats/routes'
import { lootAndItemRoutes } from '@/modules/loot_and_item/routes'
import { mapEditorRoutes } from '@/modules/map_editor/routes'
import { modelSearchRoutes } from '@/modules/model_search/routes'
import { smartScriptsRoutes } from '@/modules/smart_scripts/routes'
import objectFr from '@/modules/object/i18n/fr.json'
import objectEn from '@/modules/object/i18n/en.json'
import npcFr from '@/modules/npc/i18n/fr.json'
import npcEn from '@/modules/npc/i18n/en.json'
import goFr from '@/modules/game_objects/i18n/fr.json'
import goEn from '@/modules/game_objects/i18n/en.json'
import itemFr from '@/modules/item/i18n/fr.json'
import itemEn from '@/modules/item/i18n/en.json'
import questFr from '@/modules/quests/i18n/fr.json'
import questEn from '@/modules/quests/i18n/en.json'
import instancesFr from '@/modules/instances/i18n/fr.json'
import instancesEn from '@/modules/instances/i18n/en.json'
import explorationFr from '@/modules/exploration/i18n/fr.json'
import explorationEn from '@/modules/exploration/i18n/en.json'
import classLevelStatsFr from '@/modules/class_level_stats/i18n/fr.json'
import classLevelStatsEn from '@/modules/class_level_stats/i18n/en.json'
import lootItemFr from '@/modules/loot_and_item/i18n/fr.json'
import lootItemEn from '@/modules/loot_and_item/i18n/en.json'
import modelViewerFr from '@/modules/model_viewer/i18n/fr.json'
import modelViewerEn from '@/modules/model_viewer/i18n/en.json'
import mapEditorFr from '@/modules/map_editor/i18n/fr.json'
import mapEditorEn from '@/modules/map_editor/i18n/en.json'
import modelSearchFr from '@/modules/model_search/i18n/fr.json'
import modelSearchEn from '@/modules/model_search/i18n/en.json'
import smartScriptsFr from '@/modules/smart_scripts/i18n/fr.json'
import smartScriptsEn from '@/modules/smart_scripts/i18n/en.json'

export type AppLocale = 'en' | 'fr'

type LocaleMessages = Record<string, unknown>

export interface ModuleNavigationDefinition {
  id: string
  icon: string
}

export interface ModuleNavigationItem extends ModuleNavigationDefinition {
  path: string
}

export interface ModuleI18nDefinition {
  en: LocaleMessages
  fr: LocaleMessages
}

export interface AppModuleDefinition {
  id: string
  basePath: string
  routes: RouteRecordRaw[]
  navigation?: ModuleNavigationDefinition
  i18n?: ModuleI18nDefinition
}

export interface ModuleI18nMessages {
  locale: AppLocale
  messages: LocaleMessages
}

export const sqlSessionRoute: RouteRecordRaw = {
  path: 'sql-session',
  name: 'sql-session',
  component: () => import('@/modules/sql_session/pages/SqlSessionModule.vue'),
}

export const appModules: AppModuleDefinition[] = [
  {
    id: 'npc',
    basePath: '/npc',
    navigation: { id: 'npc', icon: 'pi pi-users' },
    i18n: { en: npcEn, fr: npcFr },
    routes: npcRoutes,
  },
  {
    // One page over two tables: the item and gameobject modules keep their
    // own stores and editors, and live under this /object prefix so the navbar
    // entry stays lit on both. Contributes the switch between them.
    id: 'object',
    basePath: '/object',
    navigation: { id: 'object', icon: 'pi pi-box' },
    i18n: { en: objectEn, fr: objectFr },
    routes: [
      { path: 'object', redirect: '/object/item-template' },
    ],
  },
  {
    // Second table of the "Object" section, reached from its switch.
    id: 'gameobject',
    basePath: '/object/gameobject-template',
    i18n: { en: goEn, fr: goFr },
    routes: gameObjectRoutes,
  },
  {
    // Tag-based model finder for NPCs / GameObjects. Read-only: it searches the
    // creature_model_tags / gameobject_model_tags tables (filled manually via
    // SQL). Also embedded as a picker dialog in the NPC & GameObject editors.
    // Reached via the "Misc" hub card, not its own navbar entry.
    id: 'model-search',
    basePath: '/model-search',
    i18n: { en: modelSearchEn, fr: modelSearchFr },
    routes: modelSearchRoutes,
  },
  {
    // Default table of the "Object" section (what /object lands on).
    id: 'item',
    basePath: '/object/item-template',
    i18n: { en: itemEn, fr: itemFr },
    routes: itemRoutes,
  },
  {
    // One page over the six profession loot tables (fishing, milling,
    // pickpocketing, disenchant, skinning, prospecting), swapped with a
    // dropdown. Creature/gameobject loot stays out: the gameobject one is
    // already edited from the GameObject editor's Loot tab.
    id: 'loot-items',
    basePath: '/loot-items',
    navigation: { id: 'loot-items', icon: 'pi pi-gift' },
    i18n: { en: lootItemEn, fr: lootItemFr },
    routes: lootAndItemRoutes,
  },
  {
    id: 'quests',
    basePath: '/quests',
    navigation: { id: 'quests', icon: 'pi pi-compass' },
    i18n: { en: questEn, fr: questFr },
    routes: questRoutes,
  },
  {
    id: 'spells',
    basePath: '/spells',
    navigation: { id: 'spells', icon: 'pi pi-star' },
    routes: [
      {
        path: 'spells',
        name: 'spells',
        component: () => import('@core/components/PlaceholderModule.vue'),
        props: { moduleId: 'spells' },
      },
    ],
  },
  {
    // World browser rendered from the local client's data (minimaps, 2D/3D
    // world, spawns) and owner of the `game_tele` teleport points.
    id: 'map-editor',
    basePath: '/map-editor',
    navigation: { id: 'world-editor', icon: 'pi pi-globe' },
    i18n: { en: mapEditorEn, fr: mapEditorFr },
    routes: mapEditorRoutes,
  },
  {
    id: 'instances',
    basePath: '/instances',
    // navigation: { id: 'instances', icon: 'pi pi-building' },
    i18n: { en: instancesEn, fr: instancesFr },
    routes: instanceRoutes,
  },
  {
    // SmartAI scripts are edited from the creature / gameobject editors' "SmartAI"
    // tab. This standalone workspace stays reachable through the "Misc" hub card
    // for sources that have no host editor (areatriggers, timed actionlists).
    id: 'smart-scripts',
    basePath: '/smart-scripts',
    i18n: { en: smartScriptsEn, fr: smartScriptsFr },
    routes: smartScriptsRoutes,
  },
  {
    // Shared capability module (no routes / sidebar entry): contributes the
    // model-preview viewer, its settings store/service and i18n.
    id: 'model-viewer',
    basePath: '/model-viewer',
    i18n: { en: modelViewerEn, fr: modelViewerFr },
    routes: [],
  },
  {
    // creature_classlevelstats: the base stat matrix per class and level.
    // Server-wide tuning rather than per-creature work, hence the "Misc" hub
    // card instead of a place in the NPC module.
    id: 'class-level-stats',
    basePath: '/class-level-stats',
    i18n: { en: classLevelStatsEn, fr: classLevelStatsFr },
    routes: classLevelStatsRoutes,
  },
  {
    // exploration_basexp is a single small table with no editor of its own to
    // hang off: reached through the "Misc" hub card, no navbar entry.
    id: 'exploration',
    basePath: '/exploration',
    i18n: { en: explorationEn, fr: explorationFr },
    routes: explorationRoutes,
  },
  {
    id: 'misc',
    basePath: '/server',
    navigation: { id: 'misc', icon: 'pi pi-server' },
    routes: [
      { path: 'server', name: 'server', component: () => import('@/modules/misc_hub/MiscHub.vue') },
    ],
  },
]

export const moduleRoutes = appModules.flatMap(module => module.routes)

export const moduleNavigationItems = appModules.flatMap<ModuleNavigationItem>(module => (
  module.navigation ? [{ ...module.navigation, path: module.basePath }] : []
))

export const moduleI18nMessages = appModules.flatMap<ModuleI18nMessages>(module => {
  if (!module.i18n) {
    return []
  }

  return [
    { locale: 'fr', messages: module.i18n.fr },
    { locale: 'en', messages: module.i18n.en },
  ]
})
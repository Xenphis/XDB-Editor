import type { RouteRecordRaw } from 'vue-router'

/**
 * One workspace over every profession loot table, like the Object section: the
 * `:type` param picks the table (and the store behind it), `:entry` the loot id
 * being edited. `/loot-items` lands on the first type so the navbar entry
 * always resolves to something.
 */
export const lootAndItemRoutes: RouteRecordRaw[] = [
  {
    path: 'loot-items',
    redirect: '/loot-items/fishing',
  },
  {
    path: 'loot-items/:type/:entry?',
    name: 'loot-template',
    component: () => import('@/modules/loot_and_item/pages/LootWorkspace.vue'),
  },
]

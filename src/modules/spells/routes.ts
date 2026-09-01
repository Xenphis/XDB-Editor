import type { RouteRecordRaw } from 'vue-router'

export const spellRoutes: RouteRecordRaw[] = [
  {
    // No param = browse the client's spell list only; :entry = a spell id to
    // tune. There is no 'new' mode — spells come from the client, not the DB.
    path: 'spells/:entry?',
    name: 'spells',
    component: () => import('@/modules/spells/pages/SpellsWorkspace.vue'),
  },
]

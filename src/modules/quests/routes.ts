import type { RouteRecordRaw } from 'vue-router'

export const questRoutes: RouteRecordRaw[] = [
  {
    // Single workspace route: no param = list only, 'new' = create mode,
    // otherwise the quest ID to edit.
    path: 'quests/:id?',
    name: 'quests',
    component: () => import('@/modules/quests/pages/QuestWorkspace.vue'),
  },
]

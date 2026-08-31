import type { RouteRecordRaw } from 'vue-router'

export const explorationRoutes: RouteRecordRaw[] = [
  {
    // Reached from the Misc hub — no navbar entry of its own.
    // No param = list only, 'new' = create mode, otherwise the level to edit.
    path: 'exploration/:level?',
    name: 'exploration-basexp',
    component: () => import('@/modules/exploration/pages/ExplorationBasexpWorkspace.vue'),
  },
]

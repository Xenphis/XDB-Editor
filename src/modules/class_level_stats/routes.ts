import type { RouteRecordRaw } from 'vue-router'

export const classLevelStatsRoutes: RouteRecordRaw[] = [
  {
    // Reached from the Misc hub — no navbar entry of its own.
    // Composite key: both params or none (the table has no create mode).
    path: 'class-level-stats/:level?/:classId?',
    name: 'class-level-stats',
    component: () => import('@/modules/class_level_stats/pages/ClassLevelStatsWorkspace.vue'),
  },
]

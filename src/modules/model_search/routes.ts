import type { RouteRecordRaw } from 'vue-router'

export const modelSearchRoutes: RouteRecordRaw[] = [
  {
    path: 'model-search',
    name: 'model-search',
    component: () => import('@/modules/model_search/pages/ModelSearchWorkspace.vue'),
  },
]

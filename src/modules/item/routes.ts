import type { RouteRecordRaw } from 'vue-router'

export const itemRoutes: RouteRecordRaw[] = [
  {
    // Single workspace route: no param = list only, 'new' = create mode,
    // otherwise the entry to edit.
    path: 'object/item-template/:entry?',
    name: 'item',
    component: () => import('@/modules/item/pages/ItemWorkspace.vue'),
  },
]

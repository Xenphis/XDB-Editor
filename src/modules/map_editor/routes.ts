import type { RouteRecordRaw } from 'vue-router'

export const mapEditorRoutes: RouteRecordRaw[] = [
  {
    path: 'map-editor',
    name: 'map-editor',
    component: () => import('@/modules/map_editor/pages/MapEditorModule.vue'),
  },
]

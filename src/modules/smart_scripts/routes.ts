import type { RouteRecordRaw } from 'vue-router'

export const smartScriptsRoutes: RouteRecordRaw[] = [
  {
    // No params = list only; otherwise the (source_type, entryorguid) pair
    // identifying one script set. The component is reused across param changes.
    path: 'smart-scripts/:sourceType?/:entry?',
    name: 'smart-scripts',
    component: () => import('@/modules/smart_scripts/pages/SmartScriptsWorkspace.vue'),
  },
]

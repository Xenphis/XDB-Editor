import type { RouteRecordRaw } from 'vue-router'

// Hub + one workspace route per sub-table: no param = list only,
// 'new' = create mode, otherwise the key of the row to edit.
export const instanceRoutes: RouteRecordRaw[] = [
  {
    path: 'instances',
    name: 'instances-hub',
    component: () => import('@/modules/instances/pages/InstancesModule.vue'),
  },
  {
    path: 'instances/instance-template/:map?',
    name: 'instances-template',
    component: () => import('@/modules/instances/pages/InstanceWorkspace.vue'),
  },
  {
    // Composite key: both params, or mapId = 'new', or none.
    path: 'instances/access-requirement/:mapId?/:difficulty?',
    name: 'instances-access-requirement',
    component: () => import('@/modules/instances/pages/AccessRequirementWorkspace.vue'),
  },
]

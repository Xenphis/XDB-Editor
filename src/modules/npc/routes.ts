import type { RouteRecordRaw } from 'vue-router'

export const npcRoutes: RouteRecordRaw[] = [
  {
    // The section lands straight on its default table; the others are reached
    // from the switch above the list (`NpcTableSwitch`).
    path: 'npc',
    redirect: '/npc/creature-template',
  },
  {
    // Single workspace route: no param = list only, 'new' = create mode,
    // otherwise the entry to edit. The component is reused across param
    // changes (list/tabs state survives, dirtyCache handles form state).
    path: 'npc/creature-template/:entry?',
    name: 'npc-creature-template',
    component: () => import('@/modules/npc/pages/CreatureTemplateWorkspace.vue'),
  },
  {
    // The formation is keyed by its leader spawn GUID; there is no 'new' mode,
    // creating one starts by picking an existing spawn as leader.
    path: 'npc/formation/:leaderGuid?',
    name: 'npc-formation',
    component: () => import('@/modules/npc/pages/FormationWorkspace.vue'),
  },
  {
    path: 'npc/trainer/:id?',
    name: 'npc-trainer',
    component: () => import('@/modules/npc/pages/TrainerWorkspace.vue'),
  },
  {
    // Keyed by the vendor's creature_template entry. Like the formation, there
    // is no 'new' mode: a vendor exists as soon as it owns one npc_vendor row,
    // so creating one starts by picking the creature that will sell.
    path: 'npc/vendor/:entry?',
    name: 'npc-vendor',
    component: () => import('@/modules/npc/pages/VendorWorkspace.vue'),
  },
]
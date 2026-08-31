import type { SaiParamDef } from './sai'

// Curated target_param1..3 definitions per target type, faithful to the
// comments in TrinityCore 3.3.5 SmartScriptMgr.h. SMART_TARGET_POSITION (8)
// additionally uses target_x/y/z/o, handled separately by the editor.

const hostileParams: SaiParamDef[] = [
  { key: 'target_param1', label: 'Max dist', tooltip: '0 = no distance limit' },
  { key: 'target_param2', label: 'Player only', kind: 'bool' },
  { key: 'target_param3', label: 'Power type + 1', tooltip: '0 = ignore power; otherwise PowerType + 1' },
]

export const SAI_TARGET_PARAMS: Record<number, SaiParamDef[]> = {
  0: [], // NONE
  1: [], // SELF
  2: [], // VICTIM
  3: hostileParams, // HOSTILE_SECOND_AGGRO
  4: hostileParams, // HOSTILE_LAST_AGGRO
  5: hostileParams, // HOSTILE_RANDOM
  6: hostileParams, // HOSTILE_RANDOM_NOT_TOP
  7: [], // ACTION_INVOKER
  8: [], // POSITION — uses target_x/y/z/o
  9: [ // CREATURE_RANGE
    { key: 'target_param1', label: 'Creature entry', ref: 'creature', tooltip: '0 = any creature' },
    { key: 'target_param2', label: 'Min dist' },
    { key: 'target_param3', label: 'Max dist' },
  ],
  10: [ // CREATURE_GUID
    { key: 'target_param1', label: 'GUID' },
    { key: 'target_param2', label: 'Creature entry', ref: 'creature' },
  ],
  11: [ // CREATURE_DISTANCE
    { key: 'target_param1', label: 'Creature entry', ref: 'creature', tooltip: '0 = any creature' },
    { key: 'target_param2', label: 'Max dist' },
  ],
  12: [ // STORED
    { key: 'target_param1', label: 'Variable ID', tooltip: 'List stored by STORE_TARGET_LIST' },
  ],
  13: [ // GAMEOBJECT_RANGE
    { key: 'target_param1', label: 'GameObject entry', ref: 'gameobject', tooltip: '0 = any gameobject' },
    { key: 'target_param2', label: 'Min dist' },
    { key: 'target_param3', label: 'Max dist' },
  ],
  14: [ // GAMEOBJECT_GUID
    { key: 'target_param1', label: 'GUID' },
    { key: 'target_param2', label: 'GameObject entry', ref: 'gameobject' },
  ],
  15: [ // GAMEOBJECT_DISTANCE
    { key: 'target_param1', label: 'GameObject entry', ref: 'gameobject', tooltip: '0 = any gameobject' },
    { key: 'target_param2', label: 'Max dist' },
  ],
  16: [], // INVOKER_PARTY
  17: [ // PLAYER_RANGE
    { key: 'target_param1', label: 'Min dist' },
    { key: 'target_param2', label: 'Max dist' },
  ],
  18: [ // PLAYER_DISTANCE
    { key: 'target_param1', label: 'Max dist' },
  ],
  19: [ // CLOSEST_CREATURE
    { key: 'target_param1', label: 'Creature entry', ref: 'creature', tooltip: '0 = any creature' },
    { key: 'target_param2', label: 'Max dist' },
    { key: 'target_param3', label: 'Dead', kind: 'bool', tooltip: 'On = find dead creatures' },
  ],
  20: [ // CLOSEST_GAMEOBJECT
    { key: 'target_param1', label: 'GameObject entry', ref: 'gameobject', tooltip: '0 = any gameobject' },
    { key: 'target_param2', label: 'Max dist' },
  ],
  21: [ // CLOSEST_PLAYER
    { key: 'target_param1', label: 'Max dist' },
  ],
  22: [], // ACTION_INVOKER_VEHICLE
  23: [ // OWNER_OR_SUMMONER
    { key: 'target_param1', label: 'Owner of owner', kind: 'bool', tooltip: 'On = use the owner/charmer of the owner' },
  ],
  24: [ // THREAT_LIST
    { key: 'target_param1', label: 'Max dist', tooltip: '0 = no distance limit' },
  ],
  25: [ // CLOSEST_ENEMY
    { key: 'target_param1', label: 'Max dist' },
    { key: 'target_param2', label: 'Player only', kind: 'bool' },
  ],
  26: [ // CLOSEST_FRIENDLY
    { key: 'target_param1', label: 'Max dist' },
    { key: 'target_param2', label: 'Player only', kind: 'bool' },
  ],
  27: [], // LOOT_RECIPIENTS
  28: [ // FARTHEST
    { key: 'target_param1', label: 'Max dist' },
    { key: 'target_param2', label: 'Player only', kind: 'bool' },
    { key: 'target_param3', label: 'In line of sight', kind: 'bool' },
  ],
  29: [ // VEHICLE_PASSENGER
    { key: 'target_param1', label: 'Seat mask', tooltip: '0 = all seats' },
  ],
  30: [ // CLOSEST_UNSPAWNED_GAMEOBJECT
    { key: 'target_param1', label: 'GameObject entry', ref: 'gameobject', tooltip: '0 = any gameobject' },
    { key: 'target_param2', label: 'Max dist' },
  ],
}

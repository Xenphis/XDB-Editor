import type { SaiParamDef } from './sai'
import { sai_alive_state_options } from './sai-defines'

// Curated target_param1..4 definitions per target type, faithful to the
// comments in AzerothCore's SmartScriptMgr.h (a fork of TrinityCore 3.3.5's
// SmartAI — AC adds a 4th target param and its own target ids in the 200+
// range). SMART_TARGET_POSITION (8) additionally uses target_x/y/z/o,
// handled separately by the editor.

const hostileParams: SaiParamDef[] = [
  { key: 'target_param1', label: 'Max dist', tooltip: '0 = no distance limit' },
  { key: 'target_param2', label: 'Player only', kind: 'bool' },
  { key: 'target_param3', label: 'Power type + 1', tooltip: '0 = ignore power; otherwise PowerType + 1' },
  { key: 'target_param4', label: 'Missing aura', ref: 'spell', tooltip: 'Only pick targets missing this aura' },
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
    { key: 'target_param4', label: 'Alive', kind: 'enum', options: sai_alive_state_options, i18nNamespace: 'sai_enums.sai_alive_state_options' },
  ],
  10: [ // CREATURE_GUID
    { key: 'target_param1', label: 'GUID' },
    { key: 'target_param2', label: 'Creature entry', ref: 'creature' },
  ],
  11: [ // CREATURE_DISTANCE
    { key: 'target_param1', label: 'Creature entry', ref: 'creature', tooltip: '0 = any creature' },
    { key: 'target_param2', label: 'Max dist' },
    { key: 'target_param3', label: 'Alive', kind: 'enum', options: sai_alive_state_options, i18nNamespace: 'sai_enums.sai_alive_state_options' },
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
  16: [ // INVOKER_PARTY
    { key: 'target_param1', label: 'Include pets', kind: 'bool' },
  ],
  17: [ // PLAYER_RANGE
    { key: 'target_param1', label: 'Min dist' },
    { key: 'target_param2', label: 'Max dist' },
    { key: 'target_param3', label: 'Max count', tooltip: 'Set target.o to 1 to search for all in range when min/max fails' },
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
    { key: 'target_param2', label: 'Player only', kind: 'bool' },
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
    { key: 'target_param4', label: 'Min dist' },
  ],
  29: [ // VEHICLE_PASSENGER
    { key: 'target_param1', label: 'Seat number', tooltip: "A vehicle can target its own accessory" },
  ],
  // id 30 (CLOSEST_UNSPAWNED_GAMEOBJECT) doesn't exist in this AzerothCore fork.
  201: [ // PLAYER_WITH_AURA
    { key: 'target_param1', label: 'Spell ID', ref: 'spell' },
    { key: 'target_param2', label: 'Negate', kind: 'bool', tooltip: 'On = pick players missing the aura instead' },
    { key: 'target_param3', label: 'Max dist' },
    { key: 'target_param4', label: 'Min dist' },
  ],
  202: [ // RANDOM_POINT
    { key: 'target_param1', label: 'Range' },
    { key: 'target_param2', label: 'Amount', tooltip: 'For summoning creatures' },
    { key: 'target_param3', label: 'Self as middle', kind: 'bool', tooltip: 'Off = use target_x/y/z as the middle point' },
  ],
  203: [ // ROLE_SELECTION
    { key: 'target_param1', label: 'Range max' },
    { key: 'target_param2', label: 'Role mask', kind: 'flags', flags: [
      { value: 1, hex: '0x1', name: 'Tank' },
      { value: 2, hex: '0x2', name: 'Healer' },
      { value: 4, hex: '0x4', name: 'Damage' },
    ] },
  ],
  204: [ // SUMMONED_CREATURES
    { key: 'target_param1', label: 'Creature entry', ref: 'creature' },
  ],
  205: [ // INSTANCE_STORAGE
    { key: 'target_param1', label: 'Instance data index' },
    { key: 'target_param2', label: 'Type', kind: 'enum', options: [{ value: 1, name: 'Creature' }, { value: 2, name: 'GameObject' }] },
  ],
  206: [ // FORMATION
    { key: 'target_param1', label: 'Type', kind: 'enum', options: [{ value: 0, name: 'Members only' }, { value: 1, name: 'Leader only' }, { value: 2, name: 'All' }] },
    { key: 'target_param2', label: 'Creature entry', ref: 'creature', tooltip: '0 = any' },
    { key: 'target_param3', label: 'Exclude self', kind: 'bool' },
  ],
  207: [ // SHARED_OWNER_ENTITIES
    { key: 'target_param1', label: 'Type', kind: 'enum', options: [{ value: 1, name: 'Creature' }, { value: 2, name: 'GameObject' }] },
    { key: 'target_param2', label: 'Entry', tooltip: '0 = any' },
    { key: 'target_param3', label: 'Max dist', tooltip: '0 = visibility range' },
  ],
}

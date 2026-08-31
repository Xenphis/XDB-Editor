import type { SaiParamDef } from './sai'
import {
  sai_loot_state_options,
  sai_los_hostility_options,
  sai_movement_type_options,
  sai_respawn_condition_options,
  sai_spell_school_mask,
} from './sai-defines'

// Curated event_param1..4 definitions per event type, faithful to the comments
// in TrinityCore 3.3.5 SmartScriptMgr.h. Types without an entry (UNUSED /
// master-only / no params) fall back to generic fields in the UI.

const repeat = (offset: 1 | 2 | 3): SaiParamDef[] => [
  { key: `event_param${offset}` as SaiParamDef['key'], label: 'Repeat min', kind: 'ms' },
  { key: `event_param${offset + 1}` as SaiParamDef['key'], label: 'Repeat max', kind: 'ms' },
]

const cooldown = (offset: 1 | 2 | 3): SaiParamDef[] => [
  { key: `event_param${offset}` as SaiParamDef['key'], label: 'Cooldown min', kind: 'ms' },
  { key: `event_param${offset + 1}` as SaiParamDef['key'], label: 'Cooldown max', kind: 'ms' },
]

const updateTimers: SaiParamDef[] = [
  { key: 'event_param1', label: 'Initial min', kind: 'ms' },
  { key: 'event_param2', label: 'Initial max', kind: 'ms' },
  ...repeat(3),
]

const waypointParams: SaiParamDef[] = [
  { key: 'event_param1', label: 'Point ID', tooltip: '0 = any point' },
  { key: 'event_param2', label: 'Path ID', ref: 'waypoint', tooltip: '0 = any path' },
]

const spellWithCooldown: SaiParamDef[] = [
  { key: 'event_param1', label: 'Spell ID', ref: 'spell' },
  ...cooldown(2),
]

export const SAI_EVENT_PARAMS: Record<number, SaiParamDef[]> = {
  0: updateTimers, // UPDATE_IC
  1: updateTimers, // UPDATE_OOC
  2: [ // HEALTH_PCT
    { key: 'event_param1', label: 'HP min', kind: 'percent' },
    { key: 'event_param2', label: 'HP max', kind: 'percent' },
    ...repeat(3),
  ],
  3: [ // MANA_PCT
    { key: 'event_param1', label: 'Mana min', kind: 'percent' },
    { key: 'event_param2', label: 'Mana max', kind: 'percent' },
    ...repeat(3),
  ],
  4: [], // AGGRO
  5: [ // KILL
    ...cooldown(1),
    { key: 'event_param3', label: 'Player only', kind: 'bool' },
    { key: 'event_param4', label: 'Creature entry', ref: 'creature', tooltip: 'Only if "Player only" is off; 0 = any creature' },
  ],
  6: [], // DEATH
  7: [], // EVADE
  8: [ // SPELLHIT
    { key: 'event_param1', label: 'Spell ID', ref: 'spell', tooltip: '0 = any spell' },
    { key: 'event_param2', label: 'School mask', kind: 'flags', flags: sai_spell_school_mask, tooltip: '0 = any school' },
    ...cooldown(3),
  ],
  9: [ // RANGE
    { key: 'event_param1', label: 'Min dist' },
    { key: 'event_param2', label: 'Max dist' },
    ...repeat(3),
  ],
  10: [ // OOC_LOS
    { key: 'event_param1', label: 'Hostility mode', kind: 'enum', options: sai_los_hostility_options },
    { key: 'event_param2', label: 'Max range' },
    ...cooldown(3),
  ],
  11: [ // RESPAWN
    { key: 'event_param1', label: 'Condition', kind: 'enum', options: sai_respawn_condition_options },
    { key: 'event_param2', label: 'Map ID', ref: 'map' },
    { key: 'event_param3', label: 'Zone ID', ref: 'zone' },
  ],
  13: [ // VICTIM_CASTING
    ...repeat(1),
    { key: 'event_param3', label: 'Spell ID', ref: 'spell', tooltip: '0 = any spell' },
  ],
  15: [ // FRIENDLY_IS_CC
    { key: 'event_param1', label: 'Radius' },
    ...repeat(2),
  ],
  16: [ // FRIENDLY_MISSING_BUFF
    { key: 'event_param1', label: 'Spell ID', ref: 'spell' },
    { key: 'event_param2', label: 'Radius' },
    ...repeat(3),
  ],
  17: [ // SUMMONED_UNIT
    { key: 'event_param1', label: 'Creature entry', ref: 'creature', tooltip: '0 = any summon' },
    ...cooldown(2),
  ],
  19: [ // ACCEPTED_QUEST
    { key: 'event_param1', label: 'Quest ID', ref: 'quest', tooltip: '0 = any quest' },
    ...cooldown(2),
  ],
  20: [ // REWARD_QUEST
    { key: 'event_param1', label: 'Quest ID', ref: 'quest', tooltip: '0 = any quest' },
    ...cooldown(2),
  ],
  21: [], // REACHED_HOME
  22: [ // RECEIVE_EMOTE
    { key: 'event_param1', label: 'Emote ID', ref: 'emote', tooltip: 'Text emote received from a player' },
    ...cooldown(2),
  ],
  23: [ // HAS_AURA
    { key: 'event_param1', label: 'Spell ID', ref: 'spell' },
    { key: 'event_param2', label: 'Stack amount' },
    ...repeat(3),
  ],
  24: [ // TARGET_BUFFED
    { key: 'event_param1', label: 'Spell ID', ref: 'spell' },
    { key: 'event_param2', label: 'Stack amount' },
    ...repeat(3),
  ],
  25: [], // RESET
  26: [ // IC_LOS
    { key: 'event_param1', label: 'Hostility mode', kind: 'enum', options: sai_los_hostility_options },
    { key: 'event_param2', label: 'Max range' },
    ...cooldown(3),
  ],
  27: cooldown(1), // PASSENGER_BOARDED
  28: cooldown(1), // PASSENGER_REMOVED
  29: [ // CHARMED
    { key: 'event_param1', label: 'On remove', kind: 'bool', tooltip: 'Off = triggers on charm apply, on = triggers on charm remove' },
  ],
  31: [ // SPELLHIT_TARGET
    { key: 'event_param1', label: 'Spell ID', ref: 'spell', tooltip: '0 = any spell' },
    { key: 'event_param2', label: 'School mask', kind: 'flags', flags: sai_spell_school_mask, tooltip: '0 = any school' },
    ...cooldown(3),
  ],
  32: [ // DAMAGED
    { key: 'event_param1', label: 'Min damage' },
    { key: 'event_param2', label: 'Max damage' },
    ...cooldown(3),
  ],
  33: [ // DAMAGED_TARGET
    { key: 'event_param1', label: 'Min damage' },
    { key: 'event_param2', label: 'Max damage' },
    ...cooldown(3),
  ],
  34: [ // MOVEMENTINFORM
    { key: 'event_param1', label: 'Movement type', kind: 'enum', options: sai_movement_type_options, tooltip: '0 = any movement type' },
    { key: 'event_param2', label: 'Point ID' },
  ],
  35: [ // SUMMON_DESPAWNED
    { key: 'event_param1', label: 'Creature entry', ref: 'creature' },
    ...cooldown(2),
  ],
  36: [], // CORPSE_REMOVED
  37: [], // AI_INIT
  38: [ // DATA_SET
    { key: 'event_param1', label: 'Data ID' },
    { key: 'event_param2', label: 'Value' },
    ...cooldown(3),
  ],
  40: waypointParams, // WAYPOINT_REACHED
  41: [], // TRANSPORT_ADDPLAYER
  42: [ // TRANSPORT_ADDCREATURE
    { key: 'event_param1', label: 'Creature entry', ref: 'creature', tooltip: '0 = any creature' },
  ],
  43: [], // TRANSPORT_REMOVE_PLAYER
  44: [ // TRANSPORT_RELOCATE
    { key: 'event_param1', label: 'Point ID' },
  ],
  45: [ // INSTANCE_PLAYER_ENTER
    {
      key: 'event_param1',
      label: 'Team',
      kind: 'enum',
      options: [
        { value: 0, name: 'Any' },
        { value: 469, name: 'Alliance' },
        { value: 67, name: 'Horde' },
      ],
    },
    ...cooldown(2),
  ],
  46: [ // AREATRIGGER_ONTRIGGER
    { key: 'event_param1', label: 'Trigger ID', ref: 'areatrigger', tooltip: '0 = any areatrigger' },
  ],
  47: [], // QUEST_ACCEPTED
  48: [], // QUEST_OBJ_COMPLETION
  49: [], // QUEST_COMPLETION
  50: [], // QUEST_REWARDED
  51: [], // QUEST_FAIL
  52: [ // TEXT_OVER
    { key: 'event_param1', label: 'Text group', ref: 'creature_text' },
    { key: 'event_param2', label: 'Creature entry', ref: 'creature', tooltip: 'Creature who talks; 0 = any' },
  ],
  53: [ // RECEIVE_HEAL
    { key: 'event_param1', label: 'Min heal' },
    { key: 'event_param2', label: 'Max heal' },
    ...cooldown(3),
  ],
  54: [], // JUST_SUMMONED
  55: waypointParams, // WAYPOINT_PAUSED
  56: waypointParams, // WAYPOINT_RESUMED
  57: waypointParams, // WAYPOINT_STOPPED
  58: waypointParams, // WAYPOINT_ENDED
  59: [ // TIMED_EVENT_TRIGGERED
    { key: 'event_param1', label: 'Event ID', tooltip: 'ID used by CREATE_TIMED_EVENT / TRIGGER_TIMED_EVENT' },
  ],
  60: updateTimers, // UPDATE
  61: [], // LINK — internal, no params
  62: [ // GOSSIP_SELECT
    { key: 'event_param1', label: 'Menu ID', ref: 'gossip_menu' },
    { key: 'event_param2', label: 'Option ID' },
  ],
  63: [], // JUST_CREATED
  64: [ // GOSSIP_HELLO
    { key: 'event_param1', label: 'No report use', kind: 'bool', tooltip: 'GameObjects only: on = do not report the use to scripts' },
  ],
  65: [], // FOLLOW_COMPLETED
  68: [ // GAME_EVENT_START
    { key: 'event_param1', label: 'Game event entry', ref: 'game_event' },
  ],
  69: [ // GAME_EVENT_END
    { key: 'event_param1', label: 'Game event entry', ref: 'game_event' },
  ],
  70: [ // GO_LOOT_STATE_CHANGED
    { key: 'event_param1', label: 'Loot state', kind: 'enum', options: sai_loot_state_options },
  ],
  71: [ // GO_EVENT_INFORM
    { key: 'event_param1', label: 'Event ID' },
  ],
  72: [ // ACTION_DONE
    { key: 'event_param1', label: 'Event ID', tooltip: 'SharedDefines.EventId' },
  ],
  73: [], // ON_SPELLCLICK — clicker becomes the action invoker
  74: [ // FRIENDLY_HEALTH_PCT
    { key: 'event_param1', label: 'HP min', kind: 'percent' },
    { key: 'event_param2', label: 'HP max', kind: 'percent' },
    ...repeat(3),
  ],
  75: [ // DISTANCE_CREATURE
    { key: 'event_param1', label: 'GUID', tooltip: '0 = any GUID (use entry instead)' },
    { key: 'event_param2', label: 'Creature entry', ref: 'creature', tooltip: '0 = any entry (use GUID instead)' },
    { key: 'event_param3', label: 'Distance' },
    { key: 'event_param4', label: 'Repeat interval', kind: 'ms' },
  ],
  76: [ // DISTANCE_GAMEOBJECT
    { key: 'event_param1', label: 'GUID', tooltip: '0 = any GUID (use entry instead)' },
    { key: 'event_param2', label: 'GameObject entry', ref: 'gameobject', tooltip: '0 = any entry (use GUID instead)' },
    { key: 'event_param3', label: 'Distance' },
    { key: 'event_param4', label: 'Repeat interval', kind: 'ms' },
  ],
  77: [ // COUNTER_SET
    { key: 'event_param1', label: 'Counter ID' },
    { key: 'event_param2', label: 'Value' },
    ...cooldown(3),
  ],
  82: [ // SUMMONED_UNIT_DIES
    { key: 'event_param1', label: 'Creature entry', ref: 'creature', tooltip: '0 = any summon' },
    ...cooldown(2),
  ],
  83: spellWithCooldown, // ON_SPELL_CAST
  84: spellWithCooldown, // ON_SPELL_FAILED
  85: spellWithCooldown, // ON_SPELL_START
  86: [], // ON_DESPAWN
  89: spellWithCooldown, // ON_AURA_APPLIED
  90: spellWithCooldown, // ON_AURA_REMOVED
}

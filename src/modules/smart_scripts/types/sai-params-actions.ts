import { npc_flags } from '@/modules/npc/types/defines'
import type { SaiParamDef } from './sai'
import {
  sai_cast_flags,
  sai_credit_type_options,
  sai_field_type_options,
  sai_go_state_options,
  sai_loot_state_options,
  sai_movement_type_options,
  sai_power_type_options,
  sai_react_state_options,
  sai_sheath_options,
  sai_summon_type_options,
  sai_timer_update_options,
} from './sai-defines'

// Curated action_param1..6 definitions per action type, faithful to the
// comments in AzerothCore's SmartScriptMgr.h (a fork of TrinityCore 3.3.5's
// SmartAI — several ids are renamed or repurposed, e.g. id 46 is MOVE_FORWARD
// here, not TC's ATTACK_STOP, and AC adds its own action ids in the 200+
// range). Types without an entry (UNUSED / master-only / no params) fall back
// to generic fields in the UI.

const key = (n: 1 | 2 | 3 | 4 | 5 | 6): SaiParamDef['key'] => `action_param${n}` as SaiParamDef['key']

const npcFlagParam: SaiParamDef[] = [
  { key: 'action_param1', label: 'NPC flags', kind: 'flags', flags: npc_flags, i18nNamespace: 'creature_enums.npc_flags' },
]

const powerParams = (valueLabel: string): SaiParamDef[] => [
  { key: 'action_param1', label: 'Power type', kind: 'enum', options: sai_power_type_options, i18nNamespace: 'sai_enums.sai_power_type_options' },
  { key: 'action_param2', label: valueLabel },
]

export const SAI_ACTION_PARAMS: Record<number, SaiParamDef[]> = {
  0: [], // NONE
  1: [ // TALK
    { key: 'action_param1', label: 'Text group', ref: 'creature_text' },
    { key: 'action_param2', label: 'Duration before TEXT_OVER', kind: 'ms' },
    { key: 'action_param3', label: 'Use talk target', kind: 'bool', tooltip: 'Use the SAI target as the talk target' },
  ],
  2: [ // SET_FACTION
    { key: 'action_param1', label: 'Faction ID', ref: 'faction', tooltip: '0 = restore default faction' },
  ],
  3: [ // MORPH_TO_ENTRY_OR_MODEL
    { key: 'action_param1', label: 'Creature entry', ref: 'creature', tooltip: 'Morph to this template’s model (or use Model ID)' },
    { key: 'action_param2', label: 'Model ID', ref: 'model', tooltip: 'Both at 0 = demorph' },
  ],
  4: [ // SOUND
    { key: 'action_param1', label: 'Sound ID', ref: 'sound' },
    { key: 'action_param2', label: 'Only self', kind: 'bool' },
    { key: 'action_param3', label: 'Distance' },
  ],
  5: [ // PLAY_EMOTE
    { key: 'action_param1', label: 'Emote ID', ref: 'emote' },
  ],
  6: [ // FAIL_QUEST
    { key: 'action_param1', label: 'Quest ID', ref: 'quest' },
  ],
  7: [ // OFFER_QUEST
    { key: 'action_param1', label: 'Quest ID', ref: 'quest' },
    { key: 'action_param2', label: 'Direct add', kind: 'bool', tooltip: 'Add the quest directly instead of offering it' },
  ],
  8: [ // SET_REACT_STATE
    { key: 'action_param1', label: 'React state', kind: 'enum', options: sai_react_state_options, i18nNamespace: 'sai_enums.sai_react_state_options' },
  ],
  9: [], // ACTIVATE_GOBJECT
  10: [1, 2, 3, 4, 5, 6].map(n => (
    { key: key(n as 1), label: `Emote ID ${n}`, ref: 'emote' as const, tooltip: '0 = unused slot' }
  )), // RANDOM_EMOTE
  11: [ // CAST
    { key: 'action_param1', label: 'Spell ID', ref: 'spell' },
    { key: 'action_param2', label: 'Cast flags', kind: 'flags', flags: sai_cast_flags, i18nNamespace: 'sai_enums.sai_cast_flags' },
    { key: 'action_param3', label: 'Triggered flags', tooltip: 'TriggerCastFlags mask, only if cast flags has TRIGGERED' },
    { key: 'action_param4', label: 'Targets limit', tooltip: '0 = no limit' },
  ],
  12: [ // SUMMON_CREATURE
    { key: 'action_param1', label: 'Creature entry', ref: 'creature' },
    { key: 'action_param2', label: 'Summon type', kind: 'enum', options: sai_summon_type_options, i18nNamespace: 'sai_enums.sai_summon_type_options' },
    { key: 'action_param3', label: 'Duration', kind: 'ms' },
    { key: 'action_param4', label: 'Attack invoker', kind: 'bool' },
    { key: 'action_param5', label: 'Attack script owner', kind: 'bool' },
    { key: 'action_param6', label: 'Summon flags', tooltip: 'SmartActionSummonCreatureFlags mask' },
  ],
  13: [ // THREAT_SINGLE_PCT
    { key: 'action_param1', label: 'Threat', kind: 'percent' },
  ],
  14: [ // THREAT_ALL_PCT
    { key: 'action_param1', label: 'Threat', kind: 'percent' },
  ],
  15: [ // CALL_AREAEXPLOREDOREVENTHAPPENS
    { key: 'action_param1', label: 'Quest ID', ref: 'quest' },
  ],
  17: [ // SET_EMOTE_STATE
    { key: 'action_param1', label: 'Emote ID', ref: 'emote' },
  ],
  20: [ // AUTO_ATTACK
    { key: 'action_param1', label: 'Allow attack', kind: 'bool' },
  ],
  21: [ // ALLOW_COMBAT_MOVEMENT
    { key: 'action_param1', label: 'Allow movement', kind: 'bool' },
  ],
  22: [ // SET_EVENT_PHASE
    { key: 'action_param1', label: 'Phase', tooltip: '0-12; 0 = always-on phase' },
  ],
  23: [ // INC_EVENT_PHASE
    { key: 'action_param1', label: 'Increment', kind: 'int', tooltip: 'Negative to decrement, must not be 0' },
  ],
  24: [], // EVADE — no params in this fork
  25: [ // FLEE_FOR_ASSIST
    { key: 'action_param1', label: 'With emote', kind: 'bool' },
  ],
  26: [ // CALL_GROUPEVENTHAPPENS
    { key: 'action_param1', label: 'Quest ID', ref: 'quest' },
  ],
  27: [], // COMBAT_STOP
  28: [ // REMOVEAURASFROMSPELL
    { key: 'action_param1', label: 'Spell ID', ref: 'spell', tooltip: '0 = remove all auras' },
    { key: 'action_param2', label: 'Charges', tooltip: '0 = remove the aura entirely' },
  ],
  29: [ // FOLLOW
    { key: 'action_param1', label: 'Distance', tooltip: '0 = default' },
    { key: 'action_param2', label: 'Angle', tooltip: '0 = default' },
    { key: 'action_param3', label: 'End creature entry', ref: 'creature' },
    { key: 'action_param4', label: 'Credit' },
    {
      key: 'action_param5',
      label: 'Credit type',
      kind: 'enum',
      options: sai_credit_type_options,
      i18nNamespace: 'sai_enums.sai_credit_type_options',
    },
    { key: 'action_param6', label: 'Alive state', kind: 'bool', tooltip: 'Off = creature must be alive, on = a dead creature can trigger arrival' },
  ],
  30: [1, 2, 3, 4, 5, 6].map(n => (
    { key: key(n as 1), label: `Phase ${n}`, tooltip: '0 = unused slot' }
  )), // RANDOM_PHASE
  31: [ // RANDOM_PHASE_RANGE
    { key: 'action_param1', label: 'Phase min' },
    { key: 'action_param2', label: 'Phase max' },
  ],
  32: [], // RESET_GOBJECT
  33: [ // CALL_KILLEDMONSTER
    { key: 'action_param1', label: 'Creature entry', ref: 'creature' },
  ],
  34: [ // SET_INST_DATA
    { key: 'action_param1', label: 'Field' },
    { key: 'action_param2', label: 'Data' },
  ],
  35: [ // SET_INST_DATA64
    { key: 'action_param1', label: 'Field', tooltip: 'Data is the SAI target’s GUID' },
  ],
  36: [ // UPDATE_TEMPLATE
    { key: 'action_param1', label: 'Creature entry', ref: 'creature' },
    { key: 'action_param2', label: 'Update level', kind: 'bool' },
  ],
  37: [ // DIE
    { key: 'action_param1', label: 'Delay', kind: 'ms' },
  ],
  38: [ // SET_IN_COMBAT_WITH_ZONE
    { key: 'action_param1', label: 'Range', tooltip: 'Only applied if outside of a dungeon' },
  ],
  39: [ // CALL_FOR_HELP
    { key: 'action_param1', label: 'Radius' },
    { key: 'action_param2', label: 'With emote', kind: 'bool' },
  ],
  40: [ // SET_SHEATH
    { key: 'action_param1', label: 'Sheath state', kind: 'enum', options: sai_sheath_options, i18nNamespace: 'sai_enums.sai_sheath_options' },
  ],
  41: [ // FORCE_DESPAWN
    { key: 'action_param1', label: 'Despawn timer', kind: 'ms' },
  ],
  42: [ // SET_INVINCIBILITY_HP_LEVEL
    { key: 'action_param1', label: 'Min HP', kind: 'int', tooltip: 'Positive = percent, negative = flat value' },
  ],
  43: [ // MOUNT_TO_ENTRY_OR_MODEL
    { key: 'action_param1', label: 'Creature entry', ref: 'creature', tooltip: 'Mount this template’s model (or use Model ID)' },
    { key: 'action_param2', label: 'Model ID', ref: 'model', tooltip: 'Both at 0 = dismount' },
  ],
  44: [ // SET_INGAME_PHASE_MASK
    { key: 'action_param1', label: 'Phase mask' },
  ],
  45: [ // SET_DATA
    { key: 'action_param1', label: 'Field' },
    { key: 'action_param2', label: 'Data' },
  ],
  46: [ // MOVE_FORWARD
    { key: 'action_param1', label: 'Distance' },
  ],
  47: [ // SET_VISIBILITY
    { key: 'action_param1', label: 'Visible', kind: 'bool' },
  ],
  48: [ // SET_ACTIVE
    { key: 'action_param1', label: 'Active', kind: 'bool' },
  ],
  49: [], // ATTACK_START
  50: [ // SUMMON_GO
    { key: 'action_param1', label: 'GameObject entry', ref: 'gameobject' },
    { key: 'action_param2', label: 'Despawn time' },
    { key: 'action_param3', label: 'Target summon', kind: 'bool' },
    { key: 'action_param4', label: 'Summon type', kind: 'bool', tooltip: 'Off = despawn after time, on = despawn when the summoner dies' },
  ],
  51: [], // KILL_UNIT
  52: [ // ACTIVATE_TAXI
    { key: 'action_param1', label: 'Taxi path ID', ref: 'taxi' },
  ],
  53: [ // ESCORT_START
    { key: 'action_param1', label: 'Run', kind: 'bool', tooltip: 'Off = walk, on = run' },
    { key: 'action_param2', label: 'Path ID', ref: 'waypoint' },
    { key: 'action_param3', label: 'Can repeat', kind: 'bool' },
    { key: 'action_param4', label: 'Quest ID', ref: 'quest' },
    { key: 'action_param5', label: 'Despawn time', kind: 'ms' },
    { key: 'action_param6', label: 'React state', kind: 'enum', options: sai_react_state_options, i18nNamespace: 'sai_enums.sai_react_state_options' },
  ],
  54: [ // ESCORT_PAUSE
    { key: 'action_param1', label: 'Pause time', kind: 'ms' },
  ],
  55: [ // ESCORT_STOP
    { key: 'action_param1', label: 'Despawn time', kind: 'ms' },
    { key: 'action_param2', label: 'Quest ID', ref: 'quest' },
    { key: 'action_param3', label: 'Fail quest', kind: 'bool' },
  ],
  56: [ // ADD_ITEM
    { key: 'action_param1', label: 'Item ID', ref: 'item' },
    { key: 'action_param2', label: 'Count' },
  ],
  57: [ // REMOVE_ITEM
    { key: 'action_param1', label: 'Item ID', ref: 'item' },
    { key: 'action_param2', label: 'Count' },
  ],
  59: [ // SET_RUN
    { key: 'action_param1', label: 'Run', kind: 'bool' },
  ],
  60: [ // SET_FLY
    { key: 'action_param1', label: 'Fly', kind: 'bool' },
  ],
  62: [ // TELEPORT
    { key: 'action_param1', label: 'Map ID', ref: 'map', tooltip: 'Destination position comes from target_x/y/z/o' },
  ],
  63: [ // SET_COUNTER
    { key: 'action_param1', label: 'Counter ID' },
    { key: 'action_param2', label: 'Value' },
    { key: 'action_param3', label: 'Reset', kind: 'bool' },
  ],
  64: [ // STORE_TARGET_LIST
    { key: 'action_param1', label: 'Variable ID' },
  ],
  65: [], // ESCORT_RESUME
  66: [ // SET_ORIENTATION
    { key: 'action_param1', label: 'Random orientation', kind: 'bool', tooltip: 'Off = quick change to target_o / the SAI target, on = a random orientation' },
    { key: 'action_param2', label: 'Turn angle' },
  ],
  67: [ // CREATE_TIMED_EVENT
    { key: 'action_param1', label: 'Event ID' },
    { key: 'action_param2', label: 'Initial min', kind: 'ms' },
    { key: 'action_param3', label: 'Initial max', kind: 'ms' },
    { key: 'action_param4', label: 'Repeat min', kind: 'ms', tooltip: 'Only if it repeats' },
    { key: 'action_param5', label: 'Repeat max', kind: 'ms', tooltip: 'Only if it repeats' },
    { key: 'action_param6', label: 'Chance', kind: 'percent' },
  ],
  68: [ // PLAYMOVIE
    { key: 'action_param1', label: 'Movie entry', ref: 'movie' },
  ],
  69: [ // MOVE_TO_POS
    { key: 'action_param1', label: 'Point ID', tooltip: 'Optional x/y/z offset from target_x/y/z' },
    { key: 'action_param2', label: 'Transport', kind: 'bool' },
    { key: 'action_param3', label: 'Controlled', kind: 'bool' },
    { key: 'action_param4', label: 'Contact distance' },
  ],
  70: [ // RESPAWN_TARGET
    { key: 'action_param1', label: 'Force', kind: 'bool' },
    { key: 'action_param2', label: 'GO respawn time' },
  ],
  71: [ // EQUIP
    { key: 'action_param1', label: 'Equipment entry', ref: 'equipment', tooltip: 'creature_equip_template entry; 0 = use the slot params instead' },
    { key: 'action_param2', label: 'Slot mask', tooltip: 'Bits 1/2/4 select which slots are sent; 0 = all (mask 7)' },
    { key: 'action_param3', label: 'Slot 1 item', ref: 'item' },
    { key: 'action_param4', label: 'Slot 2 item', ref: 'item' },
    { key: 'action_param5', label: 'Slot 3 item', ref: 'item' },
  ],
  72: [], // CLOSE_GOSSIP
  73: [ // TRIGGER_TIMED_EVENT
    { key: 'action_param1', label: 'Event ID', tooltip: 'Must be > 1' },
  ],
  74: [ // REMOVE_TIMED_EVENT
    { key: 'action_param1', label: 'Event ID', tooltip: 'Must be > 1' },
  ],
  78: [], // CALL_SCRIPT_RESET
  79: [ // SET_RANGED_MOVEMENT
    { key: 'action_param1', label: 'Distance' },
    { key: 'action_param2', label: 'Angle' },
  ],
  80: [ // CALL_TIMED_ACTIONLIST
    { key: 'action_param1', label: 'Actionlist ID', ref: 'actionlist', tooltip: 'Overwrites an already running actionlist' },
    { key: 'action_param2', label: 'Stop after combat', kind: 'bool' },
    { key: 'action_param3', label: 'Timer update type', kind: 'enum', options: sai_timer_update_options, i18nNamespace: 'sai_enums.sai_timer_update_options' },
  ],
  81: npcFlagParam, // SET_NPC_FLAG
  82: npcFlagParam, // ADD_NPC_FLAG
  83: npcFlagParam, // REMOVE_NPC_FLAG
  84: [ // SIMPLE_TALK
    { key: 'action_param1', label: 'Text group', ref: 'creature_text', tooltip: 'Target units say the text; no TEXT_OVER event, no whisper' },
  ],
  85: [ // SELF_CAST
    { key: 'action_param1', label: 'Spell ID', ref: 'spell' },
    { key: 'action_param2', label: 'Cast flags', kind: 'flags', flags: sai_cast_flags, i18nNamespace: 'sai_enums.sai_cast_flags' },
    { key: 'action_param3', label: 'Triggered flags', tooltip: 'TriggerCastFlags mask, only if cast flags has TRIGGERED' },
    { key: 'action_param4', label: 'Targets limit', tooltip: '0 = no limit' },
  ],
  86: [ // CROSS_CAST
    { key: 'action_param1', label: 'Spell ID', ref: 'spell' },
    { key: 'action_param2', label: 'Cast flags', kind: 'flags', flags: sai_cast_flags, i18nNamespace: 'sai_enums.sai_cast_flags' },
    { key: 'action_param3', label: 'Caster target type', tooltip: 'SMART_TARGET_* id; casters cast the spell on the SAI target' },
    { key: 'action_param4', label: 'Caster target param 1' },
    { key: 'action_param5', label: 'Caster target param 2' },
    { key: 'action_param6', label: 'Caster target param 3' },
  ],
  87: [1, 2, 3, 4, 5, 6].map(n => (
    { key: key(n as 1), label: `Actionlist ID ${n}`, ref: 'actionlist' as const, tooltip: '0 = unused slot' }
  )), // CALL_RANDOM_TIMED_ACTIONLIST
  88: [ // CALL_RANDOM_RANGE_TIMED_ACTIONLIST
    { key: 'action_param1', label: 'Actionlist ID min', ref: 'actionlist' },
    { key: 'action_param2', label: 'Actionlist ID max', ref: 'actionlist' },
  ],
  89: [ // RANDOM_MOVE
    { key: 'action_param1', label: 'Max distance' },
  ],
  90: [ // SET_UNIT_FIELD_BYTES_1
    { key: 'action_param1', label: 'Bytes value', tooltip: 'Stand state / vis flags / anim tier value' },
    {
      key: 'action_param2',
      label: 'Field type',
      kind: 'enum',
      options: sai_field_type_options,
      i18nNamespace: 'sai_enums.sai_field_type_options',
    },
  ],
  91: [ // REMOVE_UNIT_FIELD_BYTES_1
    { key: 'action_param1', label: 'Bytes value' },
    {
      key: 'action_param2',
      label: 'Field type',
      kind: 'enum',
      options: sai_field_type_options,
      i18nNamespace: 'sai_enums.sai_field_type_options',
    },
  ],
  92: [ // INTERRUPT_SPELL
    { key: 'action_param1', label: 'With delayed', kind: 'bool' },
    { key: 'action_param2', label: 'Spell ID', ref: 'spell', tooltip: '0 = any spell' },
    { key: 'action_param3', label: 'With instant', kind: 'bool' },
  ],
  97: [ // JUMP_TO_POS
    { key: 'action_param1', label: 'Speed XY' },
    { key: 'action_param2', label: 'Speed Z' },
    { key: 'action_param3', label: 'Self jump', kind: 'bool', tooltip: 'Off = jump to the SAI target position (target_x/y/z), on = jump in place' },
  ],
  98: [ // SEND_GOSSIP_MENU
    { key: 'action_param1', label: 'Menu ID', ref: 'gossip_menu' },
    { key: 'action_param2', label: 'NPC text ID' },
  ],
  99: [ // GO_SET_LOOT_STATE
    { key: 'action_param1', label: 'Loot state', kind: 'enum', options: sai_loot_state_options, i18nNamespace: 'sai_enums.sai_loot_state_options' },
  ],
  100: [ // SEND_TARGET_TO_TARGET
    { key: 'action_param1', label: 'Variable ID', tooltip: 'Stored target list ID to send' },
  ],
  101: [ // SET_HOME_POS
    { key: 'action_param1', label: 'Spawn position', kind: 'bool', tooltip: 'Off = use the SAI target position, on = use the creature respawn position' },
  ],
  102: [ // SET_HEALTH_REGEN
    { key: 'action_param1', label: 'Regenerate health', kind: 'bool' },
  ],
  103: [ // SET_ROOT
    { key: 'action_param1', label: 'Rooted', kind: 'bool' },
  ],
  107: [ // SUMMON_CREATURE_GROUP
    { key: 'action_param1', label: 'Summon group', ref: 'creature_group' },
    { key: 'action_param2', label: 'Attack invoker', kind: 'bool' },
    { key: 'action_param3', label: 'Attack script owner', kind: 'bool' },
  ],
  108: powerParams('New power'), // SET_POWER
  109: powerParams('Power to add'), // ADD_POWER
  110: powerParams('Power to remove'), // REMOVE_POWER
  111: [ // GAME_EVENT_STOP
    { key: 'action_param1', label: 'Game event ID', ref: 'game_event' },
  ],
  112: [ // GAME_EVENT_START
    { key: 'action_param1', label: 'Game event ID', ref: 'game_event' },
  ],
  113: [ // START_CLOSEST_WAYPOINT — header comment says wp1..wp7, but the
    // actual struct (SmartAction::startClosestWaypoint) only has these 5 fields
    { key: 'action_param1', label: 'Path ID 1', ref: 'waypoint', tooltip: '0 = unused slot' },
    { key: 'action_param2', label: 'Path ID 2', ref: 'waypoint', tooltip: '0 = unused slot' },
    { key: 'action_param3', label: 'Repeat', kind: 'bool' },
    { key: 'action_param4', label: 'Forced movement' },
    { key: 'action_param5', label: 'Path source' },
  ], // START_CLOSEST_WAYPOINT
  114: [], // MOVE_OFFSET — offset comes from target_x/y/z
  115: [ // RANDOM_SOUND — only 4 sound id slots in this fork (TC had 5)
    { key: 'action_param1', label: 'Sound ID 1', ref: 'sound' },
    { key: 'action_param2', label: 'Sound ID 2', ref: 'sound' },
    { key: 'action_param3', label: 'Sound ID 3', ref: 'sound' },
    { key: 'action_param4', label: 'Sound ID 4', ref: 'sound' },
    { key: 'action_param5', label: 'Only self', kind: 'bool' },
    { key: 'action_param6', label: 'Distance' },
  ],
  116: [ // SET_CORPSE_DELAY
    { key: 'action_param1', label: 'Corpse delay', kind: 'seconds' },
  ],
  117: [ // DISABLE_EVADE
    { key: 'action_param1', label: 'Disable evade', kind: 'bool' },
  ],
  118: [ // GO_SET_GO_STATE
    { key: 'action_param1', label: 'GO state', kind: 'enum', options: sai_go_state_options, i18nNamespace: 'sai_enums.sai_go_state_options' },
  ],
  123: [ // ADD_THREAT
    { key: 'action_param1', label: 'Threat to add', kind: 'int' },
    { key: 'action_param2', label: 'Threat to remove', kind: 'int' },
  ],
  124: [ // LOAD_EQUIPMENT
    { key: 'action_param1', label: 'Equipment ID', ref: 'equipment' },
  ],
  125: [ // TRIGGER_RANDOM_TIMED_EVENT
    { key: 'action_param1', label: 'Event ID min' },
    { key: 'action_param2', label: 'Event ID max' },
  ],
  127: [], // REMOVE_MOVEMENT — not supported yet in this fork (was TC's PAUSE_MOVEMENT; see 235 MOVEMENT_PAUSE)
  131: [ // SPAWN_SPAWNGROUP
    { key: 'action_param1', label: 'Group ID', ref: 'spawn_group' },
    { key: 'action_param2', label: 'Ignore respawn', kind: 'bool' },
    { key: 'action_param3', label: 'Force', kind: 'bool' },
  ],
  132: [ // DESPAWN_SPAWNGROUP
    { key: 'action_param1', label: 'Group ID', ref: 'spawn_group' },
    { key: 'action_param2', label: 'Delete respawn times', kind: 'bool' },
  ],
  133: [], // RESPAWN_BY_SPAWNID — not supported yet in this fork
  134: [ // INVOKER_CAST
    { key: 'action_param1', label: 'Spell ID', ref: 'spell' },
    { key: 'action_param2', label: 'Cast flags', kind: 'flags', flags: sai_cast_flags, i18nNamespace: 'sai_enums.sai_cast_flags' },
    { key: 'action_param3', label: 'Triggered flags', tooltip: 'TriggerCastFlags mask, only if cast flags has TRIGGERED' },
    { key: 'action_param4', label: 'Targets limit', tooltip: '0 = no limit' },
  ],
  135: [ // PLAY_CINEMATIC
    { key: 'action_param1', label: 'Cinematic entry', ref: 'cinematic' },
  ],
  136: [ // SET_MOVEMENT_SPEED
    { key: 'action_param1', label: 'Movement type', kind: 'enum', options: sai_movement_type_options, i18nNamespace: 'sai_enums.sai_movement_type_options' },
    { key: 'action_param2', label: 'Speed (integer part)' },
    { key: 'action_param3', label: 'Speed (fraction part)' },
  ],
  // ids 138-141, 143-148 (OVERRIDE_LIGHT/WEATHER, SET_HOVER, SET_IMMUNE_PC/NPC,
  // SET_UNINTERACTIBLE, ACTIVATE_GAMEOBJECT, ADD_TO_STORED_TARGET_LIST…) don't
  // exist in this AzerothCore fork; id 158 (RESUME_MOVEMENT) moved to 236.
  142: [ // SET_HEALTH_PCT
    { key: 'action_param1', label: 'Health', kind: 'percent' },
  ],
  207: [ // SET_HOVER
    { key: 'action_param1', label: 'Hover', kind: 'bool' },
  ],
  235: [ // MOVEMENT_PAUSE
    { key: 'action_param1', label: 'Timer', kind: 'ms' },
  ],
  236: [ // MOVEMENT_RESUME
    { key: 'action_param1', label: 'Timer override', kind: 'ms' },
  ],
}

import type { BitmaskOption, SelectOption } from '@core/types/common'

// Shared enum/flag option sets referenced by the curated SAI param definitions.
// Values come from TrinityCore 3.3.5 (SmartScriptMgr.h, SharedDefines.h,
// MotionMaster.h, Object.h).

export const sai_cast_flags: BitmaskOption[] = [
  { value: 0x01, hex: '0x01', name: 'INTERRUPT_PREVIOUS', comment: 'Interrupt any spell casting' },
  { value: 0x02, hex: '0x02', name: 'TRIGGERED', comment: 'Zero mana cost, no cast time' },
  { value: 0x20, hex: '0x20', name: 'AURA_NOT_PRESENT', comment: 'Only cast if the target does not already have the aura' },
  { value: 0x40, hex: '0x40', name: 'COMBAT_MOVE', comment: 'Prevents combat movement if cast successful' },
]

export const sai_spell_school_mask: BitmaskOption[] = [
  { value: 1, hex: '0x01', name: 'Physical' },
  { value: 2, hex: '0x02', name: 'Holy' },
  { value: 4, hex: '0x04', name: 'Fire' },
  { value: 8, hex: '0x08', name: 'Nature' },
  { value: 16, hex: '0x10', name: 'Frost' },
  { value: 32, hex: '0x20', name: 'Shadow' },
  { value: 64, hex: '0x40', name: 'Arcane' },
]

export const sai_react_state_options: SelectOption[] = [
  { value: 0, name: 'Passive' },
  { value: 1, name: 'Defensive' },
  { value: 2, name: 'Aggressive' },
]

export const sai_summon_type_options: SelectOption[] = [
  { value: 1, name: 'TIMED_OR_DEAD_DESPAWN', comment: 'Despawns after timer or when the summon dies' },
  { value: 2, name: 'TIMED_OR_CORPSE_DESPAWN', comment: 'Despawns after timer or when the corpse disappears' },
  { value: 3, name: 'TIMED_DESPAWN', comment: 'Despawns after timer' },
  { value: 4, name: 'TIMED_DESPAWN_OUT_OF_COMBAT', comment: 'Despawns after timer once out of combat' },
  { value: 5, name: 'CORPSE_DESPAWN', comment: 'Despawns instantly on death' },
  { value: 6, name: 'CORPSE_TIMED_DESPAWN', comment: 'Despawns after timer once dead' },
  { value: 7, name: 'DEAD_DESPAWN', comment: 'Despawns when the corpse disappears' },
  { value: 8, name: 'MANUAL_DESPAWN', comment: 'Despawns only on explicit UnSummon()' },
]

export const sai_sheath_options: SelectOption[] = [
  { value: 0, name: 'Unarmed' },
  { value: 1, name: 'Melee' },
  { value: 2, name: 'Ranged' },
]

export const sai_go_state_options: SelectOption[] = [
  { value: 0, name: 'ACTIVE', comment: 'Open / activated' },
  { value: 1, name: 'READY', comment: 'Closed / default' },
  { value: 2, name: 'ACTIVE_ALTERNATIVE' },
]

export const sai_loot_state_options: SelectOption[] = [
  { value: 0, name: 'NOT_READY' },
  { value: 1, name: 'READY' },
  { value: 2, name: 'ACTIVATED' },
  { value: 3, name: 'JUST_DEACTIVATED' },
]

export const sai_power_type_options: SelectOption[] = [
  { value: 0, name: 'Mana' },
  { value: 1, name: 'Rage' },
  { value: 2, name: 'Focus' },
  { value: 3, name: 'Energy' },
  { value: 4, name: 'Happiness' },
  { value: 5, name: 'Rune' },
  { value: 6, name: 'Runic power' },
]

export const sai_los_hostility_options: SelectOption[] = [
  { value: 0, name: 'Hostile', comment: 'Only hostile units trigger the event' },
  { value: 1, name: 'Not hostile', comment: 'Only non-hostile units trigger the event' },
  { value: 2, name: 'Any', comment: 'Any unit triggers the event' },
]

export const sai_respawn_condition_options: SelectOption[] = [
  { value: 0, name: 'NONE', comment: 'Always' },
  { value: 1, name: 'MAP', comment: 'Only on the given map' },
  { value: 2, name: 'AREA', comment: 'Only in the given zone' },
]

export const sai_movement_type_options: SelectOption[] = [
  { value: 0, name: 'IDLE_MOTION_TYPE', comment: '0 = any movement type' },
  { value: 1, name: 'RANDOM_MOTION_TYPE' },
  { value: 2, name: 'WAYPOINT_MOTION_TYPE' },
  { value: 5, name: 'CHASE_MOTION_TYPE' },
  { value: 6, name: 'HOME_MOTION_TYPE' },
  { value: 7, name: 'FLIGHT_MOTION_TYPE' },
  { value: 8, name: 'POINT_MOTION_TYPE', comment: 'Used by MOVE_TO_POS / scripted points' },
  { value: 9, name: 'FLEEING_MOTION_TYPE' },
  { value: 10, name: 'DISTRACT_MOTION_TYPE' },
  { value: 11, name: 'ASSISTANCE_MOTION_TYPE' },
  { value: 13, name: 'TIMED_FLEEING_MOTION_TYPE' },
  { value: 14, name: 'FOLLOW_MOTION_TYPE' },
  { value: 16, name: 'EFFECT_MOTION_TYPE' },
]

export const sai_timer_update_options: SelectOption[] = [
  { value: 0, name: 'OOC', comment: 'Timer runs out of combat only' },
  { value: 1, name: 'IC', comment: 'Timer runs in combat only' },
  { value: 2, name: 'ALWAYS', comment: 'Timer always runs' },
]

export const sai_movement_slot_options: SelectOption[] = [
  { value: 0, name: 'Default' },
  { value: 1, name: 'Active' },
  { value: 2, name: 'Controlled' },
]

export const sai_spawn_type_options: SelectOption[] = [
  { value: 0, name: 'Creature' },
  { value: 1, name: 'GameObject' },
]

export const sai_inst_data_type_options: SelectOption[] = [
  { value: 0, name: 'SetData' },
  { value: 1, name: 'SetBossState' },
]

export const sai_bool_options: SelectOption[] = [
  { value: 0, name: 'No' },
  { value: 1, name: 'Yes' },
]

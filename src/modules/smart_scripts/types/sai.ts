import type { BitmaskOption, SelectOption } from '@core/types/common'
import {
  SAI_ACTION_TYPES,
  SAI_EVENT_SOURCE_MASKS,
  SAI_EVENT_TYPES,
  SAI_TARGET_TYPES,
  type SaiRawTypeDef,
} from './sai-metadata.generated'
import { SAI_EVENT_PARAMS } from './sai-params-events'
import { SAI_ACTION_PARAMS } from './sai-params-actions'
import { SAI_TARGET_PARAMS } from './sai-params-targets'

export type SaiParamKey =
  | 'event_param1' | 'event_param2' | 'event_param3' | 'event_param4'
  | 'action_param1' | 'action_param2' | 'action_param3' | 'action_param4' | 'action_param5' | 'action_param6'
  | 'target_param1' | 'target_param2' | 'target_param3'

// How the value is rendered/edited; 'uint' is the plain number default.
export type SaiParamKind = 'uint' | 'int' | 'bool' | 'percent' | 'ms' | 'seconds' | 'enum' | 'flags'

// What DB/DBC entity a plain number references (drives tooltips, later pickers).
export type SaiParamRef =
  | 'spell' | 'creature' | 'gameobject' | 'quest' | 'item' | 'emote' | 'sound'
  | 'faction' | 'creature_text' | 'actionlist' | 'waypoint' | 'game_event'
  | 'gossip_menu' | 'map' | 'zone' | 'areatrigger' | 'equipment' | 'model'
  | 'taxi' | 'movie' | 'cinematic' | 'spawn_group' | 'creature_group'

export interface SaiParamDef {
  key: SaiParamKey
  label: string
  kind?: SaiParamKind
  ref?: SaiParamRef
  options?: SelectOption[]
  flags?: BitmaskOption[]
  tooltip?: string
}

export interface SaiTypeDef extends SaiRawTypeDef {
  params: SaiParamDef[]
  // false = no curated param list; the UI falls back to generic param fields
  // annotated with rawComment from the C++ header.
  curated: boolean
}

export const SAI_SOURCE_TYPE_CREATURE = 0
export const SAI_SOURCE_TYPE_GAMEOBJECT = 1
export const SAI_SOURCE_TYPE_AREATRIGGER = 2
export const SAI_SOURCE_TYPE_TIMED_ACTIONLIST = 9

export const SAI_EVENT_LINK = 61
export const SAI_ACTION_CALL_TIMED_ACTIONLIST = 80
export const SAI_ACTION_CALL_RANDOM_TIMED_ACTIONLIST = 87
export const SAI_ACTION_CALL_RANDOM_RANGE_TIMED_ACTIONLIST = 88

export const SAI_PHASE_COUNT = 12

export const sai_event_flags: BitmaskOption[] = [
  { value: 0x001, hex: '0x001', name: 'NOT_REPEATABLE', comment: 'Event can not repeat' },
  { value: 0x002, hex: '0x002', name: 'DIFFICULTY_0', comment: 'UNUSED on 3.3.5' },
  { value: 0x004, hex: '0x004', name: 'DIFFICULTY_1', comment: 'UNUSED on 3.3.5' },
  { value: 0x008, hex: '0x008', name: 'DIFFICULTY_2', comment: 'UNUSED on 3.3.5' },
  { value: 0x010, hex: '0x010', name: 'DIFFICULTY_3', comment: 'UNUSED on 3.3.5' },
  { value: 0x080, hex: '0x080', name: 'DEBUG_ONLY', comment: 'Event only occurs in debug build' },
  { value: 0x100, hex: '0x100', name: 'DONT_RESET', comment: 'Event will not reset in SmartScript::OnReset()' },
  { value: 0x200, hex: '0x200', name: 'WHILE_CHARMED', comment: 'Event occurs even if AI owner is charmed' },
]

function buildDefs(raw: SaiRawTypeDef[], params: Record<number, SaiParamDef[]>): Map<number, SaiTypeDef> {
  const map = new Map<number, SaiTypeDef>()
  for (const def of raw) {
    map.set(def.id, { ...def, params: params[def.id] ?? [], curated: def.id in params })
  }
  return map
}

const eventDefs = buildDefs(SAI_EVENT_TYPES, SAI_EVENT_PARAMS)
const actionDefs = buildDefs(SAI_ACTION_TYPES, SAI_ACTION_PARAMS)
const targetDefs = buildDefs(SAI_TARGET_TYPES, SAI_TARGET_PARAMS)

export function getSaiEventDef(id: number): SaiTypeDef | undefined {
  return eventDefs.get(id)
}

export function getSaiActionDef(id: number): SaiTypeDef | undefined {
  return actionDefs.get(id)
}

export function getSaiTargetDef(id: number): SaiTypeDef | undefined {
  return targetDefs.get(id)
}

export function isEventValidForSourceType(eventId: number, sourceType: number): boolean {
  const mask = SAI_EVENT_SOURCE_MASKS[eventId]
  // Timed actionlists inherit the caller's context: any event is accepted
  // (rows normally use event 0 UPDATE_OOC/UPDATE_IC semantics).
  if (sourceType === SAI_SOURCE_TYPE_TIMED_ACTIONLIST) return true
  return mask === undefined ? true : (mask & (1 << sourceType)) !== 0
}

export interface SaiTypeSelectOption {
  value: number
  name: string
  comment: string
  unused: boolean
}

function toSelectOptions(defs: Map<number, SaiTypeDef>): SaiTypeSelectOption[] {
  return [...defs.values()].map(def => ({
    value: def.id,
    name: `${def.id} · ${def.name}`,
    comment: def.rawComment,
    unused: def.unused === true,
  }))
}

export const sai_event_type_options = toSelectOptions(eventDefs)
export const sai_action_type_options = toSelectOptions(actionDefs)
export const sai_target_type_options = toSelectOptions(targetDefs)

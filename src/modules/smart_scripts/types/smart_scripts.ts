import type { SelectOption } from '@core/types/common';

export interface SmartScript {
  entryorguid: number;
  source_type: number;
  id: number;
  link: number;
  event_type: number;
  event_phase_mask: number;
  event_chance: number;
  event_flags: number;
  event_param1: number;
  event_param2: number;
  event_param3: number;
  event_param4: number;
  action_type: number;
  action_param1: number;
  action_param2: number;
  action_param3: number;
  action_param4: number;
  action_param5: number;
  action_param6: number;
  target_type: number;
  target_param1: number;
  target_param2: number;
  target_param3: number;
  target_x: number;
  target_y: number;
  target_z: number;
  target_o: number;
  comment: string;
}

export const smart_script_type_options: SelectOption[] = [
  { value: 0, name: 'CREATURE' },
  { value: 1, name: 'GAMEOBJECT' },
  { value: 2, name: 'AREATRIGGER' },
  { value: 3, name: 'EVENT' },
  { value: 4, name: 'GOSSIP' },
  { value: 5, name: 'QUEST' },
  { value: 6, name: 'SPELL' },
  { value: 7, name: 'TRANSPORT' },
  { value: 8, name: 'FACTION' },
  { value: 9, name: 'TIMED_ACTIONLIST' },
];

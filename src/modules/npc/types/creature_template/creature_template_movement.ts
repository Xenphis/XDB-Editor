import type { SelectOption } from '@core/types/common'

export interface CreatureTemplateMovement {
  CreatureId: number
  Ground: number
  Swim: number
  Flight: number
  Rooted: number
  Chase: number
  Random: number
  InteractionPauseTimer: number
}

export const ground_movement_types: SelectOption[] = [
  { value: 0, name: 'None', comment: 'No ground movement' },
  { value: 1, name: 'Run', comment: 'Can run on ground' },
  { value: 2, name: 'Hover', comment: 'Hovers above ground' },
];

export const swim_movement_types: SelectOption[] = [
  { value: 0, name: 'None', comment: 'Cannot swim' },
  { value: 1, name: 'Swim', comment: 'Can swim' },
];

export const flight_movement_types: SelectOption[] = [
  { value: 0, name: 'None', comment: 'No flight' },
  { value: 1, name: 'Disable Gravity', comment: 'Disables gravity effect' },
  { value: 2, name: 'Can Fly', comment: 'Can fly (Deprecated: Use Disable Gravity instead)' },
];

export const rooted_types: SelectOption[] = [
  { value: 0, name: 'None', comment: 'Not rooted' },
  { value: 1, name: 'Rooted', comment: 'Rooted in place' },
];

export const chase_movement_types: SelectOption[] = [
  { value: 0, name: 'Run', comment: 'Runs when chasing' },
  { value: 1, name: 'Can Walk', comment: 'Can walk when chasing' },
  { value: 2, name: 'Always Walk', comment: 'Always walks when chasing' },
];

export const random_movement_types: SelectOption[] = [
  { value: 0, name: 'Walk', comment: 'Walks when moving randomly' },
  { value: 1, name: 'Can Run', comment: 'Can run when moving randomly' },
  { value: 2, name: 'Always Run', comment: 'Always runs when moving randomly' },
];

import type { SelectOption } from '@core/types/common';

// TypeScript type for TrinityCore 'creature_movement_override' table
// https://trinitycore.info/database/335/world/creature_movement_override

export interface CreatureMovementOverride {
  SpawnId: number;
  Ground?: number;
  Swim?: number;
  Flight?: number;
  Rooted?: number;
  Chase?: number;
  Random?: number;
  InteractionPauseTimer?: number;
}

export const ground_options: SelectOption[] = [
  { value: 0, name: 'None' },
  { value: 1, name: 'Run' },
  { value: 2, name: 'Hover' },
];

export const swim_options: SelectOption[] = [
  { value: 0, name: 'None' },
  { value: 1, name: 'Swim' },
];

export const flight_options: SelectOption[] = [
  { value: 0, name: 'None' },
  { value: 1, name: 'DisableGravity' },
  { value: 2, name: 'CanFly', comment: 'Deprecated: Use DisableGravity instead' },
];

export const rooted_options: SelectOption[] = [
  { value: 0, name: 'None' },
  { value: 1, name: 'Rooted' },
];

export const chase_options: SelectOption[] = [
  { value: 0, name: 'Run' },
  { value: 1, name: 'CanWalk' },
  { value: 2, name: 'AlwaysWalk' },
];

export const random_options: SelectOption[] = [
  { value: 0, name: 'Walk' },
  { value: 1, name: 'CanRun' },
  { value: 2, name: 'AlwaysRun' },
];

import type { SelectOption } from '@core/types/common';

// TypeScript type for TrinityCore 'creature_default_trainer' table
// https://trinitycore.info/database/335/world/creature_default_trainer

export interface CreatureDefaultTrainer {
  CreatureId: number;
  TrainerId: number;
}

export const trainer_id_options: SelectOption[] = [
  { value: 1, name: 'Warrior' },
  { value: 3, name: 'Paladin' },
  { value: 7, name: 'Hunter' },
  { value: 9, name: 'Rogue' },
  { value: 11, name: 'Priest' },
  { value: 13, name: 'Death Knight' },
  { value: 14, name: 'Shaman' },
  { value: 16, name: 'Mage' },
  { value: 31, name: 'Warlock' },
  { value: 33, name: 'Druid' },
  { value: 36, name: 'Mount and Fly' },
];

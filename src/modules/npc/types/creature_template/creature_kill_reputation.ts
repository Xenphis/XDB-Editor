import type { SelectOption } from '@core/types/common';

// TypeScript type for TrinityCore 'creature_onkill_reputation' table
// https://trinitycore.info/database/335/world/creature_onkill_reputation

export interface CreatureOnKillReputation {
  creature_id: number;
  RewOnKillRepFaction1: number;
  RewOnKillRepFaction2: number;
  MaxStanding1: number;
  IsTeamAward1: number;
  RewOnKillRepValue1: number;
  MaxStanding2: number;
  IsTeamAward2: number;
  RewOnKillRepValue2: number;
  TeamDependent: number;
}

export const max_standing_options: SelectOption[] = [
  { value: 0, name: 'Hated' },
  { value: 1, name: 'Hostile' },
  { value: 2, name: 'Unfriendly' },
  { value: 3, name: 'Neutral' },
  { value: 4, name: 'Friendly' },
  { value: 5, name: 'Honored' },
  { value: 6, name: 'Revered' },
  { value: 7, name: 'Exalted' },
];

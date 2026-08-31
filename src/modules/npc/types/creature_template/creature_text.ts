import type { SelectOption } from '@core/types/common';

export interface CreatureText {
  CreatureID: number;
  GroupID: number;
  ID: number;
  Text: string | null;
  Type: number;
  Language: number;
  Probability: number;
  Emote: number;
  Duration: number;
  Sound: number;
  BroadcastTextId: number;
  TextRange: number;
  comment: string | null;
}

export const creature_text_type_options: SelectOption[] = [
  { value: 0, name: 'Say', comment: 'Yellow text in chat bubble' },
  { value: 1, name: 'Yell', comment: 'Red text in chat bubble' },
  { value: 2, name: 'Emote', comment: 'Text in emote' },
  { value: 3, name: 'Boss Emote', comment: 'Raid warning in the middle of the screen' },
  { value: 4, name: 'Whisper', comment: 'Text in whisper' },
  { value: 5, name: 'Boss Whisper', comment: 'Raid warning in the middle of the screen (whisper)' },
];

export const creature_text_language_options: SelectOption[] = [
  { value: 0, name: 'Universal', comment: 'Current default language' },
  { value: 1, name: 'Orcish' },
  { value: 2, name: 'Darnassian' },
  { value: 3, name: 'Taurahe' },
  { value: 6, name: 'Dwarvish' },
  { value: 7, name: 'Common' },
  { value: 8, name: 'Demonic' },
  { value: 9, name: 'Titan' },
  { value: 10, name: 'Thalassian' },
  { value: 11, name: 'Draconic' },
  { value: 12, name: 'Kalimag' },
  { value: 13, name: 'Gnomish' },
  { value: 14, name: 'Troll' },
  { value: 33, name: 'Gutterspeak' },
  { value: 35, name: 'Draenei' },
  { value: 36, name: 'Zombie' },
  { value: 37, name: 'Gnomish Binary' },
  { value: 38, name: 'Goblin Binary' },
];

export const creature_text_range_options: SelectOption[] = [
  { value: 0, name: 'Normal/Default' },
  { value: 1, name: 'Area' },
  { value: 2, name: 'Zone' },
  { value: 3, name: 'Map' },
  { value: 4, name: 'World' },
];

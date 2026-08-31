import type { BitmaskOption } from '../../../core/types/common';

export const quest_special_flags_options: BitmaskOption[] = [
  { value: 0x01, hex: '0x01', name: 'REPEATABLE', comment: 'Quest can be repeated' },
  { value: 0x02, hex: '0x02', name: 'EXPLORATION_OR_EVENT', comment: 'Exploration or event required' },
  { value: 0x04, hex: '0x04', name: 'AUTO_ACCEPT', comment: 'Auto-accepted quest' },
  { value: 0x08, hex: '0x08', name: 'DF_QUEST', comment: 'Dungeon Finder quest' },
  { value: 0x10, hex: '0x10', name: 'MONTHLY', comment: 'Monthly reset quest' },
  { value: 0x20, hex: '0x20', name: 'CAST', comment: 'Requires spell cast for killcredit' },
];

export interface QuestTemplateAddon {
  ID: number;
  MaxLevel: number;
  AllowableClasses: number;
  SourceSpellID: number;
  PrevQuestID: number;
  NextQuestID: number;
  ExclusiveGroup: number;
  BreadcrumbForQuestId: number;
  RewardMailTemplateID: number;
  RewardMailDelay: number;
  RequiredSkillID: number;
  RequiredSkillPoints: number;
  RequiredMinRepFaction: number;
  RequiredMaxRepFaction: number;
  RequiredMinRepValue: number;
  RequiredMaxRepValue: number;
  ProvidedItemCount: number;
  SpecialFlags: number;
}

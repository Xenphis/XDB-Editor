import type { BitmaskOption } from '../../../core/types/common';

export const quest_flags_options: BitmaskOption[] = [
  { value: 0x000001, hex: '0x000001', name: 'STAY_ALIVE', comment: 'Fail if player dies' },
  { value: 0x000002, hex: '0x000002', name: 'PARTY_ACCEPT', comment: 'Party confirmation' },
  { value: 0x000004, hex: '0x000004', name: 'EXPLORATION', comment: 'Exploration/areatrigger' },
  { value: 0x000008, hex: '0x000008', name: 'SHARABLE', comment: 'Can be shared' },
  { value: 0x000010, hex: '0x000010', name: 'HAS_CONDITION', comment: 'Has condition' },
  { value: 0x000020, hex: '0x000020', name: 'HIDE_REWARD_POI', comment: 'Hide reward POI' },
  { value: 0x000040, hex: '0x000040', name: 'RAID', comment: 'Can be completed in raid' },
  { value: 0x000080, hex: '0x000080', name: 'TBC', comment: 'TBC expansion only' },
  { value: 0x000100, hex: '0x000100', name: 'NO_MONEY_FROM_XP', comment: 'No money from XP' },
  { value: 0x000200, hex: '0x000200', name: 'HIDDEN_REWARDS', comment: 'Hidden rewards until ready' },
  { value: 0x000400, hex: '0x000400', name: 'TRACKING', comment: 'Auto rewarded, never in log' },
  { value: 0x000800, hex: '0x000800', name: 'DEPRECATE_REPUTATION', comment: 'Deprecate reputation' },
  { value: 0x001000, hex: '0x001000', name: 'DAILY', comment: 'Daily repeatable' },
  { value: 0x002000, hex: '0x002000', name: 'FLAGS_PVP', comment: 'Forces PvP flag' },
  { value: 0x004000, hex: '0x004000', name: 'UNAVAILABLE', comment: 'Not generically available' },
  { value: 0x008000, hex: '0x008000', name: 'WEEKLY', comment: 'Weekly repeatable' },
  { value: 0x010000, hex: '0x010000', name: 'AUTOCOMPLETE', comment: 'Auto complete' },
  { value: 0x020000, hex: '0x020000', name: 'DISPLAY_ITEM_IN_TRACKER', comment: 'Display item in tracker' },
  { value: 0x040000, hex: '0x040000', name: 'OBJ_TEXT', comment: 'Use objective text as complete text' },
  { value: 0x080000, hex: '0x080000', name: 'AUTO_ACCEPT', comment: 'Auto accept' },
];

export interface QuestTemplate {
  ID: number;
  QuestType: number;
  QuestLevel: number;
  MinLevel: number;
  QuestSortID: number;
  QuestInfoID: number;
  SuggestedGroupNum: number;
  RequiredFactionId1: number;
  RequiredFactionId2: number;
  RequiredFactionValue1: number;
  RequiredFactionValue2: number;
  RewardNextQuest: number;
  RewardXPDifficulty: number;
  RewardMoney: number;
  RewardBonusMoney: number;
  RewardDisplaySpell: number;
  RewardSpell: number;
  RewardHonor: number;
  RewardKillHonor: number;
  StartItem: number;
  Flags: number;
  RequiredPlayerKills: number;
  RewardItem1: number;
  RewardAmount1: number;
  RewardItem2: number;
  RewardAmount2: number;
  RewardItem3: number;
  RewardAmount3: number;
  RewardItem4: number;
  RewardAmount4: number;
  ItemDrop1: number;
  ItemDropQuantity1: number;
  ItemDrop2: number;
  ItemDropQuantity2: number;
  ItemDrop3: number;
  ItemDropQuantity3: number;
  ItemDrop4: number;
  ItemDropQuantity4: number;
  RewardChoiceItemID1: number;
  RewardChoiceItemQuantity1: number;
  RewardChoiceItemID2: number;
  RewardChoiceItemQuantity2: number;
  RewardChoiceItemID3: number;
  RewardChoiceItemQuantity3: number;
  RewardChoiceItemID4: number;
  RewardChoiceItemQuantity4: number;
  RewardChoiceItemID5: number;
  RewardChoiceItemQuantity5: number;
  RewardChoiceItemID6: number;
  RewardChoiceItemQuantity6: number;
  POIContinent: number;
  POIx: number;
  POIy: number;
  POIPriority: number;
  RewardTitle: number;
  RewardTalents: number;
  RewardArenaPoints: number;
  RewardFactionID1: number;
  RewardFactionValue1: number;
  RewardFactionOverride1: number;
  RewardFactionID2: number;
  RewardFactionValue2: number;
  RewardFactionOverride2: number;
  RewardFactionID3: number;
  RewardFactionValue3: number;
  RewardFactionOverride3: number;
  RewardFactionID4: number;
  RewardFactionValue4: number;
  RewardFactionOverride4: number;
  RewardFactionID5: number;
  RewardFactionValue5: number;
  RewardFactionOverride5: number;
  RewardFactionFlags: number;
  TimeAllowed: number;
  AllowableRaces: number;
  LogTitle?: string;
  LogDescription?: string;
  QuestDescription?: string;
  AreaDescription?: string;
  QuestCompletionLog?: string;
  RequiredNpcOrGo1: number;
  RequiredNpcOrGo2: number;
  RequiredNpcOrGo3: number;
  RequiredNpcOrGo4: number;
  RequiredNpcOrGoCount1: number;
  RequiredNpcOrGoCount2: number;
  RequiredNpcOrGoCount3: number;
  RequiredNpcOrGoCount4: number;
  RequiredItemId1: number;
  RequiredItemId2: number;
  RequiredItemId3: number;
  RequiredItemId4: number;
  RequiredItemId5: number;
  RequiredItemId6: number;
  RequiredItemCount1: number;
  RequiredItemCount2: number;
  RequiredItemCount3: number;
  RequiredItemCount4: number;
  RequiredItemCount5: number;
  RequiredItemCount6: number;
  ObjectiveText1?: string;
  ObjectiveText2?: string;
  ObjectiveText3?: string;
  ObjectiveText4?: string;
  VerifiedBuild?: number;
}

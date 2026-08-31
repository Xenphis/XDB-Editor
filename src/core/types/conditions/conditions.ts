import type { SelectOption } from '../common';

export interface Conditions {
  SourceTypeOrReferenceId: number;
  SourceGroup: number;
  SourceEntry: number;
  SourceId: number;
  ElseGroup: number;
  ConditionTypeOrReference: number;
  ConditionTarget: number;
  ConditionValue1: number;
  ConditionValue2: number;
  ConditionValue3: number;
  NegativeCondition: number;
  ErrorType: number;
  ErrorTextId: number;
  ScriptName: string;
  Comment: string;
}

export const condition_source_type_options: SelectOption[] = [
  { value: 0, name: 'NONE' },
  { value: 1, name: 'CREATURE_LOOT_TEMPLATE' },
  { value: 2, name: 'DISENCHANT_LOOT_TEMPLATE' },
  { value: 3, name: 'FISHING_LOOT_TEMPLATE' },
  { value: 4, name: 'GAMEOBJECT_LOOT_TEMPLATE' },
  { value: 5, name: 'ITEM_LOOT_TEMPLATE' },
  { value: 6, name: 'MAIL_LOOT_TEMPLATE' },
  { value: 7, name: 'MILLING_LOOT_TEMPLATE' },
  { value: 8, name: 'PICKPOCKETING_LOOT_TEMPLATE' },
  { value: 9, name: 'PROSPECTING_LOOT_TEMPLATE' },
  { value: 10, name: 'REFERENCE_LOOT_TEMPLATE' },
  { value: 11, name: 'SKINNING_LOOT_TEMPLATE' },
  { value: 12, name: 'SPELL_LOOT_TEMPLATE' },
  { value: 13, name: 'SPELL_IMPLICIT_TARGET' },
  { value: 14, name: 'GOSSIP_MENU' },
  { value: 15, name: 'GOSSIP_MENU_OPTION' },
  { value: 16, name: 'CREATURE_TEMPLATE_VEHICLE' },
  { value: 17, name: 'SPELL' },
  { value: 18, name: 'SPELL_CLICK_EVENT' },
  { value: 19, name: 'QUEST_ACCEPT' },
  { value: 20, name: 'QUEST_SHOW_MARK' },
  { value: 21, name: 'VEHICLE_SPELL' },
  { value: 22, name: 'SMART_EVENT' },
  { value: 23, name: 'NPC_VENDOR' },
  { value: 24, name: 'SPELL_PROC' },
];

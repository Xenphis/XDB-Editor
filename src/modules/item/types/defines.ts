import type { SelectOption } from '@core/types/common';

// Item Class
export const item_class_options: SelectOption[] = [
  { value: 0, name: 'Consumable' },
  { value: 1, name: 'Container' },
  { value: 2, name: 'Weapon' },
  { value: 3, name: 'Gem' },
  { value: 4, name: 'Armor' },
  { value: 5, name: 'Reagent' },
  { value: 6, name: 'Projectile' },
  { value: 7, name: 'Trade Goods' },
  { value: 9, name: 'Recipe' },
  { value: 11, name: 'Quiver' },
  { value: 12, name: 'Quest' },
  { value: 13, name: 'Key' },
  { value: 15, name: 'Miscellaneous' },
  { value: 16, name: 'Glyph' },
];

// Item Subclass (simplified - full list would be class-dependent)
export const item_subclass_options: SelectOption[] = [
  // Consumable (Class 0)
  { value: 0, name: 'Consumable' },
  { value: 1, name: 'Potion' },
  { value: 2, name: 'Elixir' },
  { value: 3, name: 'Flask' },
  { value: 4, name: 'Scroll' },
  { value: 5, name: 'Food & Drink' },
  { value: 6, name: 'Item Enhancement' },
  { value: 7, name: 'Bandage' },
  { value: 8, name: 'Other' },
];

// Item Quality
export const item_quality_options: SelectOption[] = [
  { value: 0, name: 'Poor' },
  { value: 1, name: 'Common' },
  { value: 2, name: 'Uncommon' },
  { value: 3, name: 'Rare' },
  { value: 4, name: 'Epic' },
  { value: 5, name: 'Legendary' },
  { value: 6, name: 'Artifact' },
  { value: 7, name: 'Heirloom' },
];

// Inventory Type
export const inventory_type_options: SelectOption[] = [
  { value: 0,  name: 'Non equip' },
  { value: 1,  name: 'Head' },
  { value: 2,  name: 'Neck' },
  { value: 3,  name: 'Shoulders' },
  { value: 4,  name: 'Body' },
  { value: 5,  name: 'Chest' },
  { value: 6,  name: 'Waist' },
  { value: 7,  name: 'Legs' },
  { value: 8,  name: 'Feet' },
  { value: 9,  name: 'Wrists' },
  { value: 10, name: 'Hands' },
  { value: 11, name: 'Finger' },
  { value: 12, name: 'Trinket' },
  { value: 13, name: 'Weapon' },
  { value: 14, name: 'Shield' },
  { value: 15, name: 'Ranged' },
  { value: 16, name: 'Cloak' },
  { value: 17, name: 'Two handed weapon' },
  { value: 18, name: 'Bag' },
  { value: 19, name: 'Tabard' },
  { value: 20, name: 'Robe' },
  { value: 21, name: 'Main hand' },
  { value: 22, name: 'Off hand' },
  { value: 23, name: 'Holdable' },
  { value: 24, name: 'Ammo' },
  { value: 25, name: 'Thrown' },
  { value: 26, name: 'Ranged right' },
  { value: 27, name: 'Quiver' },
  { value: 28, name: 'Relic' },
];

// Honor Rank
export const honor_rank_options: SelectOption[] = [
  { value: 0, name: 'None' },
  { value: 1, name: 'Private / Scout' },
  { value: 2, name: 'Corporal / Grunt' },
  { value: 3, name: 'Sergeant / Sergeant' },
  { value: 4, name: 'Master Sergeant / Senior Sergeant' },
  { value: 5, name: 'Sergeant Major / First Sergeant' },
  { value: 6, name: 'Knight / Stone Guard' },
  { value: 7, name: 'Knight-Lieutenant / Blood Guard' },
  { value: 8, name: 'Knight-Captain / Legionnare' },
  { value: 9, name: 'Knight-Champion / Centurion' },
  { value: 10, name: 'Lieutenant Commander / Champion' },
  { value: 11, name: 'Commander / Lieutenant General' },
  { value: 12, name: 'Marshal / General' },
  { value: 13, name: 'Field Marshal / Warlord' },
  { value: 14, name: 'Grand Marshal / High Warlord' },
];

// Reputation Rank
export const reputation_rank_options: SelectOption[] = [
  { value: 0, name: 'Hated' },
  { value: 1, name: 'Hostile' },
  { value: 2, name: 'Unfriendly' },
  { value: 3, name: 'Neutral' },
  { value: 4, name: 'Friendly' },
  { value: 5, name: 'Honored' },
  { value: 6, name: 'Revered' },
  { value: 7, name: 'Exalted' },
];

// Stat Type (ItemModType)
export const stat_type_options: SelectOption[] = [
  { value: 0,  name: 'Mana' },
  { value: 1,  name: 'Health' },
  { value: 3,  name: 'Agility' },
  { value: 4,  name: 'Strength' },
  { value: 5,  name: 'Intellect' },
  { value: 6,  name: 'Spirit' },
  { value: 7,  name: 'Stamina' },
  { value: 12, name: 'Defense skill rating' },
  { value: 13, name: 'Dodge rating' },
  { value: 14, name: 'Parry rating' },
  { value: 15, name: 'Block rating' },
  { value: 16, name: 'Hit melee rating' },
  { value: 17, name: 'Hit ranged rating' },
  { value: 18, name: 'Hit spell rating' },
  { value: 19, name: 'Crit melee rating' },
  { value: 20, name: 'Crit ranged rating' },
  { value: 21, name: 'Crit spell rating' },
  { value: 28, name: 'Haste melee rating' },
  { value: 29, name: 'Haste ranged rating' },
  { value: 30, name: 'Haste spell rating' },
  { value: 31, name: 'Hit rating' },
  { value: 32, name: 'Crit rating' },
  { value: 35, name: 'Resilience rating' },
  { value: 36, name: 'Haste rating' },
  { value: 37, name: 'Expertise rating' },
  { value: 38, name: 'Attack power' },
  { value: 39, name: 'Ranged attack power' },
  { value: 43, name: 'Mana regeneration' },
  { value: 44, name: 'Armor penetration rating' },
  { value: 45, name: 'Spell power' },
  { value: 46, name: 'Health regen' },
  { value: 47, name: 'Spell penetration' },
  { value: 48, name: 'Block value' },
];

// Damage Type (SpellSchool)
export const damage_type_options: SelectOption[] = [
  { value: 0, name: 'Normal' },
  { value: 1, name: 'Holy' },
  { value: 2, name: 'Fire' },
  { value: 3, name: 'Nature' },
  { value: 4, name: 'Frost' },
  { value: 5, name: 'Shadow' },
  { value: 6, name: 'Arcane' },
];

// Spell Trigger
export const spell_trigger_options: SelectOption[] = [
  { value: 0, name: 'On use (after equip cooldown)' },
  { value: 1, name: 'On equip' },
  { value: 2, name: 'Chance on hit' },
  { value: 4, name: 'Soulstone' },
  { value: 5, name: 'On use (no equip cooldown)' },
  { value: 6, name: 'Learn spell ID' },
];

// Bonding
export const bonding_options: SelectOption[] = [
  { value: 0, name: 'No bind' },
  { value: 1, name: 'Bind when picked up' },
  { value: 2, name: 'Bind when equipped' },
  { value: 3, name: 'Bind when used' },
  { value: 4, name: 'Bind quest item' },
];

// Language
export const language_options: SelectOption[] = [
  { value: 0, name: 'Universal' },
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

// Material
export const material_options: SelectOption[] = [
  { value: -1, name: 'Consumables' },
  { value: 0, name: 'Not Defined' },
  { value: 1, name: 'Metal' },
  { value: 2, name: 'Wood' },
  { value: 3, name: 'Liquid' },
  { value: 4, name: 'Jewelry' },
  { value: 5, name: 'Chain' },
  { value: 6, name: 'Plate' },
  { value: 7, name: 'Cloth' },
  { value: 8, name: 'Leather' },
];

// Sheath
export const sheath_options: SelectOption[] = [
  { value: 0, name: 'None' },
  { value: 1, name: 'Two Handed Weapon' },
  { value: 2, name: 'Staff' },
  { value: 3, name: 'One Handed' },
  { value: 4, name: 'Shield' },
  { value: 5, name: 'Tool' },
  { value: 7, name: 'Off hand' },
];

// Socket Color
export const socket_color_options: SelectOption[] = [
  { value: 0, name: 'None' },
  { value: 1, name: 'Meta' },
  { value: 2, name: 'Red' },
  { value: 4, name: 'Yellow' },
  { value: 8, name: 'Blue' },
];

// Bag Family (bitmask)
export const bag_family_options = [
  { value: 0x0000, hex: '0x0000', name: 'None' },
  { value: 0x0001, hex: '0x0001', name: 'Arrows' },
  { value: 0x0002, hex: '0x0002', name: 'Bullets' },
  { value: 0x0004, hex: '0x0004', name: 'Soul Shards' },
  { value: 0x0008, hex: '0x0008', name: 'Leatherworking Supplies' },
  { value: 0x0010, hex: '0x0010', name: 'Inscription Supplies' },
  { value: 0x0020, hex: '0x0020', name: 'Herbs' },
  { value: 0x0040, hex: '0x0040', name: 'Enchanting Supplies' },
  { value: 0x0080, hex: '0x0080', name: 'Engineering Supplies' },
  { value: 0x0100, hex: '0x0100', name: 'Keys' },
  { value: 0x0200, hex: '0x0200', name: 'Gems' },
  { value: 0x0400, hex: '0x0400', name: 'Mining Supplies' },
  { value: 0x0800, hex: '0x0800', name: 'Soulbound Equipment' },
  { value: 0x1000, hex: '0x1000', name: 'Vanity Pets' },
  { value: 0x2000, hex: '0x2000', name: 'Currency Tokens' },
  { value: 0x4000, hex: '0x4000', name: 'Quest Items' },
];

// Totem Category
export const totem_category_options: SelectOption[] = [
  { value: 0, name: 'None' },
  { value: 2, name: 'Earth Totem' },
  { value: 3, name: 'Air Totem' },
  { value: 4, name: 'Fire Totem' },
  { value: 5, name: 'Water Totem' },
  { value: 6, name: 'Runed Copper Rod' },
  { value: 7, name: 'Runed Silver Rod' },
  { value: 8, name: 'Runed Golden Rod' },
  { value: 9, name: 'Runed Truesilver Rod' },
  { value: 10, name: 'Runed Arcanite Rod' },
  { value: 12, name: "Philosopher's Stone" },
  { value: 14, name: 'Arclight Spanner' },
  { value: 15, name: 'Gyromatic Micro-Adjustor' },
  { value: 21, name: 'Master Totem' },
  { value: 41, name: 'Runed Fel Iron Rod' },
  { value: 62, name: 'Runed Adamantite Rod' },
  { value: 63, name: 'Runed Eternium Rod' },
  { value: 81, name: 'Hollow Quill' },
  { value: 101, name: 'Runed Azurite Rod' },
  { value: 121, name: 'Virtuoso Inking Set' },
  { value: 141, name: 'Drums' },
  { value: 161, name: 'Gnomish Army Knife' },
  { value: 162, name: 'Blacksmith Hammer' },
  { value: 165, name: 'Mining Pick' },
  { value: 166, name: 'Skinning Knife' },
  { value: 167, name: 'Hammer Pick' },
  { value: 168, name: 'Bladed Pickaxe' },
  { value: 169, name: 'Flint and Tinder' },
  { value: 190, name: 'Runed Titanium Rod' },
];

// Food Type
export const food_type_options: SelectOption[] = [
  { value: 0, name: 'None' },
  { value: 1, name: 'Meat' },
  { value: 2, name: 'Fish' },
  { value: 3, name: 'Cheese' },
  { value: 4, name: 'Bread' },
  { value: 5, name: 'Fungus' },
  { value: 6, name: 'Fruit' },
  { value: 7, name: 'Raw Meat' },
  { value: 8, name: 'Raw Fish' },
];

// Item Flags (bitmask)
export const ITEM_FLAGS = [
  { value: 0x00000001, hex: '0x00000001', name: 'No pickup' },
  { value: 0x00000002, hex: '0x00000002', name: 'Conjured' },
  { value: 0x00000004, hex: '0x00000004', name: 'Has loot' },
  { value: 0x00000008, hex: '0x00000008', name: 'Heroic tooltip' },
  { value: 0x00000010, hex: '0x00000010', name: 'Deprecated' },
  { value: 0x00000020, hex: '0x00000020', name: 'No user destroy' },
  { value: 0x00000040, hex: '0x00000040', name: 'Player cast' },
  { value: 0x00000080, hex: '0x00000080', name: 'No equip cooldown' },
  { value: 0x00000100, hex: '0x00000100', name: 'Multi loot quest' },
  { value: 0x00000200, hex: '0x00000200', name: 'Is wrapper' },
  { value: 0x00000400, hex: '0x00000400', name: 'Uses resources' },
  { value: 0x00000800, hex: '0x00000800', name: 'Multi drop' },
  { value: 0x00001000, hex: '0x00001000', name: 'Item purchase record' },
  { value: 0x00002000, hex: '0x00002000', name: 'Petition' },
  { value: 0x00004000, hex: '0x00004000', name: 'Has text' },
  { value: 0x00008000, hex: '0x00008000', name: 'No disenchant' },
  { value: 0x00010000, hex: '0x00010000', name: 'Real duration' },
  { value: 0x00020000, hex: '0x00020000', name: 'No creator' },
  { value: 0x00040000, hex: '0x00040000', name: 'Is prospectable' },
  { value: 0x00080000, hex: '0x00080000', name: 'Unique equippable' },
  { value: 0x00100000, hex: '0x00100000', name: 'Ignore for auras' },
  { value: 0x00200000, hex: '0x00200000', name: 'Ignore default arena restrictions' },
  { value: 0x00400000, hex: '0x00400000', name: 'No durability loss' },
  { value: 0x00800000, hex: '0x00800000', name: 'Use when shapeshifted' },
  { value: 0x01000000, hex: '0x01000000', name: 'Has quest glow' },
  { value: 0x02000000, hex: '0x02000000', name: 'Hide unusable recipe' },
  { value: 0x04000000, hex: '0x04000000', name: 'Not usable in arena' },
  { value: 0x08000000, hex: '0x08000000', name: 'Bound to account' },
  { value: 0x10000000, hex: '0x10000000', name: 'No reagent cost' },
  { value: 0x20000000, hex: '0x20000000', name: 'Is millable' },
  { value: 0x40000000, hex: '0x40000000', name: 'Report to guild chat' },
  { value: 0x80000000, hex: '0x80000000', name: 'No progressive loot' },
];

// Item Flags Extra (bitmask)
export const ITEM_FLAGS_EXTRA = [
  { value: 0x00000001, hex: '0x00000001', name: 'Faction: Horde' },
  { value: 0x00000002, hex: '0x00000002', name: 'Faction: Alliance' },
  { value: 0x00000004, hex: '0x00000004', name: "Don't ignore buy price" },
  { value: 0x00000008, hex: '0x00000008', name: 'Classify as caster' },
  { value: 0x00000010, hex: '0x00000010', name: 'Classify as physical' },
  { value: 0x00000020, hex: '0x00000020', name: 'Everyone can roll need' },
  { value: 0x00000040, hex: '0x00000040', name: 'No trade bind on acquire' },
  { value: 0x00000080, hex: '0x00000080', name: 'Can trade bind on acquire' },
  { value: 0x00000100, hex: '0x00000100', name: 'Can only roll greed' },
  { value: 0x00000200, hex: '0x00000200', name: 'Caster weapon' },
  { value: 0x00000400, hex: '0x00000400', name: 'Delete on login' },
  { value: 0x00000800, hex: '0x00000800', name: 'Internal item' },
  { value: 0x00001000, hex: '0x00001000', name: 'No vendor value' },
  { value: 0x00002000, hex: '0x00002000', name: 'Show before discovered' },
  { value: 0x00004000, hex: '0x00004000', name: 'Override gold cost' },
  { value: 0x00008000, hex: '0x00008000', name: 'Ignore default rated BG restrictions' },
  { value: 0x00010000, hex: '0x00010000', name: 'Not usable in rated BG' },
  { value: 0x00020000, hex: '0x00020000', name: 'Bnet account trade ok' },
  { value: 0x00040000, hex: '0x00040000', name: 'Confirm before use' },
  { value: 0x00080000, hex: '0x00080000', name: 'Reevaluate bonding on transform' },
  { value: 0x00100000, hex: '0x00100000', name: 'No transform on charge depletion' },
  { value: 0x00200000, hex: '0x00200000', name: 'No alter item visual' },
  { value: 0x00400000, hex: '0x00400000', name: 'No source for item visual' },
  { value: 0x00800000, hex: '0x00800000', name: 'Ignore quality for item visual source' },
  { value: 0x01000000, hex: '0x01000000', name: 'No durability' },
  { value: 0x02000000, hex: '0x02000000', name: 'Role: Tank' },
  { value: 0x04000000, hex: '0x04000000', name: 'Role: Healer' },
  { value: 0x08000000, hex: '0x08000000', name: 'Role: Damage' },
  { value: 0x10000000, hex: '0x10000000', name: 'Can drop in challenge mode' },
  { value: 0x20000000, hex: '0x20000000', name: 'Never stack in loot UI' },
  { value: 0x40000000, hex: '0x40000000', name: 'Disenchant to loot table' },
  { value: 0x80000000, hex: '0x80000000', name: 'Used in a tradeskill' },
];

// Allowable Class (bitmask)
export const ALLOWABLE_CLASS = [
  { value: 0x0001, hex: '0x0001', name: 'Warrior' },
  { value: 0x0002, hex: '0x0002', name: 'Paladin' },
  { value: 0x0004, hex: '0x0004', name: 'Hunter' },
  { value: 0x0008, hex: '0x0008', name: 'Rogue' },
  { value: 0x0010, hex: '0x0010', name: 'Priest' },
  { value: 0x0020, hex: '0x0020', name: 'Death Knight' },
  { value: 0x0040, hex: '0x0040', name: 'Shaman' },
  { value: 0x0080, hex: '0x0080', name: 'Mage' },
  { value: 0x0100, hex: '0x0100', name: 'Warlock' },
  { value: 0x0400, hex: '0x0400', name: 'Druid' },
];

// Allowable Race (bitmask)
export const ALLOWABLE_RACE = [
  { value: 0x0001, hex: '0x0001', name: 'Human' },
  { value: 0x0002, hex: '0x0002', name: 'Orc' },
  { value: 0x0004, hex: '0x0004', name: 'Dwarf' },
  { value: 0x0008, hex: '0x0008', name: 'Night Elf' },
  { value: 0x0010, hex: '0x0010', name: 'Undead' },
  { value: 0x0020, hex: '0x0020', name: 'Tauren' },
  { value: 0x0040, hex: '0x0040', name: 'Gnome' },
  { value: 0x0080, hex: '0x0080', name: 'Troll' },
  { value: 0x0200, hex: '0x0200', name: 'Blood Elf' },
  { value: 0x0400, hex: '0x0400', name: 'Draenei' },
];

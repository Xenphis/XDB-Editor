import type { BitmaskOption, SelectOption } from "@core/types/common";

export const npc_flags: BitmaskOption[] = [
  { value: 1, hex: '0x00000001', name: 'Gossip', comment: 'If creature has more gossip options, add this flag to bring up a menu.' },
  { value: 2, hex: '0x00000002', name: 'Quest Giver', comment: 'Any creature giving or taking quests needs to have this flag.' },
  { value: 16, hex: '0x00000010', name: 'Trainer', comment: 'Allows the creature to have a trainer list to teach spells' },
  { value: 32, hex: '0x00000020', name: 'Class Trainer' },
  { value: 64, hex: '0x00000040', name: 'Profession Trainer' },
  { value: 128, hex: '0x00000080', name: 'Vendor', comment: 'Any creature selling items needs to have this flag.' },
  { value: 256, hex: '0x00000100', name: 'Vendor Ammo' },
  { value: 512, hex: '0x00000200', name: 'Vendor Food' },
  { value: 1024, hex: '0x00000400', name: 'Vendor Poison' },
  { value: 2048, hex: '0x00000800', name: 'Vendor Reagent' },
  { value: 4096, hex: '0x00001000', name: 'Repairer', comment: 'Creatures with this flag can repair items.' },
  { value: 8192, hex: '0x00002000', name: 'Flight Master', comment: 'Any creature serving as flight master has this.' },
  { value: 16384, hex: '0x00004000', name: 'Spirit Healer', comment: 'Makes the creature invisible to alive characters and has the PvE resurrect function.' },
  { value: 32768, hex: '0x00008000', name: 'Spirit Guide', comment: 'Makes the creature invisible to alive characters and has the PvP resurrect function.' },
  { value: 65536, hex: '0x00010000', name: 'Innkeeper', comment: 'Creatures with this flag can set hearthstone locations.' },
  { value: 131072, hex: '0x00020000', name: 'Banker', comment: 'Creatures with this flag can show the bank' },
  { value: 262144, hex: '0x00040000', name: 'Petitioner', comment: 'Handles guild/arena petitions' },
  { value: 524288, hex: '0x00080000', name: 'Tabard Designer', comment: 'Allows the designing of guild tabards.' },
  { value: 1048576, hex: '0x00100000', name: 'Battlemaster', comment: 'Creatures with this flag port players to battlegrounds.' },
  { value: 2097152, hex: '0x00200000', name: 'Auctioneer', comment: 'Allows creature to display auction list.' },
  { value: 4194304, hex: '0x00400000', name: 'Stable Master', comment: 'Has the option to stable pets for hunters.' },
  { value: 8388608, hex: '0x00800000', name: 'Guild Banker' },
  { value: 16777216, hex: '0x01000000', name: 'Spellclick', comment: 'Needs data on npc_spellclick_spells table' },
  { value: 33554432, hex: '0x02000000', name: 'PlayerVehicle', comment: 'Players with mounts that have vehicle data should have it set' },
  { value: 67108864, hex: '0x04000000', name: 'Mailbox', comment: 'NPC will act like a mailbox (opens mailbox with right-click)' },
];

export const unit_flags_options: BitmaskOption[] = [
  { value: 0x00000001, hex: '0x00000001', name: 'Server Controlled', comment: 'Movement checks disabled, likely paired with loss of client control' },
  { value: 0x00000002, hex: '0x00000002', name: 'Non Attackable', comment: 'Not attackable' },
  { value: 0x00000004, hex: '0x00000004', name: 'Remove Client Control', comment: 'Disables client control' },
  { value: 0x00000008, hex: '0x00000008', name: 'Player Controlled', comment: 'Controlled by player, use _IMMUNE_TO_PC instead of _IMMUNE_TO_NPC' },
  { value: 0x00000010, hex: '0x00000010', name: 'Rename', comment: 'Creature name can be renamed' },
  { value: 0x00000020, hex: '0x00000020', name: 'Preparation', comment: 'Don\'t take reagents for spells with SPELL_ATTR5_NO_REAGENT_WHILE_PREP' },
  { value: 0x00000040, hex: '0x00000040', name: 'Unk 6' },
  { value: 0x00000080, hex: '0x00000080', name: 'Not Attackable 1', comment: 'NOT_ATTACKABLE_1 (non-default)' },
  { value: 0x00000100, hex: '0x00000100', name: 'Immune To PC', comment: 'Disables combat/assistance with PlayerCharacters (Flagged for PvP)' },
  { value: 0x00000200, hex: '0x00000200', name: 'Immune To NPC', comment: 'Disables combat/assistance with creatures' },
  { value: 0x00000400, hex: '0x00000400', name: 'Looting', comment: 'Loot animation' },
  { value: 0x00000800, hex: '0x00000800', name: 'Pet In Combat', comment: 'In combat? (Blizzard internal)' },
  { value: 0x00001000, hex: '0x00001000', name: 'PVP', comment: 'Flagged for PvP enabling combat with PlayerCharacters' },
  { value: 0x00002000, hex: '0x00002000', name: 'Silenced', comment: 'Can\'t cast spells' },
  { value: 0x00004000, hex: '0x00004000', name: 'Cannot Swim', comment: 'Can\'t swim' },
  { value: 0x00010000, hex: '0x00010000', name: 'Non Attackable 2', comment: 'Removes attackable icon, unitFlags default' },
  { value: 0x00020000, hex: '0x00020000', name: 'Pacified', comment: 'Can\'t attack' },
  { value: 0x00040000, hex: '0x00040000', name: 'Stunned', comment: 'Stunned, inhibits movement and casting' },
  { value: 0x00080000, hex: '0x00080000', name: 'In Combat', comment: 'In combat' },
  { value: 0x00100000, hex: '0x00100000', name: 'Taxi Flight', comment: 'On taxi' },
  { value: 0x00200000, hex: '0x00200000', name: 'Disarmed', comment: 'Disarmed' },
  { value: 0x00400000, hex: '0x00400000', name: 'Confused', comment: 'Confused' },
  { value: 0x00800000, hex: '0x00800000', name: 'Fleeing', comment: 'Fleeing from fear' },
  { value: 0x01000000, hex: '0x01000000', name: 'Possessed', comment: 'Under mind control' },
  { value: 0x02000000, hex: '0x02000000', name: 'Not Selectable', comment: 'Not selectable' },
  { value: 0x04000000, hex: '0x04000000', name: 'Skinnable', comment: 'Skinnable' },
  { value: 0x08000000, hex: '0x08000000', name: 'Mount', comment: 'Mounted' },
  { value: 0x10000000, hex: '0x10000000', name: 'Unk 28' },
  { value: 0x20000000, hex: '0x20000000', name: 'Unk 29' },
  { value: 0x40000000, hex: '0x40000000', name: 'Sheathe', comment: 'Toggle sheathe' },
];

export const unit_flags2_options: BitmaskOption[] = [
  { value: 0x00000001, hex: '0x00000001', name: 'Feign Death', comment: 'Feign death' },
  { value: 0x00000002, hex: '0x00000002', name: 'Unk 1', comment: 'Hide unit model (shows shadow)' },
  { value: 0x00000004, hex: '0x00000004', name: 'Ignore Reputation', comment: 'Ignore reputation' },
  { value: 0x00000008, hex: '0x00000008', name: 'Comprehend Lang', comment: 'Comprehend language' },
  { value: 0x00000010, hex: '0x00000010', name: 'Mirror Image', comment: 'Mirror image' },
  { value: 0x00000020, hex: '0x00000020', name: 'Force Movement', comment: 'Instantly appear at movement generator destination' },
  { value: 0x00000040, hex: '0x00000040', name: 'Disarm Offhand', comment: 'Disarm offhand weapon' },
  { value: 0x00000400, hex: '0x00000400', name: 'Disable Pred Stats', comment: 'Disable prediction stats (client-side)' },
  { value: 0x00000800, hex: '0x00000800', name: 'Disarm Ranged', comment: 'Disarm ranged weapon' },
  { value: 0x00001000, hex: '0x00001000', name: 'Regenerate Power', comment: 'Regenerate power' },
  { value: 0x00002000, hex: '0x00002000', name: 'Restrict Party Interaction', comment: 'Restrict party interaction' },
  { value: 0x00004000, hex: '0x00004000', name: 'Prevent Spell Click', comment: 'Prevent spell click' },
  { value: 0x00008000, hex: '0x00008000', name: 'Allow Enemy Interact', comment: 'Allow enemy to interact' },
  { value: 0x00010000, hex: '0x00010000', name: 'Disable Turn', comment: 'Disable turn' },
  { value: 0x00040000, hex: '0x00040000', name: 'Allow Cheat Spells', comment: 'Allow cheat spells' },
];

export const dynamicflags_options: BitmaskOption[] = [
  { value: 0x01, hex: '0x01', name: 'Lootable', comment: 'Lootable' },
  { value: 0x02, hex: '0x02', name: 'Track Unit', comment: 'Tracked by client' },
  { value: 0x04, hex: '0x04', name: 'Tapped', comment: 'Tapped by player' },
  { value: 0x08, hex: '0x08', name: 'Tapped By Player', comment: 'Tapped by current player' },
  { value: 0x10, hex: '0x10', name: 'Special Info', comment: 'Shows special info (trainer window, trainer cost)' },
  { value: 0x20, hex: '0x20', name: 'Dead', comment: 'Makes the creature appear dead' },
  { value: 0x40, hex: '0x40', name: 'Refer A Friend', comment: 'Refer-a-friend' },
  { value: 0x80, hex: '0x80', name: 'Tapped By All Threat List', comment: 'Tapped by all threat list' },
];

export const type_flags_options: BitmaskOption[] = [
  { value: 0x00000001, hex: '0x00000001', name: 'Tameable', comment: 'Makes the mob tameable (must also be a beast)' },
  { value: 0x00000002, hex: '0x00000002', name: 'Ghost Visible', comment: 'Creature is also visible for not alive player' },
  { value: 0x00000004, hex: '0x00000004', name: 'Boss Mob', comment: 'Changes creature\'s visible level to "??" in the creature\'s portrait' },
  { value: 0x00000008, hex: '0x00000008', name: 'Do Not Play Wound Parry Animation' },
  { value: 0x00000010, hex: '0x00000010', name: 'Hide Faction Tooltip' },
  { value: 0x00000080, hex: '0x00000080', name: 'Spell Attackable' },
  { value: 0x00000200, hex: '0x00000200', name: 'Dead Interact', comment: 'Player can interact with the creature if creature is dead' },
  { value: 0x00000400, hex: '0x00000400', name: 'Herb Loot', comment: 'Makes mob herbable' },
  { value: 0x00000800, hex: '0x00000800', name: 'Mining Loot', comment: 'Makes mob minable' },
  { value: 0x00001000, hex: '0x00001000', name: 'Dont Log Death', comment: 'Does not show death message' },
  { value: 0x00002000, hex: '0x00002000', name: 'Mounted Combat Allowed' },
  { value: 0x00008000, hex: '0x00008000', name: 'Can Assist', comment: 'Can aid any player in combat' },
  { value: 0x00010000, hex: '0x00010000', name: 'Is Pet Bar Used' },
  { value: 0x00020000, hex: '0x00020000', name: 'Mask UID' },
  { value: 0x00040000, hex: '0x00040000', name: 'Engineer Loot', comment: 'Makes mob lootable by engineer' },
  { value: 0x00080000, hex: '0x00080000', name: 'Exotic Pet', comment: 'Tamable as an exotic pet (Beast Mastery)' },
  { value: 0x04000000, hex: '0x04000000', name: 'Use Default Collision Box' },
  { value: 0x08000000, hex: '0x08000000', name: 'Is Siege Weapon' },
  { value: 0x10000000, hex: '0x10000000', name: 'Projectile Collision' },
  { value: 0x20000000, hex: '0x20000000', name: 'Hide Name Plate' },
  { value: 0x40000000, hex: '0x40000000', name: 'Do Not Play Mounted Animations' },
  { value: 0x80000000, hex: '0x80000000', name: 'Is Link All' },
];

export const mechanic_immune_mask_options: BitmaskOption[] = [
  { value: 0x00000001, hex: '0x00000001', name: 'Charm' },
  { value: 0x00000002, hex: '0x00000002', name: 'Disoriented' },
  { value: 0x00000004, hex: '0x00000004', name: 'Disarm' },
  { value: 0x00000008, hex: '0x00000008', name: 'Distract' },
  { value: 0x00000010, hex: '0x00000010', name: 'Fear' },
  { value: 0x00000020, hex: '0x00000020', name: 'Grip' },
  { value: 0x00000040, hex: '0x00000040', name: 'Root' },
  { value: 0x00000080, hex: '0x00000080', name: 'Slow Attack' },
  { value: 0x00000100, hex: '0x00000100', name: 'Silence' },
  { value: 0x00000200, hex: '0x00000200', name: 'Sleep' },
  { value: 0x00000400, hex: '0x00000400', name: 'Snare' },
  { value: 0x00000800, hex: '0x00000800', name: 'Stun' },
  { value: 0x00001000, hex: '0x00001000', name: 'Freeze' },
  { value: 0x00002000, hex: '0x00002000', name: 'Knockout' },
  { value: 0x00004000, hex: '0x00004000', name: 'Bleed' },
  { value: 0x00008000, hex: '0x00008000', name: 'Bandage' },
  { value: 0x00010000, hex: '0x00010000', name: 'Polymorph' },
  { value: 0x00020000, hex: '0x00020000', name: 'Banish' },
  { value: 0x00040000, hex: '0x00040000', name: 'Shield' },
  { value: 0x00080000, hex: '0x00080000', name: 'Shackle' },
  { value: 0x00100000, hex: '0x00100000', name: 'Mount' },
  { value: 0x00200000, hex: '0x00200000', name: 'Infected' },
  { value: 0x00400000, hex: '0x00400000', name: 'Turn' },
  { value: 0x00800000, hex: '0x00800000', name: 'Horror' },
  { value: 0x01000000, hex: '0x01000000', name: 'Invulnerability' },
  { value: 0x02000000, hex: '0x02000000', name: 'Interrupt' },
  { value: 0x04000000, hex: '0x04000000', name: 'Daze' },
  { value: 0x08000000, hex: '0x08000000', name: 'Discovery' },
  { value: 0x10000000, hex: '0x10000000', name: 'Immune Shield', comment: 'Divine Shield, Ice Block, Hand of Protection' },
  { value: 0x20000000, hex: '0x20000000', name: 'Sapped' },
  { value: 0x40000000, hex: '0x40000000', name: 'Enraged' },
];

export const spell_school_immune_mask_options: BitmaskOption[] = [
  { value: 0x02, hex: '0x02', name: 'Holy' },
  { value: 0x04, hex: '0x04', name: 'Fire' },
  { value: 0x08, hex: '0x08', name: 'Nature' },
  { value: 0x10, hex: '0x10', name: 'Frost' },
  { value: 0x20, hex: '0x20', name: 'Shadow' },
  { value: 0x40, hex: '0x40', name: 'Arcane' },
];

export const flags_extra_options: BitmaskOption[] = [
  { value: 0x00000001, hex: '0x00000001', name: 'Instance Bind', comment: 'Creature kill binds instance to killer and killer\'s group' },
  { value: 0x00000002, hex: '0x00000002', name: 'Civilian', comment: 'Not aggro (ignore faction/reputation hostility)' },
  { value: 0x00000004, hex: '0x00000004', name: 'No Parry', comment: 'Creature can\'t parry' },
  { value: 0x00000008, hex: '0x00000008', name: 'No Parry Hasten', comment: 'Creature can\'t counter-attack at parry' },
  { value: 0x00000010, hex: '0x00000010', name: 'No Block', comment: 'Creature can\'t block' },
  { value: 0x00000020, hex: '0x00000020', name: 'No Crush', comment: 'Creature can\'t do crush attacks' },
  { value: 0x00000040, hex: '0x00000040', name: 'No XP At Kill', comment: 'Creature kill does not provide XP' },
  { value: 0x00000080, hex: '0x00000080', name: 'Trigger', comment: 'Creature is trigger NPC (invisible to players)' },
  { value: 0x00000100, hex: '0x00000100', name: 'No Taunt', comment: 'Creature is immune to taunt auras and taunt effect' },
  { value: 0x00000400, hex: '0x00000400', name: 'World Event', comment: 'Creature is part of a world event' },
  { value: 0x00000800, hex: '0x00000800', name: 'Guard', comment: 'Creature is a guard' },
  { value: 0x00004000, hex: '0x00004000', name: 'No Crit', comment: 'Creature can\'t do critical strikes' },
  { value: 0x00008000, hex: '0x00008000', name: 'No Skillgain', comment: 'Creature won\'t increase weapon skills' },
  { value: 0x00010000, hex: '0x00010000', name: 'Taunt Diminish', comment: 'Taunt is a subject to diminishing returns on this creature' },
  { value: 0x00020000, hex: '0x00020000', name: 'All Diminish', comment: 'All diminishing returns apply on this creature' },
  { value: 0x00080000, hex: '0x00080000', name: 'Dungeon Boss', comment: 'Creature is a dungeon boss' },
  { value: 0x20000000, hex: '0x20000000', name: 'Immunity Knockback', comment: 'Creature is immune to knockback effects' },
];

export const movement_type_options: BitmaskOption[] = [
  { value: 0, hex: '0x0', name: 'Idle', comment: 'No movement' },
  { value: 1, hex: '0x1', name: 'Random', comment: 'Random movement within wander_distance' },
  { value: 2, hex: '0x2', name: 'Waypoint', comment: 'Waypoint movement' },
];

export const spawn_mask_options: BitmaskOption[] = [
  { value: 1, hex: '0x1', name: '10 Player Normal', comment: '10 player normal difficulty' },
  { value: 2, hex: '0x2', name: '25 Player Normal', comment: '25 player normal difficulty' },
  { value: 4, hex: '0x4', name: '10 Player Heroic', comment: '10 player heroic difficulty' },
  { value: 8, hex: '0x8', name: '25 Player Heroic', comment: '25 player heroic difficulty' },
  { value: 15, hex: '0x0F', name: 'All phases', comment: 'Spawn in all phases of the map' },
];

export const group_AI_options: SelectOption[] = [
    { value: 0, name: 'No assist', comment: 'No group AI' },
    { value: 1, name: 'Assist lead only', comment: 'Only assist the leader' },
    { value: 2, name: 'Everyone assist', comment: 'Everyone assists all group members' },
    { value: 3, name: 'No leader follow', comment: 'Don\'t follow the leader' },
    { value: 512, name: 'Passive leader follow', comment: 'Leader follows without assisting' },
    { value: 515, name: 'Leader follow', comment: 'Everyone assists and follows the leader' },
]

export const stand_state_types: SelectOption[] = [
  { value: 1, name: 'Sit', comment: 'Sitting down' },
  { value: 3, name: 'Sleep', comment: 'Sleeping' },
  { value: 7, name: 'Dead', comment: 'Dead/Feign Death' },
  { value: 8, name: 'Kneel', comment: 'Kneeling' },
  { value: 9, name: 'Submerged', comment: 'Submerged in water' },
];

export const anim_tier_types: SelectOption[] = [
  { value: 0, name: 'Ground', comment: 'Ground level' },
  { value: 1, name: 'Swim', comment: 'Swimming' },
  { value: 2, name: 'Hover', comment: 'Hovering' },
  { value: 3, name: 'Fly', comment: 'Flying' },
  { value: 4, name: 'Submerged', comment: 'Submerged in water' },
];

export const visibility_distance_options: SelectOption[] = [
  { value: 0, name: 'Normal', comment: '100m' },
  { value: 1, name: 'Tiny', comment: '25m' },
  { value: 2, name: 'Small', comment: '50m' },
  { value: 3, name: 'Large', comment: '200m' },
  { value: 4, name: 'Gigantic', comment: '400m' },
  { value: 5, name: 'Infinite', comment: '∞' },
];

export const sheath_state_types: SelectOption[] = [
  { value: 0, name: 'Unarmed', comment: 'No weapon sheathed' },
  { value: 1, name: 'Melee', comment: 'Melee weapon sheathed' },
  { value: 2, name: 'Ranged', comment: 'Ranged weapon sheathed' },
];

export const spell_school_types: SelectOption[] = [
  { value: 1, name: 'Holy', comment: 'Holy magic' },
  { value: 2, name: 'Fire', comment: 'Fire magic' },
  { value: 3, name: 'Nature', comment: 'Nature magic' },
  { value: 4, name: 'Frost', comment: 'Frost magic' },
  { value: 5, name: 'Shadow', comment: 'Shadow magic' },
  { value: 6, name: 'Arcane', comment: 'Arcane magic' },
];

export const vis_flags_options: BitmaskOption[] = [
  { value: 2, hex: '0x02', name: 'Unit Vis Flags Creep' },
  { value: 4, hex: '0x04', name: 'Unit Vis Flags Untrackable' },
];

export const pvp_flags_options: BitmaskOption[] = [
  { value: 0x01, hex: '0x01', name: 'Unit Byte2 Flag PVP' },
  { value: 0x02, hex: '0x02', name: 'Unit Byte2 Flag Unk 1' },
  { value: 0x04, hex: '0x04', name: 'Unit Byte2 Flag FFA PVP' },
  { value: 0x08, hex: '0x08', name: 'Unit Byte2 Flag Sanctuary' },
  { value: 0x10, hex: '0x10', name: 'Unit Byte2 Flag Unk 4' },
  { value: 0x20, hex: '0x20', name: 'Unit Byte2 Flag Unk 5' },
  { value: 0x40, hex: '0x40', name: 'Unit Byte2 Flag Unk 6' },
  { value: 0x80, hex: '0x80', name: 'Unit Byte2 Flag Unk 7' },
];

export const summoner_types: SelectOption[] = [
    { value: 0, name: 'Creature', comment: 'Summonned by a creature' },
    { value: 1, name: 'GameObject', comment: 'Summoned by a game object' },
    { value: 2, name: 'Map', comment: 'Summoned by a map' },
]

export const summon_type: SelectOption[] = [
    { value: 1, name: 'Timed Or Dead Despawn', comment: 'Despawns after a specified time OR when the creature disappears' },
    { value: 2, name: 'Timed Or Corpse Despawn', comment: 'Despawns after a specified time OR when the creature dies' },
    { value: 3, name: 'Timed Despawn', comment: 'Despawns after a specified time' },
    { value: 4, name: 'Timed Despawn Out Of Combat', comment: 'Despawns after a specified time after the creature is out of combat' },
    { value: 5, name: 'Corpse Despawn', comment: 'Despawns instantly after death' },
    { value: 6, name: 'Corpse Timed Despawn', comment: 'Despawns after a specified time after death' },
    { value: 7, name: 'Dead Despawn', comment: 'Despawns when the creature disappears' },
    { value: 8, name: 'Manual Despawn', comment: 'Despawns when UnSummon() is called' },
]

export const loot_mode: BitmaskOption[] = [
    { value: 0, hex: '0x0001', name: 'Default', comment: 'Use default loot mode' },
    { value: 1, hex: '0x0002', name: 'Hard Mode 1', comment: '' },
    { value: 2, hex: '0x0004', name: 'Hard Mode 2', comment: '' },
    { value: 3, hex: '0x0008', name: 'Hard Mode 3', comment: '' },
    { value: 16, hex: '0x0010', name: 'Hard Mode 4', comment: '' },
    { value: 2048, hex: '0x8000', name: 'Junk Fish', comment: '' }
]

export const difficulty_entry_options: SelectOption[] = [
    { value: 1, name: 'Default', comment: 'Use for Heroic Dungeon ou 25 player normal difficulty' },
    { value: 2, name: '10 Heroic', comment: '10 player heroic difficulty' },
    { value: 3, name: '25 Heroic', comment: '25 player heroic difficulty' }
]

export const icon_name: SelectOption[] = [
    { value: 'Directions', name: 'Directions', comment: 'Used for Guards and Teleporter NPC\'s.' },
    { value: 'Gunner', name: 'Gunner', comment: 'Indicator of a Turret NPC/Player Controlled.' },
    { value: 'vehichleCursor', name: 'vehichleCursor', comment: 'Indicator that this is a PCV (Player Controlled Vehicle)' },
    { value: 'Driver', name: 'Driver', comment: 'Shows a Steering Wheel icon when mouse over.' },
    { value: 'Attack', name: 'Attack', comment: 'Shows a Sword icon indicating you can attack this target.' },
    { value: 'Buy', name: 'Buy', comment: 'Shows a Brown Bag icon usually if the NPC only sells things.' },
    { value: 'Speak', name: 'Speak', comment: 'Shows a Chat Bubble icon if this NPC has Quest/Gossip options.' },
    { value: 'Pickup', name: 'Pickup', comment: 'Shows a Hand Grasping icon if this NPC can be picked up for quest/items.' },
    { value: 'Interact', name: 'Interact', comment: 'Shows Cog icon commonly used for quest/transport.' },
    { value: 'Trainer', name: 'Trainer', comment: 'Shows a Book icon, identifying this NPC as a "Trainer".' },
    { value: 'Taxi', name: 'Taxi', comment: 'Shows a Boot w/Wings icon identifying this NPC as a "Taxi".' },
    { value: 'Repair', name: 'Repair', comment: 'Shows a Anvil icon identifying this npc as a Repair NPC.' },
    { value: 'LootAll', name: 'LootAll', comment: 'Shows a Multiple Brown Bag icon (Same as holding Shift before looting a creature).' },
    { value: 'Quest', name: 'Quest', comment: 'Unused or Unknown. (See EntryID 32870 The Real Ronakada).' },
    { value: 'PVP', name: 'PVP', comment: 'Unused or Unknown. (See EntryID 29387 Arena Master: Dalaran Arena).' },
    { value: 'Point', name: 'Point', comment: '' },
]

export const rank_options: SelectOption[] = [
    { value: 0, name: 'Normal', comment: 'Normal creature' },
    { value: 1, name: 'Elite', comment: 'Elite creature' },
    { value: 2, name: 'Rare Elite', comment: 'Rare Elite creature' },
    { value: 3, name: 'Boss', comment: 'Boss creature' },
    { value: 4, name: 'Rare', comment: 'Rare creature' },
    { value: 5, name: 'Trivial', comment: '' },
];

export const dmg_school_options: SelectOption[] = [
    { value: 0, name: 'Normal', comment: 'Physical damage' },
    { value: 1, name: 'Holy', comment: 'Holy damage' },
    { value: 2, name: 'Fire', comment: 'Fire damage' },
    { value: 3, name: 'Nature', comment: 'Nature damage' },
    { value: 4, name: 'Frost', comment: 'Frost damage' },
    { value: 5, name: 'Shadow', comment: 'Shadow damage' },
    { value: 6, name: 'Arcane', comment: 'Arcane damage' },
];

export const unit_class_options: SelectOption[] = [
    { value: 1, name: 'Warrior', comment: 'Health only (equal to Rogue)' },
    { value: 2, name: 'Paladin', comment: 'Health & Mana (more health than Mage but less mana)' },
    { value: 4, name: 'Rogue', comment: 'Health only (equal to Warrior)' },
    { value: 8, name: 'Mage', comment: 'Health & Mana (less health than Paladin but more mana)' },
];

export const family_options: SelectOption[] = [
    { value: 1, name: 'Wolf', comment: '' },
    { value: 2, name: 'Cat', comment: '' },
    { value: 3, name: 'Spider', comment: '' },
    { value: 4, name: 'Bear', comment: '' },
    { value: 5, name: 'Boar', comment: '' },
    { value: 6, name: 'Crocolisk', comment: '' },
    { value: 7, name: 'Carrion Bird', comment: '' },
    { value: 8, name: 'Crab', comment: '' },
    { value: 9, name: 'Gorilla', comment: '' },
    { value: 11, name: 'Raptor', comment: '' },
    { value: 12, name: 'Tallstrider', comment: '' },
    { value: 15, name: 'Felhunter', comment: '' },
    { value: 16, name: 'Voidwalker', comment: '' },
    { value: 17, name: 'Succubus', comment: '' },
    { value: 19, name: 'Doomguard', comment: '' },
    { value: 20, name: 'Scorpid', comment: '' },
    { value: 21, name: 'Turtle', comment: '' },
    { value: 23, name: 'Imp', comment: '' },
    { value: 24, name: 'Bat', comment: '' },
    { value: 25, name: 'Hyena', comment: '' },
    { value: 26, name: 'Owl', comment: '' },
    { value: 27, name: 'Wind Serpent', comment: '' },
    { value: 28, name: 'Remote Control', comment: '' },
    { value: 29, name: 'Felguard', comment: '' },
    { value: 30, name: 'Dragonhawk', comment: '' },
    { value: 31, name: 'Ravager', comment: '' },
    { value: 32, name: 'Warp Stalker', comment: '' },
    { value: 33, name: 'Sporebat', comment: '' },
    { value: 34, name: 'Nether Ray', comment: '' },
    { value: 35, name: 'Serpent', comment: '' },
    { value: 37, name: 'Moth', comment: '' },
    { value: 38, name: 'Chimaera', comment: '' },
    { value: 39, name: 'Devilsaur', comment: '' },
    { value: 40, name: 'Ghoul', comment: '' },
    { value: 41, name: 'Silithid', comment: '' },
    { value: 42, name: 'Worm', comment: '' },
    { value: 43, name: 'Rhino', comment: '' },
    { value: 44, name: 'Wasp', comment: '' },
    { value: 45, name: 'Core Hound', comment: '' },
    { value: 46, name: 'Spirit Beast', comment: '' },
];

export const type_options: SelectOption[] = [
    { value: 0, name: 'None', comment: '' },
    { value: 1, name: 'Beast', comment: '' },
    { value: 2, name: 'Dragonkin', comment: '' },
    { value: 3, name: 'Demon', comment: '' },
    { value: 4, name: 'Elemental', comment: '' },
    { value: 5, name: 'Giant', comment: '' },
    { value: 6, name: 'Undead', comment: '' },
    { value: 7, name: 'Humanoid', comment: '' },
    { value: 8, name: 'Critter', comment: '' },
    { value: 9, name: 'Mechanical', comment: '' },
    { value: 10, name: 'Not specified', comment: '' },
    { value: 11, name: 'Totem', comment: '' },
    { value: 12, name: 'Non-Combat Pet', comment: '' },
    { value: 13, name: 'Gas Cloud', comment: '' },
    { value: 14, name: 'Wild Pet', comment: '' },
    { value: 15, name: 'Aberration', comment: '' },
];

export const ground_movement_options: SelectOption[] = [
  { value: 0, name: 'None', comment: 'No ground movement' },
  { value: 1, name: 'Run', comment: 'Can run on ground' },
  { value: 2, name: 'Hover', comment: 'Hovers above ground' },
];

export const swim_movement_options: SelectOption[] = [
  { value: 0, name: 'None', comment: 'Cannot swim' },
  { value: 1, name: 'Swim', comment: 'Can swim' },
];

export const flight_movement_options: SelectOption[] = [
  { value: 0, name: 'None', comment: 'No flight' },
  { value: 1, name: 'Disable Gravity', comment: 'Disables gravity effect' },
  { value: 2, name: 'Can Fly', comment: 'Can fly (Deprecated: Use Disable Gravity instead)' },
];

export const rooted_options: SelectOption[] = [
  { value: 0, name: 'None', comment: 'Not rooted' },
  { value: 1, name: 'Rooted', comment: 'Rooted in place' },
];

export const chase_movement_options: SelectOption[] = [
  { value: 0, name: 'Run', comment: 'Runs when chasing' },
  { value: 1, name: 'Can Walk', comment: 'Can walk when chasing' },
  { value: 2, name: 'Always Walk', comment: 'Always walks when chasing' },
];

export const random_movement_options: SelectOption[] = [
  { value: 0, name: 'Walk', comment: 'Walks when moving randomly' },
  { value: 1, name: 'Can Run', comment: 'Can run when moving randomly' },
  { value: 2, name: 'Always Run', comment: 'Always runs when moving randomly' },
];

export const equipment_id_options: SelectOption[] = [
    { value: 0, name: 'None', comment: 'No equipment' },
];

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
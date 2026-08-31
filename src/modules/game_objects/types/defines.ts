import type { BitmaskOption } from '@core/types/common'
import type { SelectOption } from '@core/types/common'

export const spawn_mask_options: BitmaskOption[] = [
  { value: 1,  hex: '0x01', name: '10 Player Normal',  comment: '10 player normal difficulty' },
  { value: 2,  hex: '0x02', name: '25 Player Normal',  comment: '25 player normal difficulty' },
  { value: 4,  hex: '0x04', name: '10 Player Heroic',  comment: '10 player heroic difficulty' },
  { value: 8,  hex: '0x08', name: '25 Player Heroic',  comment: '25 player heroic difficulty' },
  { value: 15, hex: '0x0F', name: 'All difficulties',  comment: 'Spawn in all difficulties' },
]

export const go_flag_options: BitmaskOption[] = [
  { value: 1,    hex: '0x001', name: 'In use',            comment: 'Disables interaction while being animated' },
  { value: 2,    hex: '0x002', name: 'Locked',            comment: 'Requires a key, spell, or event to open' },
  { value: 4,    hex: '0x004', name: 'Interact cond',     comment: 'Untargetable, requires GO_DYNFLAG_LO_ACTIVATE to enable interaction' },
  { value: 8,    hex: '0x008', name: 'Transport',         comment: 'Can transport (boat, elevator, car)' },
  { value: 16,   hex: '0x010', name: 'Not selectable',    comment: 'Not selectable, even in GM-mode' },
  { value: 32,   hex: '0x020', name: 'No despawn',        comment: 'Never despawns (doors, on/off state objects)' },
  { value: 64,   hex: '0x040', name: 'AI obstacle',       comment: 'Registers object in AIObstacleMgr' },
  { value: 128,  hex: '0x080', name: 'Freeze animation',  comment: '' },
  { value: 512,  hex: '0x200', name: 'Damaged',           comment: 'Gameobject has been siege damaged' },
  { value: 1024, hex: '0x400', name: 'Destroyed',         comment: 'Gameobject has been destroyed' },
]

export const invisibility_type_options: SelectOption[] = [
  { value: 0, name: 'General',  comment: 'General invisibility' },
  { value: 3, name: 'Trap',     comment: 'Trap invisibility' },
  { value: 6, name: 'Drunk',    comment: 'Drunk invisibility' },
]

export const game_object_type_options: SelectOption[] = [
  { value: 0,  name: 'Door' },
  { value: 1,  name: 'Button' },
  { value: 2,  name: 'Quest giver' },
  { value: 3,  name: 'Chest' },
  { value: 4,  name: 'Binder' },
  { value: 5,  name: 'Generic' },
  { value: 6,  name: 'Trap' },
  { value: 7,  name: 'Chair' },
  { value: 8,  name: 'Spell focus' },
  { value: 9,  name: 'Text' },
  { value: 10, name: 'Goober' },
  { value: 11, name: 'Transport' },
  { value: 12, name: 'Area damage' },
  { value: 13, name: 'Camera' },
  { value: 14, name: 'Map object' },
  { value: 15, name: 'MO transport' },
  { value: 16, name: 'Duel arbiter' },
  { value: 17, name: 'Fishing node' },
  { value: 18, name: 'Summoning ritual' },
  { value: 19, name: 'Mailbox' },
  { value: 20, name: 'Do not use' },
  { value: 21, name: 'Guard post' },
  { value: 22, name: 'Spell caster' },
  { value: 23, name: 'Meeting stone' },
  { value: 24, name: 'Flag stand' },
  { value: 25, name: 'Fishing hole' },
  { value: 26, name: 'Flag drop' },
  { value: 27, name: 'Mini game' },
  { value: 28, name: 'Do not use 2' },
  { value: 29, name: 'Control zone' },
  { value: 30, name: 'Aura generator' },
  { value: 31, name: 'Dungeon difficulty' },
  { value: 32, name: 'Barber chair' },
  { value: 33, name: 'Destructible building' },
  { value: 34, name: 'Guild bank' },
  { value: 35, name: 'Trap door' },
];

import type { BitmaskOption } from '@core/types/common'

export interface CreatureFormations {
  leaderGUID: number;
  memberGUID: number;
  dist: number;
  angle: number;
  groupAI: number;
  point_1: number;
  point_2: number;
}

/** A formation row joined with the spawn it points at (name/entry/map may be
    missing when the referenced spawn no longer exists). */
export interface CreatureFormationMember extends CreatureFormations {
  entry: number | null;
  name: string | null;
  map: number | null;
}

/** One row of the formation list. */
export interface CreatureFormationGroup {
  leaderGUID: number;
  memberCount: number;
  entry: number | null;
  name: string | null;
  map: number | null;
}

/** A spawn offered by the "add member" picker. `leaderGUID` is set when the
    spawn already belongs to a formation. */
export interface CreatureSpawnOption {
  guid: number;
  id: number;
  map: number;
  name: string | null;
  leaderGUID: number | null;
}

/** GroupAiFlags — AzerothCore, src/server/game/Entities/Creature/CreatureGroups.h */
export const formation_group_ai_options: BitmaskOption[] = [
  { value: 0x001, hex: '0x00000001', name: 'Member Assists Leader', comment: 'Members join the fight when the leader is attacked.' },
  { value: 0x002, hex: '0x00000002', name: 'Leader Assists Member', comment: 'The leader joins the fight when a member is attacked.' },
  { value: 0x004, hex: '0x00000004', name: 'Evade Together', comment: 'Every member evades if any member enters evade mode.' },
  { value: 0x008, hex: '0x00000008', name: 'Respawn On Evade', comment: 'Every member respawns if a member enters evade mode.' },
  { value: 0x010, hex: '0x00000010', name: "Don't Respawn Leader On Evade", comment: 'Used with "Respawn On Evade" to keep the leader from respawning.' },
  { value: 0x200, hex: '0x00000200', name: 'Follow Leader', comment: 'Members hold the formation while idle instead of standing on their own spawn point.' },
]

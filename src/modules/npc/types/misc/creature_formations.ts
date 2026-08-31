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

/** GroupAIFlags — TrinityCore, src/server/game/Entities/Creature/CreatureGroups.h */
export const formation_group_ai_options: BitmaskOption[] = [
  { value: 0x001, hex: '0x00000001', name: 'Members Assist Leader', comment: 'Members join the fight when the leader is attacked.' },
  { value: 0x002, hex: '0x00000002', name: 'Leader Assists Member', comment: 'The leader joins the fight when a member is attacked.' },
  { value: 0x200, hex: '0x00000200', name: 'Idle In Formation', comment: 'Members hold the formation while idle instead of standing on their own spawn point.' },
]

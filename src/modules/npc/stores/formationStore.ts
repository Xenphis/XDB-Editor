import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { CreatureFormationGroup, CreatureFormationMember } from '@/modules/npc/types/misc/creature_formations'
import type { CompositeKeyConfig } from '@core/composables/useQueryGenerator'
import { ArraySubTable } from '@core/stores/SubTableManager'
import { createEntityEditorStore } from '@core/stores/createEntityEditorStore'
import * as npcService from '@/modules/npc/service'

/**
 * One `creature_formations` row, plus the joined spawn identity used for
 * display only (`name` / `entry` are never written back).
 */
export interface FormationMemberEntry {
  memberGUID: number
  dist: number
  angle: number
  groupAI: number
  point_1: number
  point_2: number
  name: string | null
  entry: number | null
}

/**
 * Every row of the formation — the leader's own row included — is managed by
 * this sub-table. The leader row is a normal row of the same table
 * (`memberGUID = leaderGUID`), so routing it through the composite diff keeps
 * insert / update / delete uniform instead of special-casing it.
 */
const memberConfig: Omit<CompositeKeyConfig<FormationMemberEntry>, 'parentId'> = {
  table: 'creature_formations',
  parentKey: 'leaderGUID',
  childKey: 'memberGUID',
  columns: ['dist', 'angle', 'groupAI', 'point_1', 'point_2'],
  isEqual: (a, b) =>
    a.dist === b.dist &&
    a.angle === b.angle &&
    a.groupAI === b.groupAI &&
    a.point_1 === b.point_1 &&
    a.point_2 === b.point_2,
  toSqlValues: (e) => [e.dist, e.angle, e.groupAI, e.point_1, e.point_2],
}

/** The main "entity" carries nothing but the key: all columns live in rows. */
interface FormationKey {
  leaderGUID: number
}

function createDefaultForm(): FormationKey {
  return { leaderGUID: 0 }
}

export function createMemberEntry(memberGUID: number, template: Partial<FormationMemberEntry> = {}): FormationMemberEntry {
  return {
    memberGUID,
    dist: 0,
    angle: 0,
    groupAI: 0,
    point_1: 0,
    point_2: 0,
    name: null,
    entry: null,
    ...template,
  }
}

export const useFormationStore = defineStore('creatureFormation', () => {
  // --- List state ---
  const groups = ref<CreatureFormationGroup[]>([])
  const loading = ref(false)
  const listLoaded = ref(false)

  /** Map of the leader spawn — scopes the "add member" spawn search. */
  const leaderMap = ref<number | null>(null)

  const members = new ArraySubTable<FormationMemberEntry>({
    tableName: 'creature_formations',
    compositeConfig: memberConfig,
    fieldPrefix: 'member',
    summarize: (e) => `dist ${e.dist}, angle ${e.angle}°, groupAI ${e.groupAI}`,
  })

  const editor = createEntityEditorStore<FormationKey>({
    tableName: 'creature_formations',
    primaryKey: 'leaderGUID',
    createDefault: createDefaultForm,
    load: async (leaderGuid) => ({ leaderGUID: leaderGuid }),
    delete: npcService.deleteCreatureFormation,
    subTables: [
      {
        manager: members,
        load: async (leaderGuid) => {
          const rows = await npcService.getCreatureFormation(leaderGuid).catch(() => [] as CreatureFormationMember[])
          leaderMap.value = rows.find(r => r.memberGUID === leaderGuid)?.map ?? rows[0]?.map ?? null
          return rows.map(row => createMemberEntry(row.memberGUID, {
            dist: row.dist,
            angle: row.angle,
            groupAI: row.groupAI,
            point_1: row.point_1,
            point_2: row.point_2,
            name: row.name,
            entry: row.entry,
          }))
        },
      },
    ],
  })

  /** Leader row first, then members by GUID. */
  const orderedMembers = computed<FormationMemberEntry[]>(() => {
    const leaderGuid = editor.formData.leaderGUID
    return [...members.newEntries.value].sort((a, b) => {
      if (a.memberGUID === leaderGuid) return -1
      if (b.memberGUID === leaderGuid) return 1
      return a.memberGUID - b.memberGUID
    })
  })

  const leaderRow = computed<FormationMemberEntry | undefined>(() =>
    members.newEntries.value.find(m => m.memberGUID === editor.formData.leaderGUID))

  function addMember(entry: FormationMemberEntry) {
    members.pushNewEntry(entry)
  }

  /**
   * TrinityCore expects the leader to own a row of its formation
   * (`memberGUID = leaderGUID`, dist/angle forced to 0). Seed it as a pending
   * change when it is missing — either because the formation is being created,
   * or because the existing data is malformed.
   */
  async function ensureLeaderRow(leaderGuid: number) {
    if (members.newEntries.value.some(m => m.memberGUID === leaderGuid)) return
    const spawn = await npcService.searchCreatureSpawns(String(leaderGuid), null, 1).catch(() => [])
    const leaderSpawn = spawn.find(s => s.guid === leaderGuid)
    leaderMap.value = leaderSpawn?.map ?? leaderMap.value
    members.pushNewEntry(createMemberEntry(leaderGuid, {
      name: leaderSpawn?.name ?? null,
      entry: leaderSpawn?.id ?? null,
    }))
  }

  function removeMember(memberGUID: number) {
    const index = members.newEntries.value.findIndex(m => m.memberGUID === memberGUID)
    if (index >= 0) {
      members.removeNewEntry(index)
    }
  }

  /** Copies the leader's groupAI onto every member — the core reads the flags
      per row, but a group with mismatched flags behaves inconsistently. */
  function applyGroupAIToAll(groupAI: number) {
    for (const member of members.newEntries.value) {
      member.groupAI = groupAI
    }
  }

  // --- List actions ---
  function setGroups(data: CreatureFormationGroup[]) {
    groups.value = data
  }

  function markListLoaded() {
    listLoaded.value = true
  }

  return {
    // list
    groups,
    loading,
    listLoaded,
    leaderMap,
    // sub-table
    members,
    orderedMembers,
    leaderRow,
    ...editor,
    // actions
    addMember,
    ensureLeaderRow,
    removeMember,
    applyGroupAIToAll,
    setGroups,
    markListLoaded,
  }
})

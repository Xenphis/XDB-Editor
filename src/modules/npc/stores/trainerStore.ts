import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Trainer } from '@/modules/npc/types/trainer/trainer'
import type { CompositeKeyConfig } from '@core/composables/useQueryGenerator'
import { ArraySubTable } from '@core/stores/SubTableManager'
import { createEntityEditorStore } from '@core/stores/createEntityEditorStore'
import * as npcService from '@/modules/npc/service'

// ─── TrainerSpellEntry (store-side, no TrainerId needed) ─────────────────────

export interface TrainerSpellEntry {
  SpellId: number
  MoneyCost: number
  ReqSkillLine: number
  ReqSkillRank: number
  ReqAbility1: number
  ReqAbility2: number
  ReqAbility3: number
  ReqLevel: number
}

export interface CreatureDefaultTrainerEntry {
  CreatureId: number
}

// ─── Composite key config for trainer_spell ──────────────────────────────────

const trainerSpellConfig: Omit<CompositeKeyConfig<TrainerSpellEntry>, 'parentId'> = {
  table: 'trainer_spell',
  parentKey: 'TrainerId',
  childKey: 'SpellId',
  columns: ['MoneyCost', 'ReqSkillLine', 'ReqSkillRank', 'ReqAbility1', 'ReqAbility2', 'ReqAbility3', 'ReqLevel', 'VerifiedBuild'],
  isEqual: (a, b) =>
    a.MoneyCost === b.MoneyCost &&
    a.ReqSkillLine === b.ReqSkillLine &&
    a.ReqSkillRank === b.ReqSkillRank &&
    a.ReqAbility1 === b.ReqAbility1 &&
    a.ReqAbility2 === b.ReqAbility2 &&
    a.ReqAbility3 === b.ReqAbility3 &&
    a.ReqLevel === b.ReqLevel,
  toSqlValues: (e) => [e.MoneyCost, e.ReqSkillLine, e.ReqSkillRank, e.ReqAbility1, e.ReqAbility2, e.ReqAbility3, e.ReqLevel, 0],
}

// ─── Default factory ─────────────────────────────────────────────────────────

function createDefaultForm(): Trainer {
  return {
    Id: 0,
    Type: 2,
    Requirement: 0,
    Greeting: null,
    VerifiedBuild: null,
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useTrainerStore = defineStore('trainer', () => {
  // --- List state ---
  const trainers = ref<Trainer[]>([])
  const loading = ref(false)
  const listLoaded = ref(false)

  // --- Sub-table: trainer_spell ---
  const spells = new ArraySubTable<TrainerSpellEntry>({
    tableName: 'trainer_spell',
    compositeConfig: trainerSpellConfig,
    fieldPrefix: 'trainer_spell',
    summarize: (e) => String(e.SpellId),
  })

  // --- Sub-table: creature_default_trainer ---
  const creatureLinks = new ArraySubTable<CreatureDefaultTrainerEntry>({
    tableName: 'creature_default_trainer',
    compositeConfig: {
      table: 'creature_default_trainer',
      parentKey: 'TrainerId',
      childKey: 'CreatureId',
      columns: [],
      isEqual: () => true,
      toSqlValues: () => [],
    },
    fieldPrefix: 'creature_default_trainer',
    summarize: (e) => String(e.CreatureId),
  })

  const editor = createEntityEditorStore<Trainer>({
    tableName: 'trainer',
    primaryKey: 'Id',
    createDefault: createDefaultForm,
    load: npcService.getTrainer,
    delete: npcService.deleteTrainer,
    subTables: [
      {
        manager: spells,
        load: async (id) => {
          const rows = await npcService.getTrainerSpells(id).catch(() => [])
          return rows.map(row => ({
            SpellId: row.SpellId,
            MoneyCost: row.MoneyCost,
            ReqSkillLine: row.ReqSkillLine,
            ReqSkillRank: row.ReqSkillRank,
            ReqAbility1: row.ReqAbility1,
            ReqAbility2: row.ReqAbility2,
            ReqAbility3: row.ReqAbility3,
            ReqLevel: row.ReqLevel,
          })) satisfies TrainerSpellEntry[]
        },
      },
      {
        manager: creatureLinks,
        load: async (id) => {
          const rows = await npcService.getCreatureDefaultTrainers(id).catch(() => [])
          return rows.map(row => ({ CreatureId: row.CreatureId })) satisfies CreatureDefaultTrainerEntry[]
        },
      },
    ],
  })

  // --- List actions ---
  function setTrainers(data: Trainer[]) {
    trainers.value = data
  }

  function markListLoaded() {
    listLoaded.value = true
  }

  return {
    // list
    trainers,
    loading,
    listLoaded,
    // sub-tables
    spells,
    creatureLinks,
    ...editor,
    // actions
    setTrainers,
    markListLoaded,
  }
})

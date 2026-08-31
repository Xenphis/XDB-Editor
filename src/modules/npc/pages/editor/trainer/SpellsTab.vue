<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import EditableDataTable, { type ColumnDef } from '@core/components/EditableDataTable.vue'
import { useTrainerStore, type TrainerSpellEntry } from '@/modules/npc/stores/trainerStore'
import { computed } from 'vue'

const { t } = useI18n()
const store = useTrainerStore()

const spellEntries = computed(() => store.spells.getNewEntries())
const spellHasChanges = computed(() => store.spells.getSqlDiff(store.formData.Id).length > 0)

const spellColumns: ColumnDef[] = [
  { field: 'SpellId', header: t('trainer.spell.spellId'), type: 'number', width: '9rem' },
  { field: 'MoneyCost', header: t('trainer.spell.moneyCost'), type: 'number', width: '10rem' },
  { field: 'ReqLevel', header: t('trainer.spell.reqLevel'), type: 'number', width: '9rem' },
  { field: 'ReqSkillLine', header: t('trainer.spell.reqSkillLine'), type: 'number', width: '11rem' },
  { field: 'ReqSkillRank', header: t('trainer.spell.reqSkillRank'), type: 'number', width: '11rem' },
  { field: 'ReqAbility1', header: t('trainer.spell.reqAbility1'), type: 'number', width: '10rem' },
  { field: 'ReqAbility2', header: t('trainer.spell.reqAbility2'), type: 'number', width: '10rem' },
  { field: 'ReqAbility3', header: t('trainer.spell.reqAbility3'), type: 'number', width: '10rem' },
]

function createDefaultSpell(): TrainerSpellEntry {
  return {
    SpellId: 0,
    MoneyCost: 0,
    ReqSkillLine: 0,
    ReqSkillRank: 0,
    ReqAbility1: 0,
    ReqAbility2: 0,
    ReqAbility3: 0,
    ReqLevel: 0,
  }
}

function addSpell() {
  store.spells.pushNewEntry(createDefaultSpell())
}

function removeSpell(index: number) {
  store.spells.removeNewEntry(index)
}
</script>

<template>
  <div class="field-group" :class="{ 'field-group-modified': spellHasChanges }">
    <EditableDataTable
      :entries="spellEntries"
      :columns="spellColumns"
      :hasChanges="spellHasChanges"
      :title="t('trainer.groups.spells')"
      :description="t('trainer.groups.spellsDesc')"
      dataKey="SpellId"
      embedded
      @add="addSpell"
      @remove="removeSpell"
    />
  </div>
</template>

<style scoped>
@import '../npc-editor.css';
</style>

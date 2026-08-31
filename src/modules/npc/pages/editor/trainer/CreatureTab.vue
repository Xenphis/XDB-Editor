<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import EditableDataTable, { type ColumnDef } from '@core/components/EditableDataTable.vue'
import { useTrainerStore, type CreatureDefaultTrainerEntry } from '@/modules/npc/stores/trainerStore'

const { t } = useI18n()
const store = useTrainerStore()

const creatureEntries = computed(() => store.creatureLinks.getNewEntries())
const creatureHasChanges = computed(() => store.creatureLinks.getSqlDiff(store.formData.Id).length > 0)

const creatureColumns: ColumnDef[] = [
  { field: 'CreatureId', header: t('trainer.creature.creatureId'), type: 'number', width: '12rem' },
]

function addCreature() {
  store.creatureLinks.pushNewEntry({ CreatureId: 0 } as CreatureDefaultTrainerEntry)
}

function removeCreature(index: number) {
  store.creatureLinks.removeNewEntry(index)
}
</script>

<template>
  <div class="field-group" :class="{ 'field-group-modified': creatureHasChanges }">
    <EditableDataTable
      :entries="creatureEntries"
      :columns="creatureColumns"
      :hasChanges="creatureHasChanges"
      :title="t('trainer.groups.creatures')"
      :description="t('trainer.groups.creaturesDesc')"
      dataKey="CreatureId"
      embedded
      @add="addCreature"
      @remove="removeCreature"
    />
  </div>
</template>

<style scoped>
@import '../npc-editor.css';
</style>

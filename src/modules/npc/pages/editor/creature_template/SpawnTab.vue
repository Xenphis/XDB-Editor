<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Column from 'primevue/column'
import StyledDataTable from '@core/components/StyledDataTable.vue'
import ActionsColumn from '@core/components/ActionsColumn.vue'
import type { Creature } from '@/modules/npc/types/creature/creature'

const { t } = useI18n()
const router = useRouter()

const props = defineProps<{
  spawns: Creature[]
}>()

const emit = defineEmits<{
  (e: 'edit', spawn: Creature): void
  (e: 'delete', spawn: Creature): void
}>()

/** Toolbar button: jumps to the first spawn (there's no multi-marker view). */
function viewFirstOnMap() {
  const spawn = props.spawns[0]
  if (spawn) viewOnMap(spawn)
}

/** Opens the World Editor (local module) flown to and marking this spawn. */
function viewOnMap(spawn: Creature) {
  void router.push({
    name: 'map-editor',
    query: {
      focusMap: String(spawn.map),
      focusX: String(spawn.position_x),
      focusY: String(spawn.position_y),
      focusZ: String(spawn.position_z),
    },
  })
}
</script>

<template>
  <div class="field-group">
    <div class="spawn-header-row">
      <div class="field-group-header">
        <h4>{{ t('creature_template.groups.spawns') }}</h4>
        <p>{{ t('creature_template.groups.spawnsDesc') }}</p>
      </div>
      <Button
        size="small"
        severity="secondary"
        icon="pi pi-map-marker"
        :label="t('creature_template.groups.viewOnMap')"
        :disabled="spawns.length === 0"
        @click="viewFirstOnMap"
      />
    </div>
    <StyledDataTable
      :data="spawns"
      dataKey="guid"
    >
      <Column field="guid" :header="t('creature_template.spawnColumns.guid')" style="width: 6rem" />
      <Column field="map" :header="t('creature_template.spawnColumns.map')" style="width: 5rem" />
      <Column field="zoneId" :header="t('creature_template.spawnColumns.zone')" style="width: 5rem" />
      <Column :header="t('creature_template.spawnColumns.position')" style="min-width: 16rem">
        <template #body="{ data: spawn }">
          <span class="spawn-coords">{{ spawn.position_x.toFixed(2) }}, {{ spawn.position_y.toFixed(2) }}, {{ spawn.position_z.toFixed(2) }}</span>
        </template>
      </Column>
      <Column field="spawnMask" :header="t('creature_template.spawnColumns.spawnMask')" style="width: 8rem" />
      <Column field="spawntimesecs" :header="t('creature_template.spawnColumns.respawn')" style="width: 8rem" />
      <Column :header="t('creature_template.spawnColumns.actions')" style="width: 8rem" headerStyle="text-align: right" bodyStyle="text-align: right">
        <template #body="{ data: spawn }">
          <Button
            v-tooltip.top="t('creature_template.groups.viewOnMap')"
            text
            rounded
            size="small"
            severity="secondary"
            icon="pi pi-map-marker"
            @click="viewOnMap(spawn)"
          />
          <ActionsColumn :data="spawn" @edit="emit('edit', spawn)" @delete="emit('delete', spawn)" />
        </template>
      </Column>
    </StyledDataTable>
  </div>
</template>

<style scoped>
.spawn-coords {
  font-family: monospace;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.spawn-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}
</style>

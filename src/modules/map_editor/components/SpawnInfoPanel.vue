<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import ToggleButton from 'primevue/togglebutton'
import ViewInfoPanel from '@core/components/ViewInfoPanel.vue'
import ModelViewer from '@/modules/model_viewer/components/ModelViewer.vue'
import type { CreatureSpawnMarker } from '../types'

/**
 * Selected-spawn side panel for the 3D world view. Mirrors the NPC module's
 * `NpcModelPanel` (a collapsible `ViewInfoPanel` with the shared `ModelViewer`)
 * so a spawn reads the same in both places, and adds the world position plus
 * the move-to-terrain workflow (armed right-click → migration SQL). Rendered as
 * an overlay by the parent, so showing it never reflows the map.
 */
const props = defineProps<{
  spawn: CreatureSpawnMarker
  /** When armed, the next terrain right-click relocates this spawn. */
  moveArmed: boolean
  /** New position captured after a move (drives the UPDATE statement). */
  movedPosition: { x: number; y: number; z: number } | null
  /** Ready-to-run UPDATE for the moved spawn ('' when nothing moved). */
  migrationSql: string
  /** True briefly after the SQL was copied, to swap the button icon. */
  sqlCopied: boolean
}>()

const emit = defineEmits<{
  (e: 'update:moveArmed', value: boolean): void
  (e: 'copy-sql'): void
  (e: 'close'): void
}>()

const { t } = useI18n()
const router = useRouter()

const moveArmed = computed({
  get: () => props.moveArmed,
  set: value => emit('update:moveArmed', value),
})

function formatPos(x: number, y: number, z: number): string {
  return `${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}`
}

/** Opens the full creature_template editor for this spawn's template. */
function openInNpcEditor() {
  router.push(`/npc/creature-template/${props.spawn.id}`)
}
</script>

<template>
  <ViewInfoPanel
    :title="t('mapEditor.spawns.panelTitle')"
    :subtitle="spawn.name || t('mapEditor.spawns.unknown')"
    icon="pi pi-user"
    storageKey="mapEditor.spawnPanel"
    class="spawn-info-panel"
  >
    <ModelViewer kind="creature" :displayId="spawn.display_id" />

    <dl class="spawn-meta">
      <div class="spawn-meta-row">
        <dt>{{ t('mapEditor.spawns.entry') }}</dt>
        <dd>{{ spawn.id }}</dd>
      </div>
      <div class="spawn-meta-row">
        <dt>{{ t('mapEditor.spawns.guid') }}</dt>
        <dd>{{ spawn.guid }}</dd>
      </div>
      <div class="spawn-meta-row">
        <dt>{{ t('mapEditor.spawns.displayId') }}</dt>
        <dd>{{ spawn.display_id || t('mapEditor.spawns.none') }}</dd>
      </div>
      <div class="spawn-meta-row">
        <dt>{{ t('mapEditor.spawns.scale') }}</dt>
        <dd>{{ spawn.scale }}</dd>
      </div>
      <div class="spawn-meta-row spawn-meta-row-block">
        <dt>{{ t('mapEditor.spawns.original') }}</dt>
        <dd class="spawn-pos">{{ formatPos(spawn.position_x, spawn.position_y, spawn.position_z) }}</dd>
      </div>
      <div v-if="movedPosition" class="spawn-meta-row spawn-meta-row-block">
        <dt class="spawn-pos-new">{{ t('mapEditor.spawns.newPos') }}</dt>
        <dd class="spawn-pos">{{ formatPos(movedPosition.x, movedPosition.y, movedPosition.z) }}</dd>
      </div>
    </dl>

    <div class="spawn-actions">
      <ToggleButton
        v-model="moveArmed"
        class="spawn-action-full"
        onIcon="pi pi-arrows-alt"
        offIcon="pi pi-arrows-alt"
        :onLabel="t('mapEditor.spawns.moveArmed')"
        :offLabel="t('mapEditor.spawns.move')"
      />
      <span v-if="moveArmed" class="spawn-move-hint">{{ t('mapEditor.spawns.moveHint') }}</span>

      <template v-if="movedPosition">
        <code class="spawn-sql">{{ migrationSql }}</code>
        <Button
          class="spawn-action-full"
          :icon="sqlCopied ? 'pi pi-check' : 'pi pi-copy'"
          :label="t('mapEditor.spawns.copySql')"
          severity="secondary"
          size="small"
          @click="emit('copy-sql')"
        />
      </template>

      <Button
        class="spawn-action-full"
        icon="pi pi-external-link"
        :label="t('mapEditor.spawns.openEditor')"
        size="small"
        @click="openInNpcEditor"
      />
      <Button
        class="spawn-action-full"
        icon="pi pi-times"
        :label="t('mapEditor.spawns.close')"
        severity="secondary"
        text
        size="small"
        @click="emit('close')"
      />
    </div>
  </ViewInfoPanel>
</template>

<style scoped>
/* Overlay sizing: fit the map area rather than the tall inline column the
   shared panel assumes (its calc(93vh) height would overflow the viewport). */
.spawn-info-panel :deep(.view-info-panel) {
  position: static;
  height: auto;
  max-height: 100%;
  width: 300px;
  backdrop-filter: blur(12px);
  background: rgba(15, 23, 42, 0.82);
}

.spawn-info-panel :deep(.view-info-rail) {
  position: static;
  backdrop-filter: blur(12px);
  background: rgba(15, 23, 42, 0.82);
}

.spawn-meta {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.spawn-meta-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.85rem;
}

.spawn-meta-row-block {
  flex-direction: column;
  align-items: stretch;
  gap: 0.2rem;
}

.spawn-meta-row dt {
  color: var(--text-muted);
}

.spawn-meta-row dd {
  margin: 0;
  color: var(--text);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.spawn-pos {
  font-family: monospace;
  font-size: 0.82rem;
}

.spawn-pos-new {
  color: var(--accent);
}

.spawn-actions {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.spawn-action-full {
  width: 100%;
}

.spawn-move-hint {
  color: #fbbf24;
  font-size: 0.8rem;
}

.spawn-sql {
  display: block;
  padding: 0.4rem 0.6rem;
  border-radius: 0.4rem;
  background: rgba(2, 6, 23, 0.7);
  color: #a5f3fc;
  font-family: monospace;
  font-size: 0.75rem;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>

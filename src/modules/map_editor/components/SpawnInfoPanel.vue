<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import ToggleButton from 'primevue/togglebutton'
import ViewInfoPanel from '@core/components/ViewInfoPanel.vue'
import ModelViewer from '@/modules/model_viewer/components/ModelViewer.vue'
import type { CreatureSpawnMarker, GizmoMode, SpawnTransform } from '../types'

/**
 * Selected-spawn side panel for the 3D world view. Mirrors the NPC module's
 * `NpcModelPanel` (a collapsible `ViewInfoPanel` with the shared `ModelViewer`)
 * so a spawn reads the same in both places, and adds the world position plus
 * the editing tools: the move/rotate gizmo, the armed right-click placement,
 * undo/reset, and the migration SQL they add up to. The parent shows it in the
 * inspector column in place of the zone tables, at their width.
 */
const props = defineProps<{
  spawn: CreatureSpawnMarker
  /** When armed, the next terrain right-click relocates this spawn. */
  moveArmed: boolean
  /** Gizmo shown on the spawn in the 3D view; null when put away. */
  gizmoMode: GizmoMode | null
  /** Where the spawn was moved/turned to; null while it is where the DB has it. */
  transform: SpawnTransform | null
  /** Some change can be undone. */
  canUndo: boolean
  /** Ready-to-run UPDATE for the edited spawn ('' when nothing changed). */
  migrationSql: string
  /** True briefly after the SQL was copied, to swap the button icon. */
  sqlCopied: boolean
}>()

const emit = defineEmits<{
  (e: 'update:moveArmed', value: boolean): void
  (e: 'update:gizmoMode', value: GizmoMode | null): void
  (e: 'undo'): void
  (e: 'reset'): void
  (e: 'copy-sql'): void
  (e: 'close'): void
}>()

const { t } = useI18n()
const router = useRouter()

const moveArmed = computed({
  get: () => props.moveArmed,
  set: value => emit('update:moveArmed', value),
})

// SelectButton hands back null when the active mode is clicked again.
const gizmoMode = computed({
  get: () => props.gizmoMode,
  set: value => emit('update:gizmoMode', value ?? null),
})

const gizmoOptions = computed(() => [
  { label: t('mapEditor.spawns.gizmo.translate'), icon: 'pi pi-arrows-alt', value: 'translate' as const },
  { label: t('mapEditor.spawns.gizmo.rotate'), icon: 'pi pi-sync', value: 'rotate' as const },
])

function formatPos(x: number, y: number, z: number): string {
  return `${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}`
}

/** The DB value in radians, with degrees alongside for reading. */
function formatOrientation(radians: number): string {
  return t('mapEditor.spawns.orientation', {
    rad: radians.toFixed(4),
    deg: Math.round((radians * 180) / Math.PI),
  })
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
        <dd class="spawn-pos">{{ formatOrientation(spawn.orientation) }}</dd>
      </div>
      <div v-if="transform" class="spawn-meta-row spawn-meta-row-block">
        <dt class="spawn-pos-new">{{ t('mapEditor.spawns.newPos') }}</dt>
        <dd class="spawn-pos">{{ formatPos(transform.x, transform.y, transform.z) }}</dd>
        <dd class="spawn-pos">{{ formatOrientation(transform.orientation) }}</dd>
      </div>
    </dl>

    <div class="spawn-actions">
      <SelectButton
        v-model="gizmoMode"
        :options="gizmoOptions"
        optionLabel="label"
        optionValue="value"
        size="small"
        class="spawn-gizmo-switch"
        :aria-label="t('mapEditor.spawns.gizmo.label')"
      >
        <template #option="{ option }">
          <i :class="option.icon"></i>
          <span>{{ option.label }}</span>
        </template>
      </SelectButton>
      <span v-if="gizmoMode" class="spawn-move-hint">
        {{ t(gizmoMode === 'translate' ? 'mapEditor.spawns.gizmo.translateHint' : 'mapEditor.spawns.gizmo.rotateHint') }}
      </span>

      <ToggleButton
        v-model="moveArmed"
        class="spawn-action-full"
        onIcon="pi pi-arrows-alt"
        offIcon="pi pi-arrows-alt"
        :onLabel="t('mapEditor.spawns.moveArmed')"
        :offLabel="t('mapEditor.spawns.move')"
      />
      <span v-if="moveArmed" class="spawn-move-hint">{{ t('mapEditor.spawns.moveHint') }}</span>

      <div class="spawn-history">
        <Button
          icon="pi pi-undo"
          :label="t('mapEditor.spawns.undo')"
          severity="secondary"
          size="small"
          :disabled="!canUndo"
          v-tooltip.bottom="t('mapEditor.spawns.undoShortcut')"
          @click="emit('undo')"
        />
        <Button
          icon="pi pi-replay"
          :label="t('mapEditor.spawns.reset')"
          severity="secondary"
          size="small"
          :disabled="!transform"
          @click="emit('reset')"
        />
      </div>

      <template v-if="migrationSql">
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
/* Inspector sizing: fill the column like the zone tables this stands in for,
   rather than the sticky calc(93vh) box the shared panel assumes. The class
   lands on the shared panel's own root (panel or rail), hence the compound
   selectors. */
.spawn-info-panel.view-info-panel {
  position: static;
  align-self: stretch;
  height: 100%;
  background: var(--surface-1);
  border-radius: var(--radius-lg);
}

.spawn-info-panel.view-info-rail {
  position: static;
  align-self: stretch;
  height: 100%;
  border-radius: var(--radius-lg);
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

/* Two equal segments across the panel, like the zone tables' switch. */
.spawn-gizmo-switch {
  display: flex;
  width: 100%;
}

.spawn-gizmo-switch :deep(.p-togglebutton) {
  flex: 1;
}

.spawn-gizmo-switch :deep(.p-togglebutton-content) {
  gap: 0.4rem;
}

.spawn-history {
  display: flex;
  gap: 0.5rem;
}

.spawn-history > * {
  flex: 1;
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

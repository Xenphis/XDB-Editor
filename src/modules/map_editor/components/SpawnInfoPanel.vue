<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Dialog from 'primevue/dialog'
import type { CreatureSpawnMarker, GizmoMode, SpawnTransform } from '../types'
import type { CreatureClassLevelStats } from '@/modules/class_level_stats/types'
import { useSpawnDetails } from '../useSpawnDetails'

/**
 * Selected-spawn side panel for the 3D world view. The model is already visible
 * in the scene, so it shows what is worth knowing before editing: identity,
 * combat stats and spawn behaviour, loaded from the template and the spawn row.
 * It adds the editing tools: undo, open in the NPC editor, delete, the
 * move/rotate gizmo, and the migration SQL a move adds up to. Laid out like
 * the zone tables panel it stands in for (same header, borders and width).
 */
const props = defineProps<{
  spawn: CreatureSpawnMarker
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
  /** Why the last delete failed; '' when it did not. */
  deleteError?: string
}>()

const emit = defineEmits<{
  (e: 'update:gizmoMode', value: GizmoMode | null): void
  (e: 'undo'): void
  (e: 'copy-sql'): void
  (e: 'delete'): void
  (e: 'close'): void
}>()

const { t } = useI18n()
const router = useRouter()

// Deleting removes the DB row, so it goes through a confirmation dialog. A
// change of selection (or a failed attempt) closes it.
const confirmingDelete = ref(false)
watch(() => props.spawn.guid, () => (confirmingDelete.value = false))

const gizmoButtons = [
  { mode: 'translate' as const, icon: 'pi pi-arrows-alt', label: 'mapEditor.spawns.gizmo.translate' },
  { mode: 'rotate' as const, icon: 'pi pi-sync', label: 'mapEditor.spawns.gizmo.rotate' },
]

/** Clicking the active tool again puts the gizmo away. */
function toggleGizmo(mode: GizmoMode) {
  emit('update:gizmoMode', props.gizmoMode === mode ? null : mode)
}

const { template, resistances, row, stats, loading } = useSpawnDetails(toRef(props, 'spawn'))

const isSpecialRank = computed(() => (template.value?.rank ?? 0) !== 0)

const SCHOOLS = ['holy', 'fire', 'nature', 'frost', 'shadow', 'arcane'] as const

const NPC_FLAGS: [number, string][] = [
  [0x1, 'gossip'],
  [0x2, 'questgiver'],
  [0x10, 'trainer'],
  [0x80, 'vendor'],
  [0x1000, 'repair'],
  [0x2000, 'flightmaster'],
  [0x10000, 'innkeeper'],
  [0x20000, 'banker'],
  [0x200000, 'auctioneer'],
  [0x400000, 'stablemaster'],
]

const level = computed(() => {
  const tpl = template.value
  if (!tpl) return ''
  return tpl.minlevel === tpl.maxlevel ? `${tpl.minlevel}` : `${tpl.minlevel}–${tpl.maxlevel}`
})

const npcFlags = computed(() =>
  template.value ? NPC_FLAGS.filter(([bit]) => (template.value!.npcflag & bit) !== 0).map(([, key]) => key) : [],
)

const shownResistances = computed(() =>
  resistances.value
    .filter(r => r.Resistance !== 0 && r.School >= 1 && r.School <= SCHOOLS.length)
    .map(r => ({ school: SCHOOLS[r.School - 1], value: r.Resistance })),
)

const hasImmunities = computed(
  () => !!template.value && (template.value.mechanic_immune_mask !== 0 || template.value.spell_school_immune_mask !== 0),
)

/** The spawn's own MovementType wins; the template's is the fallback. */
const movementType = computed(() => row.value?.MovementType ?? template.value?.MovementType ?? 0)

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString()
}

/** "min" or "min – max" when the template spans several levels. */
function formatRange(min: number, max: number): string {
  const lo = Math.round(min)
  const hi = Math.round(max)
  return lo === hi ? formatNumber(lo) : `${formatNumber(lo)} – ${formatNumber(hi)}`
}

/** The modifier is only worth a mention when it changes the base value. */
function modifierNote(modifier: number): string {
  return modifier === 1 ? '' : `×${Number(modifier.toFixed(2))}`
}

/** Base stat (per class/level matrix) times the template's modifier. */
function scaled(pick: (s: CreatureClassLevelStats) => number, modifier: number): string | null {
  const st = stats.value
  return st ? formatRange(pick(st.min) * modifier, pick(st.max) * modifier) : null
}

// creature_classlevelstats holds one health/damage column per expansion.
function expansionBase(s: CreatureClassLevelStats, exp: number, cols: [number, number, number]): number {
  return cols[Math.min(Math.max(exp, 0), 2)] ?? 0
}

const health = computed(() => {
  const tpl = template.value
  if (!tpl) return null
  const value = scaled(s => expansionBase(s, tpl.exp, [s.basehp0, s.basehp1, s.basehp2]), tpl.HealthModifier)
  return value
})

const mana = computed(() => (template.value ? scaled(s => s.basemana, template.value.ManaModifier) : null))
const armor = computed(() => (template.value ? scaled(s => s.basearmor, template.value.ArmorModifier) : null))

/** Average melee hit: base damage plus attack power over the swing time. */
const damage = computed(() => {
  const tpl = template.value
  if (!tpl) return null
  const swing = tpl.BaseAttackTime / 1000
  return scaled(
    s => (expansionBase(s, tpl.exp, [s.damage_base, s.damage_exp1, s.damage_exp2]) + (s.attackpower / 14) * swing),
    tpl.DamageModifier,
  )
})

function formatMs(ms: number): string {
  return `${Number((ms / 1000).toFixed(2))}s`
}

function formatDuration(seconds: number): string {
  if (seconds >= 3600) return `${Number((seconds / 3600).toFixed(1))} h`
  if (seconds >= 60) return `${Number((seconds / 60).toFixed(1))} min`
  return `${seconds} s`
}

/** Opens the full creature_template editor for this spawn's template. */
function openInNpcEditor() {
  router.push(`/npc/creature-template/${props.spawn.id1}`)
}
</script>

<template>
  <aside class="spawn-panel">
    <header class="sp-header">
      <span class="sp-title">{{ t('mapEditor.spawns.panelTitle') }}</span>
      <button
        type="button"
        class="sp-btn sp-btn-ghost"
        :aria-label="t('mapEditor.spawns.close')"
        v-tooltip.bottom="t('mapEditor.spawns.close')"
        @click="emit('close')"
      >
        <i class="pi pi-times"></i>
      </button>
    </header>

    <div class="sp-body">
      <div class="sp-identity">
        <h3 class="sp-name">{{ spawn.name || t('mapEditor.spawns.unknown') }}</h3>
        <p v-if="template?.subname" class="sp-subname">&lt;{{ template.subname }}&gt;</p>
        <div v-if="template" class="sp-tags">
          <span class="sp-tag">{{ t('mapEditor.spawns.level') }} {{ level }}</span>
          <span class="sp-tag" :class="{ 'sp-tag-accent': isSpecialRank }">
            {{ t(`mapEditor.spawns.ranks.${template.rank}`, template.rank) }}
          </span>
          <span class="sp-tag">{{ t('mapEditor.spawns.faction') }} {{ template.faction }}</span>
        </div>
      </div>

      <div class="sp-toolbar">
        <button
          type="button"
          class="sp-btn"
          :disabled="!canUndo"
          :aria-label="t('mapEditor.spawns.undo')"
          v-tooltip.bottom="t('mapEditor.spawns.undoShortcut')"
          @click="emit('undo')"
        >
          <i class="pi pi-undo"></i>
        </button>
        <button
          type="button"
          class="sp-btn"
          :aria-label="t('mapEditor.spawns.openEditor')"
          v-tooltip.bottom="t('mapEditor.spawns.openEditor')"
          @click="openInNpcEditor"
        >
          <i class="pi pi-pencil"></i>
        </button>
        <button
          v-for="g in gizmoButtons"
          :key="g.mode"
          type="button"
          class="sp-btn"
          :class="{ 'sp-btn-active': gizmoMode === g.mode }"
          :aria-pressed="gizmoMode === g.mode"
          :aria-label="t(g.label)"
          v-tooltip.bottom="t(g.label)"
          @click="toggleGizmo(g.mode)"
        >
          <i :class="g.icon"></i>
        </button>
        <button
          type="button"
          class="sp-btn sp-btn-danger sp-toolbar-end"
          :aria-label="t('mapEditor.spawns.delete')"
          v-tooltip.bottom="t('mapEditor.spawns.delete')"
          @click="confirmingDelete = true"
        >
          <i class="pi pi-trash"></i>
        </button>
      </div>

      <p v-if="loading" class="sp-muted">{{ t('mapEditor.spawns.loading') }}</p>
      <p v-else-if="!template" class="sp-muted">{{ t('mapEditor.spawns.noTemplate') }}</p>

      <template v-if="template && !loading">
        <section class="sp-card">
          <h4 class="sp-card-title"><i class="pi pi-shield"></i>{{ t('mapEditor.spawns.combat') }}</h4>
          <dl class="sp-rows">
            <div v-if="health || modifierNote(template.HealthModifier)" class="sp-row">
              <dt>{{ t('mapEditor.spawns.health') }}</dt>
              <dd>
                {{ health ?? modifierNote(template.HealthModifier) }}
                <small v-if="health && modifierNote(template.HealthModifier)">{{ modifierNote(template.HealthModifier) }}</small>
                <small v-if="row && row.curhealth">{{ t('mapEditor.spawns.curHealth', { n: row.curhealth }) }}</small>
              </dd>
            </div>
            <div v-if="template.ManaModifier && (mana || modifierNote(template.ManaModifier))" class="sp-row">
              <dt>{{ t('mapEditor.spawns.mana') }}</dt>
              <dd>
                {{ mana ?? modifierNote(template.ManaModifier) }}
                <small v-if="mana && modifierNote(template.ManaModifier)">{{ modifierNote(template.ManaModifier) }}</small>
              </dd>
            </div>
            <div v-if="damage || modifierNote(template.DamageModifier)" class="sp-row">
              <dt>{{ t('mapEditor.spawns.damage') }}</dt>
              <dd>
                {{ damage ?? modifierNote(template.DamageModifier) }}
                <small v-if="damage && modifierNote(template.DamageModifier)">{{ modifierNote(template.DamageModifier) }}</small>
              </dd>
            </div>
            <div class="sp-row">
              <dt>{{ t('mapEditor.spawns.attackTime') }}</dt>
              <dd>{{ formatMs(template.BaseAttackTime) }} / {{ formatMs(template.RangeAttackTime) }}</dd>
            </div>
            <div v-if="armor || modifierNote(template.ArmorModifier)" class="sp-row">
              <dt>{{ t('mapEditor.spawns.armor') }}</dt>
              <dd>
                {{ armor ?? modifierNote(template.ArmorModifier) }}
                <small v-if="armor && modifierNote(template.ArmorModifier)">{{ modifierNote(template.ArmorModifier) }}</small>
              </dd>
            </div>
            <div v-if="shownResistances.length" class="sp-row sp-row-stack">
              <dt>{{ t('mapEditor.spawns.resistances') }}</dt>
              <dd class="sp-chips">
                <span v-for="r in shownResistances" :key="r.school" class="sp-tag">
                  {{ t(`mapEditor.spawns.schools.${r.school}`) }} {{ r.value }}
                </span>
              </dd>
            </div>
            <div v-if="hasImmunities" class="sp-row">
              <dt>{{ t('mapEditor.spawns.immunitiesLabel') }}</dt>
              <dd>{{ t('mapEditor.spawns.immunities') }}</dd>
            </div>
          </dl>
        </section>

        <section class="sp-card">
          <h4 class="sp-card-title"><i class="pi pi-compass"></i>{{ t('mapEditor.spawns.behavior') }}</h4>
          <dl class="sp-rows">
            <div class="sp-row">
              <dt>{{ t('mapEditor.spawns.movement') }}</dt>
              <dd>{{ t(`mapEditor.spawns.movementTypes.${movementType}`, movementType) }}</dd>
            </div>
            <div v-if="row" class="sp-row">
              <dt>{{ t('mapEditor.spawns.wanderDistance') }}</dt>
              <dd>{{ Number(row.wander_distance.toFixed(2)) }}</dd>
            </div>
            <div v-if="row" class="sp-row">
              <dt>{{ t('mapEditor.spawns.respawn') }}</dt>
              <dd>{{ formatDuration(row.spawntimesecs) }}</dd>
            </div>
            <div class="sp-row">
              <dt>{{ t('mapEditor.spawns.speed') }}</dt>
              <dd>{{ Number(template.speed_walk.toFixed(2)) }} / {{ Number(template.speed_run.toFixed(2)) }}</dd>
            </div>
            <div v-if="template.AIName || template.ScriptName || row?.ScriptName" class="sp-row">
              <dt>{{ t('mapEditor.spawns.script') }}</dt>
              <dd>{{ row?.ScriptName || template.ScriptName || template.AIName }}</dd>
            </div>
            <div v-if="npcFlags.length" class="sp-row sp-row-stack">
              <dt>{{ t('mapEditor.spawns.roles') }}</dt>
              <dd class="sp-chips">
                <span v-for="flag in npcFlags" :key="flag" class="sp-tag">
                  {{ t(`mapEditor.spawns.npcFlags.${flag}`) }}
                </span>
              </dd>
            </div>
          </dl>
        </section>
      </template>

      <section v-if="migrationSql" class="sp-card">
        <h4 class="sp-card-title"><i class="pi pi-database"></i>{{ t('mapEditor.spawns.migration') }}</h4>
        <div class="sp-card-body">
          <code class="sp-sql">{{ migrationSql }}</code>
          <button type="button" class="sp-btn sp-btn-text sp-btn-full" @click="emit('copy-sql')">
            <i :class="sqlCopied ? 'pi pi-check' : 'pi pi-copy'"></i>{{ t('mapEditor.spawns.copySql') }}
          </button>
        </div>
      </section>

      <details class="sp-card sp-technical">
        <summary class="sp-card-title">
          <i class="pi pi-cog"></i>{{ t('mapEditor.spawns.technical') }}
          <i class="pi pi-angle-down sp-chevron"></i>
        </summary>
        <dl class="sp-rows">
          <div class="sp-row">
            <dt>{{ t('mapEditor.spawns.entry') }}</dt>
            <dd>{{ spawn.id1 }}</dd>
          </div>
          <div class="sp-row">
            <dt>{{ t('mapEditor.spawns.guid') }}</dt>
            <dd>{{ spawn.guid }}</dd>
          </div>
          <div class="sp-row">
            <dt>{{ t('mapEditor.spawns.displayId') }}</dt>
            <dd>{{ spawn.display_id || t('mapEditor.spawns.none') }}</dd>
          </div>
          <div class="sp-row">
            <dt>{{ t('mapEditor.spawns.scale') }}</dt>
            <dd>{{ spawn.scale }}</dd>
          </div>
        </dl>
      </details>
    </div>

    <Dialog
      v-model:visible="confirmingDelete"
      modal
      :header="t('mapEditor.spawns.deleteTitle')"
      :style="{ width: '26rem' }"
    >
      <p class="sp-dialog-text">{{ t('mapEditor.spawns.deleteConfirm', { name: spawn.name || spawn.id1, guid: spawn.guid }) }}</p>
      <p v-if="deleteError" class="sp-error">{{ deleteError }}</p>
      <template #footer>
        <button type="button" class="sp-btn sp-btn-text" @click="confirmingDelete = false">
          {{ t('mapEditor.spawns.cancel') }}
        </button>
        <button type="button" class="sp-btn sp-btn-text sp-btn-danger-solid" @click="emit('delete')">
          <i class="pi pi-trash"></i>{{ t('mapEditor.spawns.delete') }}
        </button>
      </template>
    </Dialog>
  </aside>
</template>

<style scoped>
/* Fixed width, like the zone tables panel: the inspector column sizes to its
   content, so anything long (the SQL, the gizmo hint) would otherwise widen it. */
.spawn-panel {
  width: 320px;
  flex-shrink: 0;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--surface-1);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.sp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid var(--border-default);
  flex-shrink: 0;
}

.sp-title {
  font-size: var(--font-label);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.sp-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
}

/* Cards keep their height and the body scrolls, instead of squeezing them. */
.sp-body > * {
  flex-shrink: 0;
}

/* Identity */
.sp-identity {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.sp-name {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1.25;
  color: var(--text);
}

.sp-subname {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.sp-tags,
.sp-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.sp-tag {
  padding: 0.12rem 0.5rem;
  border: 1px solid var(--border-default);
  border-radius: var(--radius);
  background: var(--surface-panel);
  color: var(--text-soft);
  font-size: 0.72rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.sp-tag-accent {
  border-color: var(--accent-focus);
  background: var(--accent-soft);
  color: var(--accent);
}

/* Buttons: square-cornered like the rest of the app's controls */
.sp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 1px solid var(--border-input);
  border-radius: var(--radius);
  background: var(--surface-input);
  color: var(--text-soft);
  font: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.15s, background 0.15s, border-color 0.15s;
}

.sp-btn:hover:not(:disabled) {
  border-color: var(--accent-focus);
  background: var(--accent-soft);
  color: var(--accent);
}

.sp-btn-active,
.sp-btn-active:hover:not(:disabled) {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}

.sp-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.sp-btn i {
  font-size: 0.8rem;
}

.sp-btn-ghost {
  width: 1.6rem;
  height: 1.6rem;
  border-color: transparent;
  background: transparent;
  color: var(--text-placeholder);
}

.sp-btn-ghost:hover:not(:disabled) {
  border-color: transparent;
  background: var(--surface-hover);
  color: var(--text);
}

.sp-btn-danger:hover:not(:disabled) {
  border-color: var(--danger);
  background: color-mix(in srgb, var(--danger) 10%, transparent);
  color: var(--danger);
}

.sp-btn-text {
  width: auto;
  padding: 0 0.75rem;
}

.sp-btn-danger-solid {
  border-color: var(--danger);
  background: var(--danger);
  color: #fff;
}

.sp-btn-danger-solid:hover:not(:disabled) {
  border-color: var(--danger);
  background: var(--danger);
  color: #fff;
  filter: brightness(1.1);
}

.sp-btn-full {
  width: 100%;
}

.sp-toolbar {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.sp-toolbar-end {
  margin-left: auto;
}

.sp-dialog-text {
  margin: 0 0 0.5rem;
  color: var(--text);
  font-size: 0.9rem;
  line-height: 1.5;
}

.sp-error {
  margin: 0;
  color: var(--danger);
  font-size: 0.8rem;
}

.sp-muted {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.8rem;
}

/* Sections: a bordered card with a header strip, so they read as blocks */
.sp-card {
  border: 1px solid var(--border-default);
  border-radius: var(--radius);
  background: var(--surface-panel);
  overflow: hidden;
}

.sp-card-title {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0;
  padding: 0.45rem 0.65rem;
  background: var(--surface-hover);
  border-bottom: 1px solid var(--border-default);
  font-size: var(--font-label);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  list-style: none;
}

.sp-card-title i {
  color: var(--accent);
  font-size: 0.75rem;
}

.sp-card-body {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.65rem;
}

.sp-rows {
  margin: 0;
  display: flex;
  flex-direction: column;
}

.sp-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.4rem 0.65rem;
  font-size: 0.82rem;
}

.sp-row + .sp-row {
  border-top: 1px solid var(--border-default);
}

.sp-row-stack {
  flex-direction: column;
  align-items: stretch;
  gap: 0.35rem;
}

.sp-row dt {
  color: var(--text-muted);
}

.sp-row dd {
  margin: 0;
  color: var(--text);
  font-weight: 600;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.sp-row-stack dd {
  text-align: left;
}

.sp-row dd small {
  display: block;
  color: var(--text-muted);
  font-size: 0.72rem;
  font-weight: 500;
}

/* Collapsible technical block */
.sp-technical > summary {
  cursor: pointer;
}

.sp-technical > summary::-webkit-details-marker {
  display: none;
}

.sp-technical:not([open]) > summary {
  border-bottom: none;
}

.sp-technical .sp-chevron {
  margin-left: auto;
  color: var(--text-placeholder);
  transition: transform 0.15s;
}

.sp-technical[open] .sp-chevron {
  transform: rotate(180deg);
}

.sp-sql {
  display: block;
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--border-default);
  border-radius: var(--radius);
  background: var(--surface-code);
  color: var(--text-soft);
  font-family: monospace;
  font-size: 0.72rem;
  overflow-x: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>

<script setup lang="ts">
/**
 * Read-only "Info" tab: the main `Spell.dbc` facts for one spell, since the
 * app has nowhere else that shows more than a name/icon for a spell. Nothing
 * here is editable — the DBC is the client's own data, not something this
 * tool can write back to.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { blpTextureUrl } from '@core/wow/assetHost'
import type { SpellDetail, SpellEffectDetail } from '@core/wow/spellDbc'
import { spellSchools, dispelTypeKeys, mechanicKeys, powerTypeKeys, spellFamilyKeys } from '@/modules/spells/types/spellEnums'
import { spellEffectNames } from '@/modules/spells/types/spellEffectNames'
import { spellAuraNames } from '@/modules/spells/types/spellAuraNames'

const props = defineProps<{
  detail: SpellDetail | null
  loading: boolean
}>()

const { t } = useI18n()

/** Spells with no icon, or a BLP the decoder choked on, just show no image. */
function hideBrokenIcon(event: Event) {
  ;(event.target as HTMLImageElement).style.visibility = 'hidden'
}

const activeSchools = computed(() =>
  spellSchools.filter(s => ((props.detail?.schoolMask ?? 0) & s.mask) !== 0),
)

function enumLabel(keys: Record<number, string>, category: string, value: number): string {
  const key = keys[value]
  return key ? t(`spells.${category}.${key}`) : `#${value}`
}

const dispelLabel = computed(() => enumLabel(dispelTypeKeys, 'dispelType', props.detail?.dispelType ?? 0))
const mechanicLabel = computed(() => enumLabel(mechanicKeys, 'mechanic', props.detail?.mechanic ?? 0))
const familyLabel = computed(() => enumLabel(spellFamilyKeys, 'family', props.detail?.classSet ?? 0))
const powerTypeLabel = computed(() => enumLabel(powerTypeKeys, 'powerType', props.detail?.powerType ?? 0))

const costText = computed(() => {
  const d = props.detail
  if (!d || d.manaCost === 0) return '—'
  return d.manaCostPerLevel > 0 ? `${d.manaCost} (+${d.manaCostPerLevel}/lvl)` : `${d.manaCost}`
})

/** `1500` -> "1.5s", `2000` -> "2s". */
function formatSeconds(ms: number): string {
  const s = ms / 1000
  return `${Number.isInteger(s) ? s : s.toFixed(1)}s`
}

const castTimeText = computed(() => {
  const d = props.detail
  if (!d) return '—'
  if (d.castingTimeIndex === 0) return t('spells.info.instant')
  if (d.castTimeMs != null) return formatSeconds(d.castTimeMs)
  return t('spells.info.unresolved', { index: d.castingTimeIndex })
})

const cooldownText = computed(() => (props.detail && props.detail.recoveryTimeMs > 0 ? formatSeconds(props.detail.recoveryTimeMs) : '—'))
const categoryCooldownText = computed(() =>
  props.detail && props.detail.categoryRecoveryTimeMs > 0 ? formatSeconds(props.detail.categoryRecoveryTimeMs) : null,
)

const durationText = computed(() => {
  const d = props.detail
  if (!d) return '—'
  if (d.durationIndex === 0) return t('spells.info.noDuration')
  if (d.durationMs == null) return t('spells.info.unresolved', { index: d.durationIndex })
  if (d.durationMs < 0) return t('spells.info.permanent')
  return formatSeconds(d.durationMs)
})

const rangeText = computed(() => {
  const d = props.detail
  if (!d) return '—'
  if (d.rangeIndex === 0) return t('spells.info.melee')
  if (d.rangeMin == null || d.rangeMax == null) return t('spells.info.unresolved', { index: d.rangeIndex })
  return d.rangeMin > 0 ? `${d.rangeMin}–${d.rangeMax} yd` : `${d.rangeMax} yd`
})

const procText = computed(() => {
  const d = props.detail
  if (!d || d.procCharges === 0) return null
  return `${d.procChance}% · ${d.procCharges}`
})

const effects = computed(() => props.detail?.effects ?? [])

function effectName(effect: SpellEffectDetail): string {
  return spellEffectNames[effect.effectType] ?? `#${effect.effectType}`
}

function auraName(effect: SpellEffectDetail): string | null {
  if (effect.auraType === 0) return null
  return spellAuraNames[effect.auraType] ?? `#${effect.auraType}`
}

const hasAnyEffect = computed(() => effects.value.some(e => e.effectType !== 0))
</script>

<template>
  <div v-if="loading" class="editor-loading">
    <i class="pi pi-spin pi-spinner"></i>
  </div>

  <div v-else-if="!detail" class="spell-info-empty">
    <i class="pi pi-folder-open"></i>
    <p>{{ t('spells.info.empty') }}</p>
  </div>

  <template v-else>
    <div class="spell-info-header">
      <img
        v-if="detail.icon"
        class="spell-info-icon"
        :src="blpTextureUrl(detail.icon)"
        alt=""
        @error="hideBrokenIcon"
      />
      <span v-else class="spell-info-icon-placeholder"></span>
      <div class="spell-info-identity">
        <h2 class="spell-info-name">{{ detail.name || `#${detail.id}` }}</h2>
        <p v-if="detail.rank" class="spell-info-rank">{{ detail.rank }}</p>
        <div class="spell-info-badges">
          <span
            v-for="school in activeSchools"
            :key="school.key"
            class="spell-info-badge"
            :style="{ borderColor: school.color, color: school.color }"
          >
            {{ t(`spells.school.${school.key}`) }}
          </span>
          <span v-if="detail.isPassive" class="spell-info-badge spell-info-badge-neutral">
            {{ t('spells.info.passive') }}
          </span>
          <span v-if="detail.isAura" class="spell-info-badge spell-info-badge-neutral">
            {{ t('spells.info.auraBadge') }}
          </span>
        </div>
      </div>
    </div>

    <div class="field-group">
      <div class="field-group-header">
        <h4>{{ t('spells.info.groups.classification') }}</h4>
        <p>{{ t('spells.info.groups.classificationDesc') }}</p>
      </div>
      <div class="field-grid">
        <div class="info-field">
          <span class="info-label">{{ t('spells.info.fields.dispelType') }}</span>
          <span class="info-value">{{ dispelLabel }}</span>
        </div>
        <div class="info-field">
          <span class="info-label">{{ t('spells.info.fields.mechanic') }}</span>
          <span class="info-value">{{ mechanicLabel }}</span>
        </div>
        <div class="info-field">
          <span class="info-label">{{ t('spells.info.fields.family') }}</span>
          <span class="info-value">{{ familyLabel }}</span>
        </div>
      </div>
    </div>

    <div class="field-group">
      <div class="field-group-header">
        <h4>{{ t('spells.info.groups.costTiming') }}</h4>
        <p>{{ t('spells.info.groups.costTimingDesc') }}</p>
      </div>
      <div class="field-grid">
        <div class="info-field">
          <span class="info-label">{{ t('spells.info.fields.powerType') }}</span>
          <span class="info-value">{{ powerTypeLabel }}</span>
        </div>
        <div class="info-field">
          <span class="info-label">{{ t('spells.info.fields.cost') }}</span>
          <span class="info-value">{{ costText }}</span>
        </div>
        <div class="info-field">
          <span class="info-label">{{ t('spells.info.fields.castTime') }}</span>
          <span class="info-value">{{ castTimeText }}</span>
        </div>
        <div class="info-field">
          <span class="info-label">{{ t('spells.info.fields.cooldown') }}</span>
          <span class="info-value">{{ cooldownText }}</span>
        </div>
        <div v-if="categoryCooldownText" class="info-field">
          <span class="info-label">{{ t('spells.info.fields.categoryCooldown') }}</span>
          <span class="info-value">{{ categoryCooldownText }}</span>
        </div>
        <div class="info-field">
          <span class="info-label">{{ t('spells.info.fields.duration') }}</span>
          <span class="info-value">{{ durationText }}</span>
        </div>
        <div class="info-field">
          <span class="info-label">{{ t('spells.info.fields.range') }}</span>
          <span class="info-value">{{ rangeText }}</span>
        </div>
      </div>
    </div>

    <div class="field-group">
      <div class="field-group-header">
        <h4>{{ t('spells.info.groups.requirements') }}</h4>
        <p>{{ t('spells.info.groups.requirementsDesc') }}</p>
      </div>
      <div class="field-grid">
        <div class="info-field">
          <span class="info-label">{{ t('spells.info.fields.spellLevel') }}</span>
          <span class="info-value">{{ detail.spellLevel || '—' }}</span>
        </div>
        <div class="info-field">
          <span class="info-label">{{ t('spells.info.fields.baseLevel') }}</span>
          <span class="info-value">{{ detail.baseLevel || '—' }}</span>
        </div>
        <div class="info-field">
          <span class="info-label">{{ t('spells.info.fields.maxLevel') }}</span>
          <span class="info-value">{{ detail.maxLevel || '—' }}</span>
        </div>
        <div v-if="procText" class="info-field">
          <span class="info-label">{{ t('spells.info.fields.procChance') }} / {{ t('spells.info.fields.procCharges') }}</span>
          <span class="info-value">{{ procText }}</span>
        </div>
      </div>
    </div>

    <div class="field-group">
      <div class="field-group-header">
        <h4>{{ t('spells.info.groups.effects') }}</h4>
        <p>{{ t('spells.info.groups.effectsDesc') }}</p>
      </div>
      <p v-if="!hasAnyEffect" class="spell-info-no-effects">{{ t('spells.info.noEffects') }}</p>
      <div v-else class="spell-info-effects">
        <div
          v-for="(effect, i) in effects"
          v-show="effect.effectType !== 0"
          :key="i"
          class="spell-info-effect-card"
        >
          <div class="spell-info-effect-header">
            <span class="spell-info-effect-slot">{{ t('spells.info.effectSlot', { n: i + 1 }) }}</span>
            <span class="spell-info-effect-name">{{ effectName(effect) }}</span>
          </div>
          <dl class="spell-info-effect-facts">
            <div class="spell-info-effect-fact">
              <dt>{{ t('spells.info.basePoints') }}</dt>
              <dd>{{ effect.basePoints }}</dd>
            </div>
            <div v-if="auraName(effect)" class="spell-info-effect-fact">
              <dt>{{ t('spells.info.auraType') }}</dt>
              <dd>{{ auraName(effect) }}</dd>
            </div>
            <div v-if="effect.implicitTargetA" class="spell-info-effect-fact">
              <dt>{{ t('spells.info.targetA') }}</dt>
              <dd>#{{ effect.implicitTargetA }}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  </template>
</template>

<style scoped>
@import './editor/spells-editor.css';

.editor-loading {
  display: flex;
  justify-content: center;
  padding: 3rem 0;
  color: var(--accent);
  font-size: 1.5rem;
}

.spell-info-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 3rem 1rem;
  color: var(--text-muted);
  text-align: center;
}

.spell-info-empty i {
  font-size: 1.75rem;
  color: var(--text-placeholder);
}

.spell-info-header {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.25rem 1.5rem;
  margin-bottom: 1.5rem;
  background: var(--surface-1);
  border: 1px solid var(--border-default);
  border-radius: 0.75rem;
}

.spell-info-icon,
.spell-info-icon-placeholder {
  width: 4rem;
  height: 4rem;
  border-radius: 0.5rem;
  flex-shrink: 0;
}

.spell-info-icon-placeholder {
  background: var(--surface-elevated);
}

.spell-info-identity {
  min-width: 0;
}

.spell-info-name {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text);
}

.spell-info-rank {
  margin: 0.15rem 0 0 0;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.spell-info-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.6rem;
}

.spell-info-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  border: 1px solid currentColor;
  background: color-mix(in srgb, currentColor 12%, transparent);
}

.spell-info-badge-neutral {
  color: var(--text-soft);
  border-color: var(--border-input);
  background: var(--surface-elevated);
}

.info-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.info-label {
  font-size: var(--font-label, 0.72rem);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

.info-value {
  font-size: 0.9rem;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.spell-info-no-effects {
  color: var(--text-placeholder);
  font-size: 0.85rem;
  font-style: italic;
  margin: 0;
}

.spell-info-effects {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
  gap: 0.75rem;
}

.spell-info-effect-card {
  background: var(--surface-panel);
  border: 1px solid var(--border-default);
  border-radius: 0.6rem;
  padding: 0.85rem 1rem;
}

.spell-info-effect-header {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  margin-bottom: 0.6rem;
}

.spell-info-effect-slot {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--accent);
}

.spell-info-effect-name {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text);
}

.spell-info-effect-facts {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.spell-info-effect-fact {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.78rem;
}

.spell-info-effect-fact dt {
  color: var(--text-muted);
}

.spell-info-effect-fact dd {
  margin: 0;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
</style>

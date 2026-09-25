<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Select from 'primevue/select'
import { useQuestModuleStore } from '@/modules/quests/store'
import { useQuestPreviewData } from '@/modules/quests/composables/useQuestPreviewData'
import { loadClientFonts } from '@core/wow/clientFonts'
import QuestPreviewText from './preview/QuestPreviewText.vue'
import QuestPreviewItem from './preview/QuestPreviewItem.vue'
import QuestPreviewMoney from './preview/QuestPreviewMoney.vue'
import QuestPreviewRewards from './preview/QuestPreviewRewards.vue'
import type { PreviewRewards, PreviewSlot } from './preview/types'

/**
 * The quest as a player sees it in the 3.3.5 client, live while it is edited:
 * the quest log entry, and the three quest-giver panels (offer, progress when
 * turning in, completion). Reads the quest store directly, like the editor tabs.
 *
 * Names come from the database; icons, spell names and the game's fonts from
 * the WoW client when one is configured (placeholders otherwise).
 */

type Mode = 'log' | 'offer' | 'progress' | 'reward'

const { t } = useI18n()
const store = useQuestModuleStore()
const form = store.formData
const fields = form as unknown as Record<string, unknown>
const { items, creatures, gameobjects, spells, itemIcon } = useQuestPreviewData()

onMounted(() => { loadClientFonts() })

const mode = ref<Mode>('offer')
const modes = computed<{ value: Mode; label: string }[]>(() => [
  { value: 'log', label: t('quest_preview.modes.log') },
  { value: 'offer', label: t('quest_preview.modes.offer') },
  { value: 'progress', label: t('quest_preview.modes.progress') },
  { value: 'reward', label: t('quest_preview.modes.reward') },
])

// ─── Locale ──────────────────────────────────────────────────────────────────

/** The default (quest_template) texts; not '' because Select shows no label for it. */
const DEFAULT_LOCALE = 'default'
const locale = ref(DEFAULT_LOCALE)

const locales = computed(() => {
  const set = new Set<string>()
  for (const e of store.locales.getNewEntries()) set.add(e.locale)
  for (const e of store.offerRewardLocales.getNewEntries()) set.add(e.locale)
  for (const e of store.requestItemsLocales.getNewEntries()) set.add(e.locale)
  return [...set].sort()
})

const localeOptions = computed(() => [
  { value: DEFAULT_LOCALE, label: t('quest_preview.defaultLocale') },
  ...locales.value.map(l => ({ value: l, label: l })),
])

watch(locales, list => {
  if (locale.value !== DEFAULT_LOCALE && !list.includes(locale.value)) locale.value = DEFAULT_LOCALE
})

/** Like the server: a locale string replaces the default only when non-empty. */
function pick(localized: string | null | undefined, fallback: string | null | undefined): string {
  return localized || fallback || ''
}

const texts = computed(() => {
  const loc = store.locales.getNewEntries().find(e => e.locale === locale.value)
  const offerLoc = store.offerRewardLocales.getNewEntries().find(e => e.locale === locale.value)
  const reqLoc = store.requestItemsLocales.getNewEntries().find(e => e.locale === locale.value)
  return {
    title: pick(loc?.LogTitle, form.LogTitle),
    description: pick(loc?.QuestDescription, form.QuestDescription),
    objectives: pick(loc?.LogDescription, form.LogDescription),
    area: pick(loc?.AreaDescription, form.AreaDescription),
    objectiveTexts: [1, 2, 3, 4].map(i => pick(
      (loc as Record<string, string | null> | undefined)?.[`ObjectiveText${i}`],
      fields[`ObjectiveText${i}`] as string | undefined,
    )),
    completion: pick(reqLoc?.CompletionText, store.requestItems.newEntry.CompletionText),
    reward: pick(offerLoc?.RewardText, store.offerReward.newEntry.RewardText),
  }
})

// ─── Resolved references ─────────────────────────────────────────────────────

function num(field: string): number {
  return Number(fields[field] ?? 0) || 0
}

function itemSlot(key: string, entry: number, count: number): PreviewSlot {
  const item = items.get(entry)
  return {
    key,
    name: item?.name || `#${entry}`,
    icon: itemIcon(entry),
    count,
    quality: item?.quality,
    missing: item === null,
  }
}

function itemSlots(idPrefix: string, countPrefix: string, n: number): PreviewSlot[] {
  const slots: PreviewSlot[] = []
  for (let i = 1; i <= n; i++) {
    const entry = num(`${idPrefix}${i}`)
    if (entry) slots.push(itemSlot(`${idPrefix}${i}`, entry, num(`${countPrefix}${i}`)))
  }
  return slots
}

function nameOf(cache: Map<number, string | null>, id: number): string {
  return cache.get(id) || `#${id}`
}

const rewards = computed<PreviewRewards>(() => {
  const spellId = num('RewardDisplaySpell') || Math.max(0, num('RewardSpell'))
  const spell = spellId ? spells.get(spellId) : undefined
  return {
    choices: itemSlots('RewardChoiceItemID', 'RewardChoiceItemQuantity', 6),
    items: itemSlots('RewardItem', 'RewardAmount', 4),
    money: num('RewardMoney'),
    spell: spellId
      ? {
          key: `spell-${spellId}`,
          name: spell ? [spell.name, spell.rank].filter(Boolean).join(' ') : `#${spellId}`,
          icon: spell?.icon ?? '',
          missing: spell === null,
          aura: spell?.isAura ?? false,
        }
      : null,
    honor: num('RewardHonor'),
    arena: num('RewardArenaPoints'),
    talents: num('RewardTalents'),
    title: num('RewardTitle'),
  }
})

const hasRewards = computed(() => {
  const r = rewards.value
  return r.choices.length > 0 || r.items.length > 0 || r.money > 0 || r.spell != null
    || r.honor > 0 || r.arena > 0 || r.talents > 0 || r.title > 0
})

const requiredItems = computed(() => itemSlots('RequiredItemId', 'RequiredItemCount', 6))
const requiredMoney = computed(() => Math.max(0, -num('RewardMoney')))

/** The quest log's objective lines ("Kobold Vermin slain: 0/10"…). */
const objectiveLines = computed(() => {
  const lines: string[] = []
  for (let i = 1; i <= 4; i++) {
    const id = num(`RequiredNpcOrGo${i}`)
    const count = num(`RequiredNpcOrGoCount${i}`)
    if (!id || count <= 0) continue
    const custom = texts.value.objectiveTexts[i - 1]
    const label = custom
      || (id > 0
        ? t('quest_preview.objectives.slain', { name: nameOf(creatures, id) })
        : nameOf(gameobjects, -id))
    lines.push(t('quest_preview.objectives.progress', { label, count }))
  }
  for (const slot of requiredItems.value) {
    lines.push(t('quest_preview.objectives.progress', { label: slot.name, count: slot.count ?? 0 }))
  }
  const kills = num('RequiredPlayerKills')
  if (kills > 0) {
    lines.push(t('quest_preview.objectives.progress', { label: t('quest_preview.objectives.players'), count: kills }))
  }
  if (texts.value.area) lines.push(texts.value.area)
  return lines
})

/** Frame title: who the player is talking to (first giver / ender). */
const frameTitle = computed(() => {
  if (mode.value === 'log') return t('quest_preview.frame.questLog')
  const [creatureMgr, goMgr] = mode.value === 'offer'
    ? [store.creatureStarters, store.gameobjectStarters]
    : [store.creatureEnders, store.gameobjectEnders]
  const creature = creatureMgr.getNewEntries()[0]
  if (creature) return nameOf(creatures, creature.id)
  const go = goMgr.getNewEntries()[0]
  if (go) return nameOf(gameobjects, go.id)
  return mode.value === 'offer' ? t('quest_preview.frame.noGiver') : t('quest_preview.frame.noEnder')
})

const suggestedPlayers = computed(() => num('SuggestedGroupNum'))

function timeLimit(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m ? (s ? `${m} min ${s} s` : `${m} min`) : `${s} s`
}
</script>

<template>
  <div class="quest-preview">
    <div class="qp-modes" role="tablist">
        <button
          v-for="m in modes"
          :key="m.value"
          type="button"
          role="tab"
          class="qp-mode"
          :class="{ active: mode === m.value }"
          :aria-selected="mode === m.value"
          @click="mode = m.value"
        >{{ m.label }}</button>
    </div>

    <label v-if="locales.length" class="qp-locale">
      <span>{{ t('quest_preview.locale') }}</span>
      <Select
        v-model="locale"
        :options="localeOptions"
        optionLabel="label"
        optionValue="value"
      />
    </label>

    <div class="qp-frame">
      <div class="qp-frame-title">{{ frameTitle }}</div>

      <div class="qp-parchment">
        <h2 class="qp-title">{{ texts.title || t('quest_preview.untitled') }}</h2>

        <!-- Quest log -->
        <template v-if="mode === 'log'">
          <QuestPreviewText :text="texts.objectives" field="LogDescription" />
          <p v-if="form.TimeAllowed > 0" class="qp-line">{{ t('quest_preview.timeLeft', { time: timeLimit(form.TimeAllowed) }) }}</p>
          <ul v-if="objectiveLines.length" class="qp-objectives">
            <li v-for="(line, i) in objectiveLines" :key="i">{{ line }}</li>
          </ul>
          <p v-if="requiredMoney > 0" class="qp-line qp-receive">
            <span>{{ t('quest_preview.requiredMoney') }}</span>
            <QuestPreviewMoney :copper="requiredMoney" />
          </p>
          <p v-if="suggestedPlayers > 0" class="qp-line">{{ t('quest_preview.suggestedPlayers', { n: suggestedPlayers }) }}</p>
          <h3 class="qp-header">{{ t('quest_preview.headers.description') }}</h3>
          <QuestPreviewText :text="texts.description" field="QuestDescription" />
          <QuestPreviewRewards v-if="hasRewards" :rewards="rewards" />
        </template>

        <!-- Quest giver: offer -->
        <template v-else-if="mode === 'offer'">
          <QuestPreviewText :text="texts.description" field="QuestDescription" />
          <h3 class="qp-header">{{ t('quest_preview.headers.objectives') }}</h3>
          <QuestPreviewText :text="texts.objectives" field="LogDescription" />
          <p v-if="suggestedPlayers > 0" class="qp-line">{{ t('quest_preview.suggestedPlayers', { n: suggestedPlayers }) }}</p>
          <QuestPreviewRewards v-if="hasRewards" :rewards="rewards" />
        </template>

        <!-- Quest ender: progress (turn-in with required items) -->
        <template v-else-if="mode === 'progress'">
          <p v-if="!requiredItems.length && requiredMoney <= 0" class="qp-note">{{ t('quest_preview.progressSkipped') }}</p>
          <QuestPreviewText :text="texts.completion" field="CompletionText" />
          <template v-if="requiredItems.length || requiredMoney > 0">
            <h3 class="qp-header">{{ t('quest_preview.headers.requiredItems') }}</h3>
            <div v-if="requiredItems.length" class="qp-grid">
              <QuestPreviewItem v-for="slot in requiredItems" :key="slot.key" :name="slot.name" :icon="slot.icon" :count="slot.count" :quality="slot.quality" :missing="slot.missing" />
            </div>
            <p v-if="requiredMoney > 0" class="qp-line qp-receive">
              <span>{{ t('quest_preview.requiredMoney') }}</span>
              <QuestPreviewMoney :copper="requiredMoney" />
            </p>
          </template>
        </template>

        <!-- Quest ender: completion -->
        <template v-else>
          <QuestPreviewText :text="texts.reward" field="RewardText" />
          <QuestPreviewRewards v-if="hasRewards" :rewards="rewards" choosing />
        </template>
      </div>

      <div class="qp-buttons">
        <template v-if="mode === 'log'">
          <span class="qp-button">{{ t('quest_preview.buttons.abandon') }}</span>
          <span class="qp-button">{{ t('quest_preview.buttons.share') }}</span>
        </template>
        <template v-else-if="mode === 'offer'">
          <button type="button" class="qp-button" @click="mode = 'log'">{{ t('quest_preview.buttons.accept') }}</button>
          <span class="qp-button">{{ t('quest_preview.buttons.decline') }}</span>
        </template>
        <template v-else-if="mode === 'progress'">
          <button type="button" class="qp-button" @click="mode = 'reward'">{{ t('quest_preview.buttons.continue') }}</button>
          <span class="qp-button">{{ t('quest_preview.buttons.cancel') }}</span>
        </template>
        <span v-else class="qp-button">{{ t('quest_preview.buttons.complete') }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.quest-preview {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* ─── Editor chrome (app style) ─────────────────────────────────────────── */

.qp-modes {
  display: flex;
  min-width: 0;
  padding: 2px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius);
  background: var(--surface-input-soft);
}

.qp-mode {
  flex: 1;
  min-width: 0;
  padding: 0.25rem 0.2rem;
  border: none;
  border-radius: calc(var(--radius) - 2px);
  background: transparent;
  color: var(--text-muted);
  font-family: inherit;
  font-size: 0.68rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

.qp-mode:hover {
  color: var(--text);
}

.qp-mode.active {
  background: var(--accent-soft);
  color: var(--accent);
}

.qp-locale {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.72rem;
  color: var(--text-muted);
  white-space: nowrap;
}

/* Compact select matching the mode switch above. Not `size="small"`: its
   vertical padding fights the fixed height/line-height forms.css gives every
   select, which pushes the label off-centre. */
.qp-locale :deep(.p-select) {
  flex: 1;
  min-width: 0;
  height: var(--input-height-sm);
}

.qp-locale :deep(.p-select-label) {
  padding: 0 0.6rem;
  font-size: 0.75rem;
  line-height: calc(var(--input-height-sm) - 2px);
}

/* ─── In-game frame ─────────────────────────────────────────────────────── */

.qp-frame {
  --qp-ink: #2a1a0a;
  --qp-heading-font: 'WoW Morpheus', 'Palatino Linotype', 'Book Antiqua', Georgia, serif;
  --qp-body-font: 'WoW Friz Quadrata', 'Palatino Linotype', 'Book Antiqua', Georgia, serif;
  display: flex;
  flex-direction: column;
  border: 2px solid #3b2a14;
  border-radius: 5px;
  background: #140e07;
  box-shadow: inset 0 0 0 1px rgba(214, 170, 80, 0.35), 0 4px 14px rgba(0, 0, 0, 0.45);
  overflow: hidden;
}

.qp-frame-title {
  padding: 0.35rem 0.6rem;
  text-align: center;
  font-family: var(--qp-body-font);
  font-size: 0.78rem;
  color: #ffd100;
  text-shadow: 1px 1px 0 #000;
  background: linear-gradient(#2c1f10, #140e07);
  border-bottom: 1px solid rgba(214, 170, 80, 0.35);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.qp-parchment {
  max-height: 30rem;
  overflow-y: auto;
  padding: 0.75rem 0.8rem 0.4rem;
  color: var(--qp-ink);
  font-family: var(--qp-body-font);
  font-size: 0.78rem;
  line-height: 1.4;
  background:
    radial-gradient(ellipse at 20% 10%, rgba(255, 250, 225, 0.55), transparent 55%),
    radial-gradient(ellipse at 85% 90%, rgba(150, 100, 40, 0.22), transparent 60%),
    radial-gradient(ellipse at center, transparent 55%, rgba(110, 70, 25, 0.38)),
    linear-gradient(170deg, #efdcb0, #dcc190 60%, #cfb07a);
  scrollbar-width: thin;
  scrollbar-color: rgba(90, 60, 25, 0.55) transparent;
}

.qp-title,
.qp-parchment :deep(.qp-header) {
  font-family: var(--qp-heading-font);
  font-weight: 400;
  color: #000;
  text-shadow: 1px 1px 0 rgba(160, 120, 50, 0.45);
}

.qp-title {
  margin: 0 0 0.6rem;
  font-size: 1.15rem;
  line-height: 1.2;
}

.qp-parchment :deep(.qp-header) {
  margin: 0.4rem 0 0.4rem;
  font-size: 1rem;
}

.qp-parchment :deep(.qp-line) {
  margin: 0 0 0.45rem;
}

.qp-parchment :deep(.qp-receive) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.qp-objectives {
  list-style: none;
  margin: 0 0 0.7rem;
  padding: 0;
}

.qp-objectives li {
  padding-left: 0.6rem;
}

.qp-parchment :deep(.qp-grid) {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.4rem 0.5rem;
  margin-bottom: 0.7rem;
}

.qp-note {
  margin: 0 0 0.6rem;
  padding: 0.3rem 0.45rem;
  border-left: 2px solid rgba(90, 60, 25, 0.5);
  background: rgba(90, 60, 25, 0.1);
  font-family: system-ui, sans-serif;
  font-size: 0.68rem;
  font-style: italic;
  opacity: 0.8;
}

.qp-buttons {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.4rem 0.5rem;
  background: linear-gradient(#1c140a, #0e0a05);
  border-top: 1px solid rgba(214, 170, 80, 0.35);
}

/* The client's red UIPanelButton. */
.qp-button {
  min-width: 5.5rem;
  padding: 0.22rem 0.6rem;
  border: 1px solid #1f0703;
  border-radius: 3px;
  background: linear-gradient(#a3281b, #6e150b 55%, #4d0c05);
  box-shadow: inset 0 1px 0 rgba(255, 190, 120, 0.35);
  color: #ffd100;
  font-family: var(--qp-body-font);
  font-size: 0.7rem;
  text-align: center;
  text-shadow: 1px 1px 0 #000;
  cursor: default;
}

button.qp-button {
  cursor: pointer;
}

button.qp-button:hover {
  color: #fff;
}
</style>

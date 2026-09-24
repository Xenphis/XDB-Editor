import { computed, onBeforeUnmount, reactive, watch } from 'vue'
import { getQuestPreviewRefs, type QuestPreviewItem } from '@/modules/quests/service'
import { useQuestModuleStore } from '@/modules/quests/store'
import { resolveItemIcons } from '@core/wow/itemDbc'
import { resolveSpellNames, type SpellInfo } from '@core/wow/spellDbc'

const DEBOUNCE_MS = 300

/** Non-zero values of `form[prefix + 1..count]`. */
function idsOf(form: Record<string, unknown>, prefix: string, count: number): number[] {
  const ids: number[] = []
  for (let i = 1; i <= count; i++) {
    const v = Number(form[`${prefix}${i}`] ?? 0)
    if (v) ids.push(v)
  }
  return ids
}

/**
 * Resolves every id the in-game quest preview shows by name — items (plus
 * their client icon), kill / use objectives, quest givers and enders, the
 * reward spell — as the quest is edited.
 *
 * Lookups are cached per preview instance (`null` = looked up, not found) so
 * typing into an id field only fetches the ids not seen yet, and they are
 * debounced so a half-typed id doesn't hit the database on every keystroke.
 * Without a WoW client the names still resolve; only icons and spell names are
 * missing.
 */
export function useQuestPreviewData() {
  const store = useQuestModuleStore()
  const form = store.formData as unknown as Record<string, unknown>

  const items = reactive(new Map<number, QuestPreviewItem | null>())
  const creatures = reactive(new Map<number, string | null>())
  const gameobjects = reactive(new Map<number, string | null>())
  const icons = reactive(new Map<number, string | null>())
  const spells = reactive(new Map<number, SpellInfo | null>())

  const wanted = computed(() => {
    const npcOrGo = idsOf(form, 'RequiredNpcOrGo', 4)
    return {
      items: [
        ...idsOf(form, 'RequiredItemId', 6),
        ...idsOf(form, 'RewardItem', 4),
        ...idsOf(form, 'RewardChoiceItemID', 6),
      ],
      creatures: [
        ...npcOrGo.filter(id => id > 0),
        ...store.creatureStarters.getNewEntries().map(e => e.id),
        ...store.creatureEnders.getNewEntries().map(e => e.id),
      ],
      gameobjects: [
        ...npcOrGo.filter(id => id < 0).map(id => -id),
        ...store.gameobjectStarters.getNewEntries().map(e => e.id),
        ...store.gameobjectEnders.getNewEntries().map(e => e.id),
      ],
      spells: [Number(form.RewardDisplaySpell) || 0, Number(form.RewardSpell) || 0].filter(id => id > 0),
    }
  })

  function missing<T>(cache: Map<number, T>, ids: number[]): number[] {
    return [...new Set(ids)].filter(id => !cache.has(id))
  }

  async function resolve() {
    const want = wanted.value
    const itemIds = missing(items, want.items)
    const creatureIds = missing(creatures, want.creatures)
    const goIds = missing(gameobjects, want.gameobjects)
    const spellIds = missing(spells, want.spells)

    if (itemIds.length || creatureIds.length || goIds.length) {
      try {
        const refs = await getQuestPreviewRefs(itemIds, creatureIds, goIds)
        for (const id of itemIds) items.set(id, refs.items.find(i => i.entry === id) ?? null)
        for (const id of creatureIds) creatures.set(id, refs.creatures.find(c => c.entry === id)?.name ?? null)
        for (const id of goIds) gameobjects.set(id, refs.gameobjects.find(g => g.entry === id)?.name ?? null)
      } catch (e) {
        console.error('Quest preview lookup failed:', e)
      }
    }

    const displayIds = missing(
      icons,
      want.items.map(id => items.get(id)?.displayId ?? 0).filter(id => id > 0),
    )
    if (displayIds.length) {
      try {
        const found = await resolveItemIcons(displayIds)
        for (const id of displayIds) icons.set(id, found[id] ?? null)
      } catch {
        // No client configured / loaded: items keep a placeholder icon.
      }
    }

    if (spellIds.length) {
      try {
        const found = await resolveSpellNames(spellIds)
        for (const id of spellIds) spells.set(id, found[id] ?? null)
      } catch {
        // No client: the spell reward falls back to its id.
      }
    }
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  watch(wanted, () => {
    clearTimeout(timer)
    timer = setTimeout(resolve, DEBOUNCE_MS)
  }, { immediate: true, deep: true })
  onBeforeUnmount(() => clearTimeout(timer))

  function itemIcon(entry: number): string {
    const displayId = items.get(entry)?.displayId
    return (displayId && icons.get(displayId)) || ''
  }

  return { items, creatures, gameobjects, spells, itemIcon }
}

import { ref, watch, onBeforeUnmount } from 'vue'
import { searchSpells, hasClientConfigured, NoClientError, type SpellInfo, type SpellKind } from '@core/wow/spellDbc'

/**
 * Debounced spell search against the client's Spell.dbc index, shared by
 * every place that lets a user find a spell by name (`SpellPicker`, the
 * spells list page, and future `spell_*` editors).
 *
 * Degrades on purpose: with no client configured, `noClient` is set instead
 * of throwing, so callers can show an explanatory empty state rather than an
 * error.
 */
export function useSpellSearch(options: { limit?: number; debounceMs?: number } = {}) {
  const limit = options.limit ?? 200
  const debounceMs = options.debounceMs ?? 250

  const query = ref('')
  /** Restricts the list to spells or auras; `undefined` = no filter. */
  const kind = ref<SpellKind | undefined>(undefined)
  const results = ref<SpellInfo[]>([])
  const loading = ref(false)
  const noClient = ref(false)

  // Guards against an older, slower request landing after a newer one.
  let token = 0
  let debounce: ReturnType<typeof setTimeout> | undefined

  async function runSearch(value: string) {
    const current = ++token
    loading.value = true
    try {
      const rows = await searchSpells(value, limit, kind.value)
      if (current !== token) return
      results.value = rows
      noClient.value = false
    } catch (e) {
      if (current !== token) return
      results.value = []
      noClient.value = e instanceof NoClientError
      if (!noClient.value) console.error('[useSpellSearch] search failed', e)
    } finally {
      if (current === token) loading.value = false
    }
  }

  function refresh() {
    noClient.value = !hasClientConfigured()
    if (noClient.value) {
      results.value = []
      return
    }
    runSearch(query.value)
  }

  watch(query, value => {
    clearTimeout(debounce)
    debounce = setTimeout(() => runSearch(value), debounceMs)
  })

  // The kind filter re-runs immediately — it's a discrete dropdown pick, not
  // something that benefits from debouncing like keystrokes do.
  watch(kind, () => runSearch(query.value))

  onBeforeUnmount(() => clearTimeout(debounce))

  return { query, kind, results, loading, noClient, refresh }
}

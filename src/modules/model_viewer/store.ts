import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { ModelPreviewSource } from './types'

const STORAGE_KEY = 'modelPreview:settings'

interface PersistedState {
  source: ModelPreviewSource
  onlineFallback: boolean
}

function readInitial(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>
      return {
        // Anything but an explicit 'online' means local — including the
        // settings written before local rendering existed, whose 'local' value
        // used to mean "show a placeholder".
        source: parsed.source === 'online' ? 'online' : 'local',
        onlineFallback: parsed.onlineFallback !== false,
      }
    }
  } catch {
    /* ignore corrupted storage */
  }
  return { source: 'local', onlineFallback: true }
}

/**
 * Persisted preferences for the NPC / GameObject model preview.
 *
 * - `source`         : 'local' renders from the WoW client configured for the
 *                      map editor (`mapEditor.clientPath`); 'online' always
 *                      uses the Wowhead model database instead.
 * - `onlineFallback` : with 'local' selected, fall back to the online viewer
 *                      when no client is configured or the display id isn't in
 *                      the client's files.
 *
 * There is deliberately no data-folder setting of its own: the client folder is
 * a single app-wide setting, shared with the map editor, so pointing the app at
 * a client lights up both features at once.
 */
export const useModelPreviewStore = defineStore('modelPreview', () => {
  const initial = readInitial()
  const source = ref<ModelPreviewSource>(initial.source)
  const onlineFallback = ref<boolean>(initial.onlineFallback)

  watch([source, onlineFallback], () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ source: source.value, onlineFallback: onlineFallback.value }),
      )
    } catch {
      /* ignore storage quota errors */
    }
  })

  return { source, onlineFallback }
})

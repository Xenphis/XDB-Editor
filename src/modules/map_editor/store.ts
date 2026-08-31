import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { MinimapMapInfo } from './types'

const STORAGE_KEY = 'mapEditor:settings'

interface PersistedState {
  clientPath: string
  lastMapId: string
  lastZoneId: string
  showSpawns: boolean
  spawnPhase: number | null
}

function readInitial(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>
      return {
        clientPath: typeof parsed.clientPath === 'string' ? parsed.clientPath : '',
        lastMapId: typeof parsed.lastMapId === 'string' ? parsed.lastMapId : '',
        lastZoneId: typeof parsed.lastZoneId === 'string' ? parsed.lastZoneId : '',
        showSpawns: typeof parsed.showSpawns === 'boolean' ? parsed.showSpawns : false,
        spawnPhase: typeof parsed.spawnPhase === 'number' ? parsed.spawnPhase : null,
      }
    }
  } catch {
    /* ignore corrupted storage */
  }
  return { clientPath: '', lastMapId: '', lastZoneId: '', showSpawns: false, spawnPhase: null }
}

/**
 * Map-editor session state. The client path and last opened map persist
 * across restarts; the map list is re-indexed from the MPQs on load.
 */
export const useMapEditorStore = defineStore('mapEditor', () => {
  const initial = readInitial()
  const clientPath = ref<string>(initial.clientPath)
  const lastMapId = ref<string>(initial.lastMapId)
  /** Selected zone slug (data/zones.ts); '' when browsing maps directly. */
  const lastZoneId = ref<string>(initial.lastZoneId)
  /** Show creature spawns in the 3D view (streamed around the camera). */
  const showSpawns = ref<boolean>(initial.showSpawns)
  /** Only stream spawns visible in this phase (bitmask); null = every phase. */
  const spawnPhase = ref<number | null>(initial.spawnPhase)
  /** Maps returned by the last successful minimap_load_client call. */
  const maps = ref<MinimapMapInfo[]>([])

  watch([clientPath, lastMapId, lastZoneId, showSpawns, spawnPhase], () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          clientPath: clientPath.value,
          lastMapId: lastMapId.value,
          lastZoneId: lastZoneId.value,
          showSpawns: showSpawns.value,
          spawnPhase: spawnPhase.value,
        }),
      )
    } catch {
      /* ignore storage quota errors */
    }
  })

  return { clientPath, lastMapId, lastZoneId, showSpawns, spawnPhase, maps }
})

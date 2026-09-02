import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { MinimapMapInfo, RenderQuality } from './types'

const STORAGE_KEY = 'mapEditor:settings'

interface PersistedState {
  clientPath: string
  lastMapId: string
  lastZoneId: string
  spawnPhase: number | null
  renderQuality: RenderQuality
}

const RENDER_QUALITIES: readonly RenderQuality[] = ['low', 'medium', 'high']

function readQuality(value: unknown): RenderQuality {
  return RENDER_QUALITIES.includes(value as RenderQuality) ? (value as RenderQuality) : 'high'
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
        spawnPhase: typeof parsed.spawnPhase === 'number' ? parsed.spawnPhase : null,
        renderQuality: readQuality(parsed.renderQuality),
      }
    }
  } catch {
    /* ignore corrupted storage */
  }
  return {
    clientPath: '',
    lastMapId: '',
    lastZoneId: '',
    spawnPhase: null,
    renderQuality: 'high',
  }
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
  /** Only stream spawns visible in this phase (bitmask); null = every phase. */
  const spawnPhase = ref<number | null>(initial.spawnPhase)
  /**
   * How much the 3D view asks of the GPU. Mostly the streaming radius, which is
   * very nearly the draw-call count in this renderer — see the preset table in
   * `WorldScene3D.vue`. Defaults to `high`, the library's own default, so an
   * existing install renders exactly as it did.
   */
  const renderQuality = ref<RenderQuality>(initial.renderQuality)
  /** Maps returned by the last successful minimap_load_client call. */
  const maps = ref<MinimapMapInfo[]>([])

  watch([clientPath, lastMapId, lastZoneId, spawnPhase, renderQuality], () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          clientPath: clientPath.value,
          lastMapId: lastMapId.value,
          lastZoneId: lastZoneId.value,
          spawnPhase: spawnPhase.value,
          renderQuality: renderQuality.value,
        }),
      )
    } catch {
      /* ignore storage quota errors */
    }
  })

  return { clientPath, lastMapId, lastZoneId, spawnPhase, renderQuality, maps }
})

import jQuery from 'jquery'
import type { ModelKind, ModelViewerHandle } from '../types'

/**
 * Online model preview backed by the Wowhead `ZamModelViewer`, the same engine
 * used on wowhead.com. Models are rendered by *display id* using Blizzard's
 * CDN-extracted data — no local files required.
 *
 * This is the *fallback* source: the preview renders from the user's own
 * client files (`./local.ts`) whenever a client folder is configured, and only
 * falls back here when it isn't, or when the local pipeline can't resolve the
 * display id. See `../service.ts` for the dispatch.
 *
 * Target: AzerothCore / TrinityCore 3.3.5a (WotLK), so we use the "wrath"
 * content branch and the "classic" data environment.
 *
 * Caveats:
 *  - Requires network access to wow.zamimg.com (+ a permissive CSP, currently null).
 *  - Custom/private display ids that don't exist in Blizzard data won't render
 *    (the caller surfaces an "error" state for that case). Those are exactly
 *    the ids a local client patch *does* have, which is why local comes first.
 */

/**
 * Content path served by the Rust-side `wowcdn://` proxy (see model_proxy.rs),
 * which forwards to the Wowhead WotLK (Wrath) CDN. Going through the proxy is
 * required because the webview blocks the viewer's cross-origin data XHRs (CORS).
 * The custom-scheme URL format differs on Windows vs. macOS/Linux.
 */
const CDN_HOST = navigator.userAgent.includes('Windows')
  ? 'http://wowcdn.localhost/'
  : 'wowcdn://localhost/'
/** WotLK 3.3.5 model + texture data branch (`.m2` models, `.webp` textures). */
const CONTENT_PATH = `${CDN_HOST}modelviewer/wrath/`
/**
 * Viewer engine, loaded from the `live` branch on purpose: it's the current
 * build that reads `.m2` models (matching the wrath data), whereas the `wrath`
 * branch still ships an older engine that requests the long-removed `.mo3`
 * format and so renders nothing. Both define the global `ZamModelViewer`.
 */
const VIEWER_SCRIPT = `${CDN_HOST}modelviewer/live/viewer/viewer.min.js`
/** Non-retail data environment used by WotLK content. */
const ENV = 'classic'

/** Wowhead content types (from wow-model-viewer's `modelingType`). */
const KIND_TYPE: Record<ModelKind, number> = {
  creature: 8, // NPC
  gameobject: 64, // OBJECT
}

type GenerateModels = (
  aspect: number,
  containerSelector: string,
  model: { id: number; type: number },
  env: string,
) => Promise<{ destroy?: () => void }>

let loadPromise: Promise<GenerateModels> | null = null

function injectViewerScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-wow-viewer="1"]')
    if (existing) {
      if (existing.dataset.loaded === '1') resolve()
      else {
        existing.addEventListener('load', () => resolve())
        existing.addEventListener('error', () => reject(new Error('Failed to load the model viewer script')))
      }
      return
    }
    const script = document.createElement('script')
    script.src = VIEWER_SCRIPT
    script.async = true
    script.dataset.wowViewer = '1'
    script.addEventListener('load', () => {
      script.dataset.loaded = '1'
      resolve()
    })
    script.addEventListener('error', () => reject(new Error('Failed to load the model viewer script')))
    document.head.appendChild(script)
  })
}

/** Lazily bootstrap jQuery + the Wowhead viewer + the wrapper exactly once. */
function ensureLoaded(): Promise<GenerateModels> {
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    const w = window as unknown as Record<string, unknown>

    // jQuery must be a global for both the viewer script and the wrapper.
    if (!w.jQuery) w.jQuery = jQuery
    if (!w.$) w.$ = jQuery

    // CONTENT_PATH must be set *before* importing the wrapper: its setup module
    // reads it once at import time.
    if (!w.CONTENT_PATH) w.CONTENT_PATH = CONTENT_PATH

    await injectViewerScript()
    // The viewer script defines a global `ZamModelViewer` the wrapper extends.
    // It may be a lexical global (not a `window` property), so a missing window
    // property is only a soft signal — let the wrapper surface a hard error.
    if (!w.ZamModelViewer) {
      console.warn('[modelViewer] ZamModelViewer not found on window after script load')
    }

    const mod = (await import('wow-model-viewer')) as unknown as { generateModels: GenerateModels }
    return mod.generateModels
  })()

  // Allow a later retry if bootstrapping failed (offline, CDN blocked, …).
  loadPromise.catch(() => {
    loadPromise = null
  })

  return loadPromise
}

/**
 * Renders a creature or gameobject model (by display id) into the element
 * matched by `containerSelector`. Resolves to a handle whose `destroy()`
 * releases the viewer. Rejects if the viewer can't load or the model isn't
 * found.
 */
export async function renderOnlineModel(
  containerSelector: string,
  kind: ModelKind,
  displayId: number,
  aspect = 1,
): Promise<ModelViewerHandle> {
  const generateModels = await ensureLoaded()
  const viewer = await generateModels(
    aspect,
    containerSelector,
    { id: displayId, type: KIND_TYPE[kind] },
    ENV,
  )

  return {
    destroy() {
      try {
        viewer?.destroy?.()
      } catch {
        /* viewer teardown is best-effort */
      }
    },
  }
}

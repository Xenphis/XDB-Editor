import type { ModelKind, ModelPreviewSource, ModelViewerHandle } from './types'

/**
 * Picks where a model preview comes from and renders it.
 *
 * The client files win by default: they are the data the server's players
 * actually load, so custom display ids shipped in a private patch MPQ render
 * exactly as in game — something the online (Wowhead) viewer can never do,
 * since it only knows Blizzard's own data. The online viewer stays as the
 * fallback for users who haven't pointed the app at a WoW client, and can be
 * selected outright in Settings.
 *
 * Each engine drags in a renderer of its own (three.js + @wowserhq/scene for
 * local, jQuery + the Wowhead viewer for online), so both are imported on
 * demand: a workspace that never shows a preview loads neither, and a user
 * settled on one source never loads the other.
 */

export interface ModelRenderRequest {
  /** Element the renderer mounts its canvas into (local source). */
  container: HTMLElement
  /** The same element as a CSS selector — the Wowhead viewer takes one. */
  containerSelector: string
  kind: ModelKind
  displayId: number
  /** WoW client folder (shared app setting); '' when none is configured. */
  clientPath: string
  /** Preferred source, from the model-preview settings. */
  preferred: ModelPreviewSource
  /** Allow falling back to the online viewer when local can't render. */
  onlineFallback: boolean
}

export interface ModelRender extends ModelViewerHandle {
  /** Which source actually produced the picture. */
  source: ModelPreviewSource
}

let localEngine: Promise<typeof import('./services/local')> | null = null
let onlineEngine: Promise<typeof import('./services/online')> | null = null

export async function renderModel(request: ModelRenderRequest): Promise<ModelRender> {
  const { container, containerSelector, kind, displayId } = request

  if (request.preferred === 'online') {
    const online = await (onlineEngine ??= import('./services/online'))
    return withSource(await online.renderOnlineModel(containerSelector, kind, displayId), 'online')
  }

  const local = await (localEngine ??= import('./services/local'))
  try {
    const handle = await local.renderLocalModel(container, kind, displayId, request.clientPath)
    return withSource(handle, 'local')
  } catch (e) {
    if (!request.onlineFallback || !(e instanceof local.LocalModelError)) throw e
    // A local miss is expected often enough (no client configured yet, or a
    // display id the client's files don't have) that it isn't worth an error
    // in the console; what the user sees is the online attempt below.
    console.info('[modelViewer] local render unavailable, falling back online:', e.message)
    // The failed attempt may have appended a canvas before giving up.
    container.innerHTML = ''
    const online = await (onlineEngine ??= import('./services/online'))
    return withSource(await online.renderOnlineModel(containerSelector, kind, displayId), 'online')
  }
}

function withSource(handle: ModelViewerHandle, source: ModelPreviewSource): ModelRender {
  return { source, destroy: () => handle.destroy() }
}

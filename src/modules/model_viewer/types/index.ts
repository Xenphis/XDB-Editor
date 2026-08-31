/** What kind of entity a display id refers to. */
export type ModelKind = 'creature' | 'gameobject'

/**
 * Where model previews are sourced from.
 *
 * - `local`  : the user's WoW client files (MPQ), the default — renders custom
 *              display ids and works offline.
 * - `online` : the Wowhead model database; the fallback when no client folder
 *              is configured, and selectable on its own.
 */
export type ModelPreviewSource = 'local' | 'online'

/** A mounted viewer instance; `destroy()` releases its WebGL context. */
export interface ModelViewerHandle {
  destroy(): void
}

/**
 * The game's own UI fonts, read from the user's WoW client.
 *
 * Morpheus (quest titles and headers) and Friz Quadrata (body text) ship in
 * the client's `Fonts\` folder, so they are loaded from the MPQ chain over the
 * `mpq://` scheme and registered as `WoW Morpheus` / `WoW Friz Quadrata`.
 * Without a client nothing is registered and CSS falls through to the next
 * family in the stack — callers always declare a fallback.
 */
import { MPQ_ASSET_BASE_URL } from './assetHost'
import { ensureClient, hasClientConfigured } from './spellDbc'

/** Family name -> candidate files, first found wins (Cyrillic clients rename them). */
const FONTS: Record<string, string[]> = {
  'WoW Morpheus': ['Fonts/MORPHEUS.TTF', 'Fonts/MORPHEUS_CYR.TTF'],
  'WoW Friz Quadrata': ['Fonts/FRIZQT__.TTF', 'Fonts/FRIZQT___CYR.TTF'],
}

let loading: Promise<boolean> | null = null

async function loadFace(family: string, paths: string[]): Promise<boolean> {
  for (const path of paths) {
    try {
      const response = await fetch(`${MPQ_ASSET_BASE_URL}/${path}`)
      if (!response.ok) continue
      const face = new FontFace(family, await response.arrayBuffer())
      await face.load()
      document.fonts.add(face)
      return true
    } catch {
      // Try the next candidate.
    }
  }
  return false
}

async function loadAll(): Promise<boolean> {
  if (!hasClientConfigured()) return false
  await ensureClient()
  const results = await Promise.all(Object.entries(FONTS).map(([family, paths]) => loadFace(family, paths)))
  return results.some(Boolean)
}

/**
 * Registers the client's UI fonts once per session. Resolves to whether any
 * was found; a failed attempt (no client yet) is retried on the next call.
 */
export function loadClientFonts(): Promise<boolean> {
  if (!loading) {
    const attempt = loadAll().catch(() => false)
    loading = attempt
    attempt.then(ok => {
      if (!ok && loading === attempt) loading = null
    })
  }
  return loading
}

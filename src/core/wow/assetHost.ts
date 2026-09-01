/**
 * Where the frontend reads the user's WoW client assets from.
 *
 * The Rust side opens the 3.3.5 client MPQs as a patch chain and serves any
 * file inside them over the `mpq://` custom scheme (see `minimap.rs`). Both
 * the map editor's 3D view and the model preview stream their assets through
 * it, so the base URL lives here rather than inside either module.
 */

/** Custom-scheme URL format differs on Windows vs. macOS/Linux. */
function schemeHost(scheme: string): string {
  return navigator.userAgent.includes('Windows')
    ? `http://${scheme}.localhost`
    : `${scheme}://localhost`
}

/** Base URL for @wowserhq/scene's AssetHost (it appends `/<mpq path>`). */
export const MPQ_ASSET_BASE_URL = schemeHost('mpq')

/**
 * Same archives, but BLP textures re-encoded as PNG so they can be the `src` of
 * an `<img>` — the webview has no BLP decoder of its own.
 */
export const BLP_ASSET_BASE_URL = schemeHost('blp')

/**
 * Browser URL for a client texture, from the MPQ path the DBCs store
 * (backslashes, e.g. `Interface\Icons\Spell_Fire_FlameBolt.blp`).
 *
 * Returns '' for an empty path so callers can bind it straight to `<img>` and
 * hide the element on a falsy value — spells without an icon are ordinary.
 */
export function blpTextureUrl(mpqPath: string): string {
  if (!mpqPath) return ''
  const segments = mpqPath.split(/[\\/]/).map(encodeURIComponent)
  return `${BLP_ASSET_BASE_URL}/${segments.join('/')}`
}

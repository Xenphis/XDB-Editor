/**
 * Where the frontend reads the user's WoW client assets from.
 *
 * The Rust side opens the 3.3.5 client MPQs as a patch chain and serves any
 * file inside them over the `mpq://` custom scheme (see `minimap.rs`). Both
 * the map editor's 3D view and the model preview stream their assets through
 * it, so the base URL lives here rather than inside either module.
 */

/** Custom-scheme URL format differs on Windows vs. macOS/Linux. */
const MPQ_HOST = navigator.userAgent.includes('Windows')
  ? 'http://mpq.localhost'
  : 'mpq://localhost'

/** Base URL for @wowserhq/scene's AssetHost (it appends `/<mpq path>`). */
export const MPQ_ASSET_BASE_URL = MPQ_HOST

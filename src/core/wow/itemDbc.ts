/**
 * Item icons read from the user's WoW client.
 *
 * `item_template` only stores a `displayid`; the icon name lives in
 * `ItemDisplayInfo.dbc`, which the Rust side indexes out of the MPQ patch
 * chain (`client_item_icons`). Same degraded mode as spells: without a client
 * this throws `NoClientError` and callers simply show no icon.
 */
import { invoke } from '@tauri-apps/api/core'
import { ensureClient } from './spellDbc'

/**
 * Resolves item display ids to the MPQ path of their icon BLP (serve through
 * `blpTextureUrl`). Unknown ids are omitted.
 */
export async function resolveItemIcons(displayIds: number[]): Promise<Record<number, string>> {
  if (displayIds.length === 0) return {}
  await ensureClient()
  return invoke<Record<number, string>>('client_item_icons', { displayIds })
}

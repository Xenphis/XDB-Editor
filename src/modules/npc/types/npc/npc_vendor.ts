/** A `npc_vendor` row — one item sold by a vendor creature.
    Primary key: (entry, item, ExtendedCost). */
export interface NpcVendor {
  entry: number;
  slot: number;
  item: number;
  maxcount: number;
  incrtime: number;
  ExtendedCost: number;
}

/** A stock row joined with the sold item (name/quality may be missing when the
    referenced item no longer exists). */
export interface NpcVendorItem extends NpcVendor {
  itemName: string | null;
  itemQuality: number | null;
}

/** One row of the vendor list. */
export interface NpcVendorGroup {
  entry: number;
  itemCount: number;
  name: string | null;
  npcflag: number | null;
}

/** A creature offered by the "new vendor" picker. */
export interface VendorCreatureOption {
  entry: number;
  name: string | null;
  npcflag: number;
  itemCount: number;
}

/** An item offered by the "add item" picker. */
export interface VendorItemOption {
  entry: number;
  name: string;
  Quality: number;
  ItemLevel: number;
  BuyPrice: number;
}

/** UNIT_NPC_FLAG_VENDOR — a creature without it never opens a vendor window. */
export const UNIT_NPC_FLAG_VENDOR = 0x80

/** Colour for an `item_template.Quality`, as a token reference.
    The values live in `styles/tokens.css` so each theme picks a shade that
    stays readable on its own background — the canonical WoW colours are made
    for a black game background and several are unreadable on the light
    surface. Unknown/missing qualities fall back to muted text. */
export function itemQualityColor(quality: number | null): string {
  if (quality == null || quality < 0 || quality > 7) return 'var(--text-muted)'
  return `var(--quality-${quality})`
}

/**
 * The shape every `*_loot_template` table shares, mirroring the DB columns
 * exactly: primary key `(Entry, Item)` plus the eight drop settings.
 */
export interface LootTemplate {
  Entry: number;
  Item: number;
  Reference: number;
  Chance: number;
  /** `tinyint(1)`; the backend maps it to a real bool, as for gameobject loot. */
  QuestRequired: boolean;
  LootMode: number;
  GroupId: number;
  MinCount: number;
  MaxCount: number;
  /** `varchar(255) NULL` — null, never absent, on the wire. */
  Comment: string | null;
}

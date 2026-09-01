export interface CreatureTemplateAddon {
  entry: number
  path_id: number
  mount: number
  /** Packs StandState (byte 0) / unused (byte 1) / VisFlags (byte 2) / AnimTier (byte 3) — see bytesFields.ts. */
  bytes1: number
  /** Packs SheathState (byte 0) / PvPFlags (byte 1) / unused (bytes 2-3) — see bytesFields.ts. */
  bytes2: number
  emote: number
  visibilityDistanceType: number
  auras: string | null
}

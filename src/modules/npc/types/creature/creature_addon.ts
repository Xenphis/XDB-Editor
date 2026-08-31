export interface CreatureAddon {
  guid: number;
  path_id: number;
  mount: number;
  MountCreatureID: number;
  StandState: number;
  AnimTier: number;
  VisFlags: number;
  SheathState: number;
  PvPFlags: number;
  emote: number;
  visibilityDistanceType: number;
  auras: string | null;
}

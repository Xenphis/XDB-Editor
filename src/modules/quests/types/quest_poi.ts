export interface QuestPoi {
  QuestID: number;
  BlobIndex: number; // or Idx1
  Idx1?: number;
  MapID: number;
  UiMapID: number;
  Priority: number;
  Flags: number;
  WorldEffectID: number;
  PlayerConditionID: number;
  NavigationPlayerConditionID?: number;
  SpawnTrackingID?: number;
}

export interface QuestPoiPoints {
  QuestID: number;
  Idx1: number;
  Idx2: number;
  X: number;
  Y: number;
  Z: number;
}

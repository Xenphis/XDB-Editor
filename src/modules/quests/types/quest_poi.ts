export interface QuestPoi {
  QuestID: number;
  id: number;
  ObjectiveIndex: number;
  MapID: number;
  WorldMapAreaId: number;
  Floor: number;
  Priority: number;
  Flags: number;
  VerifiedBuild?: number;
}

export interface QuestPoiPoints {
  QuestID: number;
  Idx1: number;
  Idx2: number;
  X: number;
  Y: number;
  VerifiedBuild?: number;
}

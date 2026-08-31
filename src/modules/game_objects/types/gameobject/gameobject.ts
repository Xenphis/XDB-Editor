export interface GameObject {
  guid: number;
  id: number;
  map: number;
  zoneId: number;
  areaId: number;
  spawnMask: number;
  phaseMask: number;
  position_x: number;
  position_y: number;
  position_z: number;
  orientation: number;
  rotation0: number;
  rotation1: number;
  rotation2: number;
  rotation3: number;
  spawntimesecs: number;
  animprogress: number;
  state: number;
  ScriptName: string | null;
  StringId: string | null;
  VerifiedBuild: number | null;
}

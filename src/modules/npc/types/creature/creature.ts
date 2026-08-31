export interface Creature {
  guid: number
  id: number
  map: number
  zoneId: number
  areaId: number
  spawnMask: number
  phaseMask: number
  modelid: number
  equipment_id: number
  position_x: number
  position_y: number
  position_z: number
  orientation: number
  spawntimesecs: number
  wander_distance: number
  currentwaypoint: number
  curhealth: number
  curmana: number
  MovementType: number
  npcflag: number
  unit_flags: number
  dynamicflags: number
  ScriptName: string
  StringId: string | null
  VerifiedBuild: number | null
}

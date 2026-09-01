export interface CreatureTemplate {
  entry: number
  difficulty_entry_1: number
  difficulty_entry_2: number
  difficulty_entry_3: number
  KillCredit1: number
  KillCredit2: number
  name: string
  subname: string | null
  IconName: string | null
  gossip_menu_id: number
  minlevel: number
  maxlevel: number
  exp: number
  faction: number
  npcflag: number
  speed_walk: number
  speed_run: number
  speed_swim: number
  speed_flight: number
  detection_range: number
  rank: number
  dmgschool: number
  BaseAttackTime: number
  RangeAttackTime: number
  BaseVariance: number
  RangeVariance: number
  unit_class: number
  unit_flags: number
  unit_flags2: number
  dynamicflags: number
  family: number
  type: number
  type_flags: number
  lootid: number
  pickpocketloot: number
  skinloot: number
  PetSpellDataId: number
  VehicleId: number
  mingold: number
  maxgold: number
  AIName: string
  MovementType: number
  HoverHeight: number
  HealthModifier: number
  ManaModifier: number
  ArmorModifier: number
  DamageModifier: number
  ExperienceModifier: number
  RacialLeader: number
  movementId: number
  RegenHealth: number
  CreatureImmunitiesId: number
  flags_extra: number
  ScriptName: string
  VerifiedBuild: number | null
}

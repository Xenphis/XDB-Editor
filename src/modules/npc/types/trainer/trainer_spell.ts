export interface TrainerSpell {
  TrainerId: number
  SpellId: number
  MoneyCost: number
  ReqSkillLine: number
  ReqSkillRank: number
  ReqAbility1: number
  ReqAbility2: number
  ReqAbility3: number
  ReqLevel: number
  VerifiedBuild: number | null
}

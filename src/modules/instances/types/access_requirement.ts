export interface AccessRequirement {
  mapId: number
  difficulty: number
  level_min: number
  level_max: number
  item_level: number
  item: number
  item2: number
  quest_done_A: number
  quest_done_H: number
  completed_achievement: number
  quest_failed_text: string | null
  comment: string | null
}

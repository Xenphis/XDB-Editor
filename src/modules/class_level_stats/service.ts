import { invoke } from '@tauri-apps/api/core'
import type { CreatureClassLevelStats } from './types'

export async function getCreatureClassLevelStats(): Promise<CreatureClassLevelStats[]> {
  return invoke('get_creature_classlevelstats')
}

export async function getCreatureClassLevelStat(level: number, classId: number): Promise<CreatureClassLevelStats> {
  return invoke('get_creature_classlevelstat', { level, classId })
}

export async function saveCreatureClassLevelStat(data: CreatureClassLevelStats): Promise<void> {
  return invoke('save_creature_classlevelstat', { data })
}

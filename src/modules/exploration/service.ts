import { invoke } from '@tauri-apps/api/core'
import type { ExplorationBasexp } from './types'

export interface ExplorationBasexpListResult {
  data: ExplorationBasexp[]
  total: number
}

export async function getExplorationBasexps(
  search?: string,
  limit?: number,
  offset?: number,
): Promise<ExplorationBasexpListResult> {
  return invoke('get_exploration_basexps', { search, limit, offset })
}

export async function getExplorationBasexp(level: number): Promise<ExplorationBasexp> {
  return invoke('get_exploration_basexp', { level })
}

export async function saveExplorationBasexp(data: ExplorationBasexp): Promise<void> {
  return invoke('save_exploration_basexp', { data })
}

export async function deleteExplorationBasexp(level: number): Promise<void> {
  return invoke('delete_exploration_basexp', { level })
}

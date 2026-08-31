import { invoke } from '@tauri-apps/api/core'
import type { AccessRequirement } from './types/access_requirement'
import type { InstanceTemplate } from './types/instance_template'
import type { InstanceEncounter } from './types/instance_encounters'
import type { InstanceSpawnGroup } from './types/instance_spawn_groups'

export interface AccessRequirementListResult {
  data: AccessRequirement[]
  total: number
}

export async function getAccessRequirements(
  search?: string,
  limit?: number,
  offset?: number,
): Promise<AccessRequirementListResult> {
  return invoke('get_access_requirements', { search, limit, offset })
}

export async function getAccessRequirement(mapId: number, difficulty: number): Promise<AccessRequirement> {
  return invoke('get_access_requirement', { mapId, difficulty })
}

export async function saveAccessRequirement(data: AccessRequirement): Promise<void> {
  return invoke('save_access_requirement', { data })
}

export async function deleteAccessRequirement(mapId: number, difficulty: number): Promise<void> {
  return invoke('delete_access_requirement', { mapId, difficulty })
}

// ─── instance_template ───────────────────────────────────────────────

export interface InstanceTemplateListResult {
  data: InstanceTemplate[]
  total: number
}

export async function getInstanceTemplates(
  search?: string,
  limit?: number,
  offset?: number,
): Promise<InstanceTemplateListResult> {
  return invoke('get_instance_templates', { search, limit, offset })
}

export async function getInstanceTemplate(map: number): Promise<InstanceTemplate> {
  return invoke('get_instance_template', { map })
}

export async function saveInstanceTemplate(data: InstanceTemplate): Promise<void> {
  return invoke('save_instance_template', { data })
}

export async function deleteInstanceTemplate(map: number): Promise<void> {
  return invoke('delete_instance_template', { map })
}

// ─── instance_encounters ─────────────────────────────────────────────

export interface InstanceEncounterListResult {
  data: InstanceEncounter[]
  total: number
}

export async function getInstanceEncounters(
  search?: string,
  limit?: number,
  offset?: number,
): Promise<InstanceEncounterListResult> {
  return invoke('get_instance_encounters', { search, limit, offset })
}

export async function getInstanceEncountersByMap(map: number): Promise<InstanceEncounter[]> {
  return invoke('get_instance_encounters_by_map', { map })
}

export async function getInstanceEncounter(entry: number): Promise<InstanceEncounter> {
  return invoke('get_instance_encounter', { entry })
}

export async function saveInstanceEncounter(data: InstanceEncounter): Promise<void> {
  return invoke('save_instance_encounter', { data })
}

export async function deleteInstanceEncounter(entry: number): Promise<void> {
  return invoke('delete_instance_encounter', { entry })
}

// ─── instance_spawn_groups ───────────────────────────────────────────

export interface InstanceSpawnGroupListResult {
  data: InstanceSpawnGroup[]
  total: number
}

export async function getInstanceSpawnGroups(
  search?: string,
  limit?: number,
  offset?: number,
): Promise<InstanceSpawnGroupListResult> {
  return invoke('get_instance_spawn_groups', { search, limit, offset })
}

export async function getInstanceSpawnGroupsByMap(map: number): Promise<InstanceSpawnGroup[]> {
  return invoke('get_instance_spawn_groups_by_map', { map })
}

export async function getInstanceSpawnGroup(
  instanceMapId: number,
  bossStateId: number,
  bossStates: number,
  spawnGroupId: number,
): Promise<InstanceSpawnGroup> {
  return invoke('get_instance_spawn_group', { instanceMapId, bossStateId, bossStates, spawnGroupId })
}

export async function saveInstanceSpawnGroup(data: InstanceSpawnGroup): Promise<void> {
  return invoke('save_instance_spawn_group', { data })
}

export async function deleteInstanceSpawnGroup(
  instanceMapId: number,
  bossStateId: number,
  bossStates: number,
  spawnGroupId: number,
): Promise<void> {
  return invoke('delete_instance_spawn_group', { instanceMapId, bossStateId, bossStates, spawnGroupId })
}

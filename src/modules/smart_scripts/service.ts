import { invoke } from '@tauri-apps/api/core'
import type { SmartScript } from './types/smart_scripts'

export interface SmartScriptOwner {
  entryorguid: number
  source_type: number
  name: string
  row_count: number
}

export interface SmartScriptOwnerInfo {
  exists: boolean
  name: string
  /** creature/gameobject AIName; for areatriggers the areatrigger_scripts ScriptName. */
  ai_name: string
  script_name: string
}

export async function getSmartScripts(entryorguid: number, sourceType: number): Promise<SmartScript[]> {
  return invoke('get_smart_scripts', { entryorguid, sourceType })
}

export async function getSmartScriptOwners(search?: string, limit?: number): Promise<SmartScriptOwner[]> {
  return invoke('get_smart_script_owners', { search, limit })
}

export async function getSmartScriptOwnerInfo(entryorguid: number, sourceType: number): Promise<SmartScriptOwnerInfo> {
  return invoke('get_smart_script_owner_info', { entryorguid, sourceType })
}

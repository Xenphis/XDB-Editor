import { invoke } from '@tauri-apps/api/core'
import type { SpellBonusData, SpellThreat, SpellCustomAttr } from './types'

/** `null` when the spell has no override row — the normal case for most spells. */
export function getSpellBonusData(entry: number): Promise<SpellBonusData | null> {
  return invoke('get_spell_bonus_data', { entry })
}

export function deleteSpellBonusData(entry: number): Promise<void> {
  return invoke('delete_spell_bonus_data', { entry })
}

export function getSpellThreat(entry: number): Promise<SpellThreat | null> {
  return invoke('get_spell_threat', { entry })
}

export function deleteSpellThreat(entry: number): Promise<void> {
  return invoke('delete_spell_threat', { entry })
}

export function getSpellCustomAttr(entry: number): Promise<SpellCustomAttr | null> {
  return invoke('get_spell_custom_attr', { entry })
}

export function deleteSpellCustomAttr(entry: number): Promise<void> {
  return invoke('delete_spell_custom_attr', { entry })
}

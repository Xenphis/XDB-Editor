import { defineStore } from 'pinia'
import { ReactiveSubTable } from '@core/stores/SubTableManager'
import { createEntityEditorStore } from '@core/stores/createEntityEditorStore'
import * as spellsService from './service'
import {
  createDefaultSpellBonusForm,
  createDefaultSpellThreatForm,
  createDefaultSpellCustomAttrForm,
  type SpellBonusForm,
  type SpellThreatForm,
  type SpellCustomAttrForm,
} from './types'

/**
 * "Spell tuning" — the three world-database overlays a spell can carry
 * (`spell_bonus_data`, `spell_threat`, `spell_custom_attr`), edited together
 * for one spell id at a time.
 *
 * There is no real parent row: a spell's identity lives in the client's
 * Spell.dbc, not the world database (see `@core/wow/spellDbc`), so this store
 * gives `createEntityEditorStore` a synthetic main "entity" that carries
 * nothing but the chosen id — the same trick `formationStore` uses for
 * `creature_formations` (`{ leaderGUID }`, `load` always trivially succeeds).
 * All three real tables hang off it as `ReactiveSubTable` bindings, exactly
 * like `creature_template_addon` does in the NPC module: each is an optional
 * 1:1 row, loaded with `commitWhenMissing: true` so editing a spell that has
 * no override yet still diffs against sane defaults and produces an
 * `INSERT … ON DUPLICATE KEY UPDATE` rather than a no-op `UPDATE`.
 */

interface SpellTuningKey {
  entry: number
}

function createDefaultKey(): SpellTuningKey {
  return { entry: 0 }
}

/** Strips `entry` off a loaded row — the sub-table re-adds it from the parent id. */
function withoutEntry<T extends { entry: number }>(row: T): Omit<T, 'entry'> {
  const { entry: _entry, ...rest } = row
  return rest
}

/** Same as `withoutEntry`, for `spell_custom_attr` which is keyed on `spell_id` instead. */
function withoutSpellId<T extends { spell_id: number }>(row: T): Omit<T, 'spell_id'> {
  const { spell_id: _spellId, ...rest } = row
  return rest
}

export const useSpellTuningStore = defineStore('spellTuning', () => {
  const bonus = new ReactiveSubTable<SpellBonusForm>({
    tableName: 'spell_bonus_data',
    primaryKey: 'entry',
    createDefault: createDefaultSpellBonusForm,
  })

  const threat = new ReactiveSubTable<SpellThreatForm>({
    tableName: 'spell_threat',
    primaryKey: 'entry',
    createDefault: createDefaultSpellThreatForm,
  })

  const customAttr = new ReactiveSubTable<SpellCustomAttrForm>({
    tableName: 'spell_custom_attr',
    primaryKey: 'spell_id',
    createDefault: createDefaultSpellCustomAttrForm,
  })

  const editor = createEntityEditorStore<SpellTuningKey>({
    // Never written to: the key-only main "row" always diffs to nothing (see
    // module doc above). Named for what it stands for in the debug/session
    // tracker views, not a real table.
    tableName: 'spell_tuning',
    primaryKey: 'entry',
    createDefault: createDefaultKey,
    load: async (entry) => ({ entry }),
    subTables: [
      {
        manager: bonus,
        load: async (entry) => {
          const row = await spellsService.getSpellBonusData(entry).catch(() => null)
          return row ? withoutEntry(row) : null
        },
        commitWhenMissing: true,
      },
      {
        manager: threat,
        load: async (entry) => {
          const row = await spellsService.getSpellThreat(entry).catch(() => null)
          return row ? withoutEntry(row) : null
        },
        commitWhenMissing: true,
      },
      {
        manager: customAttr,
        load: async (entry) => {
          const row = await spellsService.getSpellCustomAttr(entry).catch(() => null)
          return row ? withoutSpellId(row) : null
        },
        commitWhenMissing: true,
      },
    ],
  })

  /**
   * Deletes an override row outright and drops the section back to its
   * default, unsaved-baseline state — a plain edit-then-save can only ever
   * grow or change a row, never remove one, so this is the only way back to
   * "no override" (the engine's own default behavior).
   *
   * Runs immediately against the database, unlike the diffed fields above:
   * there is nothing to preview, since the row simply stops existing.
   */
  async function clearBonus() {
    if (!editor.editingId.value) return
    await spellsService.deleteSpellBonusData(editor.editingId.value)
    bonus.reset()
    bonus.commit()
  }

  async function clearThreat() {
    if (!editor.editingId.value) return
    await spellsService.deleteSpellThreat(editor.editingId.value)
    threat.reset()
    threat.commit()
  }

  async function clearCustomAttr() {
    if (!editor.editingId.value) return
    await spellsService.deleteSpellCustomAttr(editor.editingId.value)
    customAttr.reset()
    customAttr.commit()
  }

  return {
    bonus,
    threat,
    customAttr,
    ...editor,
    clearBonus,
    clearThreat,
    clearCustomAttr,
  }
})

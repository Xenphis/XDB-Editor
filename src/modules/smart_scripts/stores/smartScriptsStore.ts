import { computed, ref } from 'vue'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { createEntityEditorStore } from '@core/stores/createEntityEditorStore'
import * as service from '../service'
import type { SmartScriptOwner, SmartScriptOwnerInfo } from '../service'
import type { SmartScript } from '../types/smart_scripts'
import { generateComment } from '../types/describe'
import {
  SAI_ACTION_CALL_RANDOM_RANGE_TIMED_ACTIONLIST,
  SAI_ACTION_CALL_RANDOM_TIMED_ACTIONLIST,
  SAI_ACTION_CALL_TIMED_ACTIONLIST,
  SAI_EVENT_LINK,
  SAI_SOURCE_TYPE_TIMED_ACTIONLIST,
} from '../types/sai'
import {
  createDefaultRow,
  decodeScriptKey,
  encodeScriptKey,
  renumberGroup,
  SmartScriptSet,
  type SmartScriptSetState,
} from './scriptSet'

export interface SmartScriptOwnerForm {
  key: number
  entryorguid: number
  source_type: number
  name: string
}

function createDefaultForm(): SmartScriptOwnerForm {
  return { key: 0, entryorguid: 0, source_type: 0, name: '' }
}

function buildOwnerHookStatements(
  entryorguid: number,
  sourceType: number,
  info: SmartScriptOwnerInfo,
): string[] {
  if (sourceType === 0 && info.ai_name !== 'SmartAI') {
    const where = entryorguid >= 0
      ? `\`entry\` = ${entryorguid}`
      : `\`entry\` = (SELECT \`id\` FROM \`creature\` WHERE \`guid\` = ${-entryorguid})`
    return [`UPDATE \`creature_template\` SET \`AIName\` = 'SmartAI' WHERE ${where};`]
  }
  if (sourceType === 1 && info.ai_name !== 'SmartGameObjectAI') {
    const where = entryorguid >= 0
      ? `\`entry\` = ${entryorguid}`
      : `\`entry\` = (SELECT \`id\` FROM \`gameobject\` WHERE \`guid\` = ${-entryorguid})`
    return [`UPDATE \`gameobject_template\` SET \`AIName\` = 'SmartGameObjectAI' WHERE ${where};`]
  }
  if (sourceType === 2 && info.ai_name !== 'SmartTrigger') {
    return [
      `DELETE FROM \`areatrigger_scripts\` WHERE \`entry\` = ${entryorguid};`,
      `INSERT INTO \`areatrigger_scripts\` (\`entry\`, \`ScriptName\`) VALUES (${entryorguid}, 'SmartTrigger');`,
    ]
  }
  return []
}

function collectReferencedListIds(rows: SmartScript[], into: Set<number>): void {
  for (const row of rows) {
    if (row.action_type === SAI_ACTION_CALL_TIMED_ACTIONLIST && row.action_param1 > 0) {
      into.add(row.action_param1)
    } else if (row.action_type === SAI_ACTION_CALL_RANDOM_TIMED_ACTIONLIST) {
      for (const id of [row.action_param1, row.action_param2, row.action_param3, row.action_param4, row.action_param5, row.action_param6]) {
        if (id > 0) into.add(id)
      }
    } else if (
      row.action_type === SAI_ACTION_CALL_RANDOM_RANGE_TIMED_ACTIONLIST
      && row.action_param1 > 0
      && row.action_param2 >= row.action_param1
      && row.action_param2 - row.action_param1 < 25
    ) {
      for (let id = row.action_param1; id <= row.action_param2; id++) into.add(id)
    }
  }
}

async function loadOwnerForm(key: number): Promise<SmartScriptOwnerForm> {
  const { entryorguid, sourceType } = decodeScriptKey(key)
  const info = await service.getSmartScriptOwnerInfo(entryorguid, sourceType)
  return {
    key,
    entryorguid,
    source_type: sourceType,
    name: info.exists && info.name ? info.name : `#${entryorguid}`,
  }
}

/** Owner rows + every timed actionlist reachable from them (bounded depth). */
async function loadScriptSet(key: number): Promise<SmartScriptSetState> {
  const { entryorguid, sourceType } = decodeScriptKey(key)
  const [info, ownerRows] = await Promise.all([
    service.getSmartScriptOwnerInfo(entryorguid, sourceType),
    service.getSmartScripts(entryorguid, sourceType),
  ])
  const rows = [...ownerRows]
  const seen = new Set<number>()
  let frontier = new Set<number>()
  collectReferencedListIds(ownerRows, frontier)
  for (let depth = 0; depth < 3 && frontier.size > 0; depth++) {
    const ids = [...frontier].filter(id => !seen.has(id))
    for (const id of ids) seen.add(id)
    const lists = await Promise.all(ids.map(id => service.getSmartScripts(id, SAI_SOURCE_TYPE_TIMED_ACTIONLIST)))
    frontier = new Set<number>()
    for (const list of lists) {
      rows.push(...list)
      collectReferencedListIds(list, frontier)
    }
  }
  return { rows, ownerHookStatements: buildOwnerHookStatements(entryorguid, sourceType, info) }
}

export const useSmartScriptsStore = defineStore('smartScripts', () => {
  const owners = ref<SmartScriptOwner[]>([])
  const loading = ref(false)
  const listLoaded = ref(false)

  const scriptSet = new SmartScriptSet()

  const editor = createEntityEditorStore<SmartScriptOwnerForm>({
    tableName: 'smart_scripts',
    primaryKey: 'key',
    createDefault: createDefaultForm,
    load: loadOwnerForm,
    subTables: [{ manager: scriptSet, load: loadScriptSet }],
  })

  /** True when the editor currently holds this entity's script and it is dirty.
      Host editors (creature / gameobject tabs) use it to fold the script into
      their own discard / execute buttons. */
  function hasChangesFor(entryorguid: number, sourceType: number): boolean {
    return editor.editingId.value === encodeScriptKey(entryorguid, sourceType)
      && editor.combinedHasChanges.value
  }

  /** Full-replace export of the whole open set — the inspector "full" view. */
  const scriptFullQuery = computed(() => {
    void scriptSet.live.value
    return scriptSet.fullReplaceStatements().join('\n')
  })

  async function loadOwners(search?: string): Promise<void> {
    loading.value = true
    try {
      owners.value = await service.getSmartScriptOwners(search)
      listLoaded.value = true
    } finally {
      loading.value = false
    }
  }

  function rowsOf(entryorguid: number, sourceType: number): SmartScript[] {
    return scriptSet.rows.filter(row => row.entryorguid === entryorguid && row.source_type === sourceType)
  }

  function findRow(entryorguid: number, sourceType: number, id: number): SmartScript | undefined {
    return scriptSet.rows.find(row => row.entryorguid === entryorguid && row.source_type === sourceType && row.id === id)
  }

  function addRow(entryorguid: number, sourceType: number): SmartScript {
    const group = rowsOf(entryorguid, sourceType)
    const nextId = group.length > 0 ? Math.max(...group.map(row => row.id)) + 1 : 0
    const row = createDefaultRow(entryorguid, sourceType, nextId)
    scriptSet.rows.push(row)
    return row
  }

  /** Removes a row together with its trailing LINK chain, then renumbers. */
  function removeRow(target: SmartScript): void {
    const toRemove = new Set<SmartScript>([target])
    let current = target
    while (current.link !== 0) {
      const next = findRow(target.entryorguid, target.source_type, current.link)
      if (!next || next.event_type !== SAI_EVENT_LINK || toRemove.has(next)) break
      toRemove.add(next)
      current = next
    }
    scriptSet.live.value.rows = scriptSet.rows.filter(row => !toRemove.has(row))
    renumberGroup(scriptSet.rows, target.entryorguid, target.source_type)
  }

  /** Appends a LINK row at the end of the parent's chain. */
  function addLinkedRow(parent: SmartScript): SmartScript {
    const rows = scriptSet.rows
    let tail = parent
    while (tail.link !== 0) {
      const next = findRow(parent.entryorguid, parent.source_type, tail.link)
      if (!next) break
      tail = next
    }
    const group = rowsOf(parent.entryorguid, parent.source_type)
    const row = createDefaultRow(parent.entryorguid, parent.source_type, Math.max(...group.map(r => r.id)) + 1)
    row.event_type = SAI_EVENT_LINK
    rows.splice(rows.indexOf(tail) + 1, 0, row)
    renumberGroup(rows, parent.entryorguid, parent.source_type)
    tail.link = row.id
    return row
  }

  /**
   * Turns a row into a CALL_TIMED_ACTIONLIST action pointing at a fresh list
   * (entry*100+n convention) seeded with one row. Returns the list id, or
   * null when all 100 conventional slots are taken.
   */
  function createActionlist(forRow: SmartScript): number | null {
    const base = Math.abs(forRow.entryorguid) * 100
    const used = new Set(
      scriptSet.rows
        .filter(row => row.source_type === SAI_SOURCE_TYPE_TIMED_ACTIONLIST)
        .map(row => row.entryorguid),
    )
    for (let slot = 0; slot < 100; slot++) {
      const listId = base + slot
      if (used.has(listId)) continue
      forRow.action_type = SAI_ACTION_CALL_TIMED_ACTIONLIST
      forRow.action_param1 = listId
      forRow.action_param2 = 0
      forRow.action_param3 = 0
      addRow(listId, SAI_SOURCE_TYPE_TIMED_ACTIONLIST)
      return listId
    }
    return null
  }

  /** Fills empty comments (TrinityCore convention) then saves the whole set. */
  async function saveScript(): Promise<void> {
    const ownerName = editor.formData.name
    for (const row of scriptSet.rows) {
      if (row.comment === '') {
        row.comment = generateComment(row, ownerName)
      }
    }
    await editor.saveCurrent()
  }

  /** Deletes every row of the currently open script set (and its actionlists). */
  async function deleteCurrentScript(): Promise<void> {
    const key = editor.editingId.value
    if (key == null) return
    scriptSet.live.value.rows = []
    await editor.saveCurrent()
    editor.discardEditor()
    owners.value = owners.value.filter(
      owner => encodeScriptKey(owner.entryorguid, owner.source_type) !== key,
    )
  }

  return {
    owners,
    loading,
    listLoaded,
    scriptSet,
    ...editor,
    scriptFullQuery,
    hasChangesFor,
    loadOwners,
    rowsOf,
    findRow,
    addRow,
    removeRow,
    addLinkedRow,
    createActionlist,
    saveScript,
    deleteCurrentScript,
  }
})

// Pinia caches the store instance across hot updates: without this, editing
// this file leaves the running app with a stale instance that is missing any
// newly added member (seen as "x is not a function" until a full reload).
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSmartScriptsStore, import.meta.hot))
}

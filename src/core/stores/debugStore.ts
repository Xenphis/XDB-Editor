import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'

export interface SqlDebugLog {
  id: number
  timestamp: number
  query_type: string
  sql: string
  execution_time_ms: number
  success: boolean
}

const MAX_LOGS = 500

export const useDebugStore = defineStore('debug', () => {
  const enabled = ref(false)
  const logs = reactive<SqlDebugLog[]>([])
  const viewerVisible = ref(false)
  let nextId = 0
  let unlisten: UnlistenFn | null = null

  async function setEnabled(value: boolean) {
    await invoke('set_debug_mode', { enabled: value })
    enabled.value = value

    if (value) {
      await startListening()
    } else {
      stopListening()
    }
  }

  async function startListening() {
    if (unlisten) return
    unlisten = await listen<Omit<SqlDebugLog, 'id'>>('sql-debug-log', (event) => {
      const entry: SqlDebugLog = { ...event.payload, id: nextId++ }
      logs.push(entry)

      if (logs.length > MAX_LOGS) {
        logs.splice(0, logs.length - MAX_LOGS)
      }

      const prefix = entry.success ? '[SQL OK]' : '[SQL ERR]'
      console.debug(
        `${prefix} ${entry.query_type} (${entry.execution_time_ms}ms)`,
        entry.sql
      )
    })
  }

  function stopListening() {
    if (unlisten) {
      unlisten()
      unlisten = null
    }
  }

  function clearLogs() {
    logs.splice(0, logs.length)
  }

  return {
    enabled,
    logs,
    viewerVisible,
    setEnabled,
    clearLogs,
  }
})

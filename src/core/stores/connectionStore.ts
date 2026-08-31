import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import type { ConnectionInfo } from '@core/types/connection'
import { useSessionTrackerStore } from '@core/stores/sessionTracker'

async function connectDb(
  host: string,
  port: number,
  user: string,
  password: string,
  database: string
): Promise<void> {
  return invoke('connect_db', { host, port, user, password, database })
}

async function disconnectDb(): Promise<void> {
  return invoke('disconnect_db')
}

export const useConnectionStore = defineStore('connection', () => {
  const isConnected = ref(false)
  const connectionInfo = reactive<ConnectionInfo>({
    host: '',
    port: 3306,
    username: '',
    database: '',
  })

  async function connect(credentials: { host: string; port: number; username: string; password: string; database: string }) {
    await connectDb(credentials.host, credentials.port, credentials.username, credentials.password, credentials.database)
    connectionInfo.host = credentials.host
    connectionInfo.port = credentials.port
    connectionInfo.username = credentials.username
    connectionInfo.database = credentials.database
    isConnected.value = true
  }

  async function disconnect() {
    try {
      await disconnectDb()
    } catch (e) {
      console.error('Disconnect error:', e)
    }
    // A new connection (possibly to another database) starts a fresh session.
    useSessionTrackerStore().reset()
    isConnected.value = false
    connectionInfo.host = ''
    connectionInfo.port = 3306
    connectionInfo.username = ''
    connectionInfo.database = ''
  }

  return {
    isConnected,
    connectionInfo,
    connect,
    disconnect,
  }
})

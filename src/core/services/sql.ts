import { invoke } from '@tauri-apps/api/core'

/**
 * Execute a list of SQL statements in a single backend transaction.
 * Any failure rolls back the whole batch.
 */
export async function executeBatch(queries: string[]): Promise<void> {
  if (queries.length === 0) return
  return invoke('execute_batch', { queries })
}

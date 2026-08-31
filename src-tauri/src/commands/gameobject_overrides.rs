#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct GameObjectOverrides {
    pub spawnId: u32,
    pub faction: u16,
    pub flags: u32,
}

#[tauri::command]
pub async fn get_gameobject_overrides(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    spawn_id: u32,
) -> Result<Option<GameObjectOverrides>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "SELECT * FROM gameobject_overrides WHERE spawnId = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, GameObjectOverrides>(SQL)
        .bind(spawn_id)
        .fetch_optional(pool)
        .await,
        spawn_id
    ).map_err(|e| format!("Query failed: {}", e))
}

#[tauri::command]
pub async fn save_gameobject_overrides(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    spawn_id: u32,
    overrides: GameObjectOverrides,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "INSERT INTO gameobject_overrides (spawnId, faction, flags) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE spawnId = VALUES(spawnId), faction = VALUES(faction), flags = VALUES(flags)";
    debug_sql!(app, debug, SQL,
        sqlx::query(SQL)
        .bind(spawn_id)
        .bind(overrides.faction)
        .bind(overrides.flags)
        .execute(pool)
        .await,
        spawn_id, overrides.faction, overrides.flags
    ).map_err(|e| format!("Save failed: {}", e))?;

    log::info!("Saved gameobject_overrides for spawnId {}", spawn_id);
    Ok(())
}

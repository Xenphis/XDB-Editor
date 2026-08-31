#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct GameObjectAddon {
    pub guid: u32,
    pub parent_rotation0: f32,
    pub parent_rotation1: f32,
    pub parent_rotation2: f32,
    pub parent_rotation3: f32,
    pub invisibilityType: u8,
    pub invisibilityValue: u32,
}

#[tauri::command]
pub async fn get_gameobject_spawn_addon(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    guid: u32,
) -> Result<Option<GameObjectAddon>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "SELECT * FROM gameobject_addon WHERE guid = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, GameObjectAddon>(SQL)
        .bind(guid)
        .fetch_optional(pool)
        .await,
        guid
    ).map_err(|e| format!("Query failed: {}", e))
}

#[tauri::command]
pub async fn save_gameobject_spawn_addon(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    guid: u32,
    addon: GameObjectAddon,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "INSERT INTO gameobject_addon (guid, parent_rotation0, parent_rotation1, parent_rotation2, parent_rotation3, invisibilityType, invisibilityValue) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE guid = VALUES(guid), parent_rotation0 = VALUES(parent_rotation0), parent_rotation1 = VALUES(parent_rotation1), parent_rotation2 = VALUES(parent_rotation2), parent_rotation3 = VALUES(parent_rotation3), invisibilityType = VALUES(invisibilityType), invisibilityValue = VALUES(invisibilityValue)";
    debug_sql!(app, debug, SQL,
        sqlx::query(SQL)
        .bind(guid)
        .bind(addon.parent_rotation0)
        .bind(addon.parent_rotation1)
        .bind(addon.parent_rotation2)
        .bind(addon.parent_rotation3)
        .bind(addon.invisibilityType)
        .bind(addon.invisibilityValue)
        .execute(pool)
        .await,
        guid, addon.parent_rotation0, addon.parent_rotation1, addon.parent_rotation2, addon.parent_rotation3, addon.invisibilityType, addon.invisibilityValue
    ).map_err(|e| format!("Save failed: {}", e))?;

    log::info!("Saved gameobject_addon for guid {}", guid);
    Ok(())
}

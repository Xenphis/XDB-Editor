#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CreatureAddon {
    pub guid: u32,
    pub path_id: u32,
    pub mount: u32,
    pub bytes1: u32,
    pub bytes2: u32,
    pub emote: u32,
    pub visibilityDistanceType: u8,
    pub auras: Option<String>,
}

#[tauri::command]
pub async fn get_creature_addon(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    guid: u32,
) -> Result<Option<CreatureAddon>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "SELECT * FROM creature_addon WHERE guid = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, CreatureAddon>(SQL)
        .bind(guid)
        .fetch_optional(pool)
        .await,
        guid
    ).map_err(|e| format!("Query failed: {}", e))
}

#[tauri::command]
pub async fn save_creature_addon(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    guid: u32,
    addon: CreatureAddon,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "INSERT INTO creature_addon (guid, path_id, mount, bytes1, bytes2, emote, visibilityDistanceType, auras) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE guid = VALUES(guid), path_id = VALUES(path_id), mount = VALUES(mount), bytes1 = VALUES(bytes1), bytes2 = VALUES(bytes2), emote = VALUES(emote), visibilityDistanceType = VALUES(visibilityDistanceType), auras = VALUES(auras)";
    debug_sql!(app, debug, SQL,
        sqlx::query(SQL)
        .bind(guid)
        .bind(addon.path_id)
        .bind(addon.mount)
        .bind(addon.bytes1)
        .bind(addon.bytes2)
        .bind(addon.emote)
        .bind(addon.visibilityDistanceType)
        .bind(&addon.auras)
        .execute(pool)
        .await,
        guid, addon.path_id, addon.mount, addon.bytes1, addon.bytes2, addon.emote, addon.visibilityDistanceType, &addon.auras
    ).map_err(|e| format!("Save failed: {}", e))?;

    log::info!("Saved creature_addon for guid {}", guid);
    Ok(())
}

#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct GameObjectTemplateAddon {
    pub entry: u32,
    pub faction: u16,
    pub flags: u32,
    pub mingold: u32,
    pub maxgold: u32,
    pub artkit0: i32,
    pub artkit1: i32,
    pub artkit2: i32,
    pub artkit3: i32,
}

#[tauri::command]
pub async fn get_gameobject_addon(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
) -> Result<Option<GameObjectTemplateAddon>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "SELECT * FROM gameobject_template_addon WHERE entry = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, GameObjectTemplateAddon>(SQL)
        .bind(entry)
        .fetch_optional(pool)
        .await,
        entry
    ).map_err(|e| format!("Query failed: {}", e))
}

#[tauri::command]
pub async fn save_gameobject_addon(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
    addon: GameObjectTemplateAddon,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "INSERT INTO gameobject_template_addon (entry, faction, flags, mingold, maxgold, artkit0, artkit1, artkit2, artkit3) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE entry = VALUES(entry), faction = VALUES(faction), flags = VALUES(flags), mingold = VALUES(mingold), maxgold = VALUES(maxgold), artkit0 = VALUES(artkit0), artkit1 = VALUES(artkit1), artkit2 = VALUES(artkit2), artkit3 = VALUES(artkit3)";
    debug_sql!(app, debug, SQL,
        sqlx::query(SQL)
        .bind(entry)
        .bind(addon.faction)
        .bind(addon.flags)
        .bind(addon.mingold)
        .bind(addon.maxgold)
        .bind(addon.artkit0)
        .bind(addon.artkit1)
        .bind(addon.artkit2)
        .bind(addon.artkit3)
        .execute(pool)
        .await,
        entry, addon.faction, addon.flags, addon.mingold, addon.maxgold, addon.artkit0, addon.artkit1, addon.artkit2, addon.artkit3
    ).map_err(|e| format!("Save failed: {}", e))?;

    log::info!("Saved gameobject_template_addon for entry {}", entry);
    Ok(())
}

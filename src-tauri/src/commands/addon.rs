#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CreatureTemplateAddon {
    pub entry: u32,
    pub path_id: u32,
    pub mount: u32,
    #[sqlx(rename = "MountCreatureID")]
    pub MountCreatureID: u32,
    #[sqlx(rename = "StandState")]
    pub StandState: u8,
    #[sqlx(rename = "AnimTier")]
    pub AnimTier: u8,
    #[sqlx(rename = "VisFlags")]
    pub VisFlags: u8,
    #[sqlx(rename = "SheathState")]
    pub SheathState: u8,
    #[sqlx(rename = "PvPFlags")]
    pub PvPFlags: u8,
    pub emote: u32,
    pub visibilityDistanceType: u8,
    pub auras: Option<String>,
}

#[tauri::command]
pub async fn get_npc_addon(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
) -> Result<Option<CreatureTemplateAddon>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "SELECT * FROM creature_template_addon WHERE entry = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, CreatureTemplateAddon>(SQL)
        .bind(entry)
        .fetch_optional(pool)
        .await,
        entry
    ).map_err(|e| format!("Query failed: {}", e))
}

#[tauri::command]
pub async fn save_npc_addon(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
    addon: CreatureTemplateAddon,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "INSERT INTO creature_template_addon (entry, path_id, mount, MountCreatureID, StandState, AnimTier, VisFlags, SheathState, PvPFlags, emote, visibilityDistanceType, auras) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE entry = VALUES(entry), path_id = VALUES(path_id), mount = VALUES(mount), MountCreatureID = VALUES(MountCreatureID), StandState = VALUES(StandState), AnimTier = VALUES(AnimTier), VisFlags = VALUES(VisFlags), SheathState = VALUES(SheathState), PvPFlags = VALUES(PvPFlags), emote = VALUES(emote), visibilityDistanceType = VALUES(visibilityDistanceType), auras = VALUES(auras)";
    debug_sql!(app, debug, SQL,
        sqlx::query(SQL)
        .bind(entry)
        .bind(addon.path_id)
        .bind(addon.mount)
        .bind(addon.MountCreatureID)
        .bind(addon.StandState)
        .bind(addon.AnimTier)
        .bind(addon.VisFlags)
        .bind(addon.SheathState)
        .bind(addon.PvPFlags)
        .bind(addon.emote)
        .bind(addon.visibilityDistanceType)
        .bind(&addon.auras)
        .execute(pool)
        .await,
        entry, addon.path_id, addon.mount, addon.MountCreatureID,
        addon.StandState, addon.AnimTier, addon.VisFlags, addon.SheathState,
        addon.PvPFlags, addon.emote, addon.visibilityDistanceType, &addon.auras
    ).map_err(|e| format!("Save failed: {}", e))?;

    log::info!("Saved addon for creature {}", entry);
    Ok(())
}

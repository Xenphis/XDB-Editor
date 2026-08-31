#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CreatureTemplateMovement {
    #[sqlx(rename = "CreatureId")]
    pub CreatureId: u32,
    #[sqlx(rename = "Ground")]
    pub Ground: u8,
    #[sqlx(rename = "Swim")]
    pub Swim: u8,
    #[sqlx(rename = "Flight")]
    pub Flight: u8,
    #[sqlx(rename = "Rooted")]
    pub Rooted: u8,
    #[sqlx(rename = "Chase")]
    pub Chase: u8,
    #[sqlx(rename = "Random")]
    pub Random: u8,
    #[sqlx(rename = "InteractionPauseTimer")]
    pub InteractionPauseTimer: u32,
}

#[tauri::command]
pub async fn get_npc_movement(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
) -> Result<Option<CreatureTemplateMovement>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "SELECT * FROM creature_template_movement WHERE CreatureId = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, CreatureTemplateMovement>(SQL)
        .bind(entry)
        .fetch_optional(pool)
        .await,
        entry
    ).map_err(|e| format!("Query failed: {}", e))
}

#[tauri::command]
pub async fn save_npc_movement(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
    movement: CreatureTemplateMovement,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "INSERT INTO creature_template_movement (CreatureId, Ground, Swim, Flight, Rooted, Chase, `Random`, InteractionPauseTimer) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE CreatureId = VALUES(CreatureId), Ground = VALUES(Ground), Swim = VALUES(Swim), Flight = VALUES(Flight), Rooted = VALUES(Rooted), Chase = VALUES(Chase), `Random` = VALUES(`Random`), InteractionPauseTimer = VALUES(InteractionPauseTimer)";
    debug_sql!(app, debug, SQL,
        sqlx::query(SQL)
        .bind(entry)
        .bind(movement.Ground)
        .bind(movement.Swim)
        .bind(movement.Flight)
        .bind(movement.Rooted)
        .bind(movement.Chase)
        .bind(movement.Random)
        .bind(movement.InteractionPauseTimer)
        .execute(pool)
        .await,
        entry, movement.Ground, movement.Swim, movement.Flight, movement.Rooted, movement.Chase, movement.Random, movement.InteractionPauseTimer
    ).map_err(|e| format!("Save failed: {}", e))?;

    log::info!("Saved movement for creature {}", entry);
    Ok(())
}

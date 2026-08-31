#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CreatureMovementOverride {
    #[sqlx(rename = "SpawnId")]
    pub SpawnId: u32,
    #[sqlx(rename = "Ground")]
    pub Ground: Option<u8>,
    #[sqlx(rename = "Swim")]
    pub Swim: Option<u8>,
    #[sqlx(rename = "Flight")]
    pub Flight: Option<u8>,
    #[sqlx(rename = "Rooted")]
    pub Rooted: Option<u8>,
    #[sqlx(rename = "Chase")]
    pub Chase: Option<u8>,
    #[sqlx(rename = "Random")]
    pub Random: Option<u8>,
    #[sqlx(rename = "InteractionPauseTimer")]
    pub InteractionPauseTimer: Option<u32>,
}

#[tauri::command]
pub async fn get_creature_movement_override(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    spawn_id: u32,
) -> Result<Option<CreatureMovementOverride>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "SELECT * FROM creature_movement_override WHERE SpawnId = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, CreatureMovementOverride>(SQL)
        .bind(spawn_id)
        .fetch_optional(pool)
        .await,
        spawn_id
    ).map_err(|e| format!("Query failed: {}", e))
}

#[tauri::command]
pub async fn save_creature_movement_override(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    spawn_id: u32,
    movement: CreatureMovementOverride,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "INSERT INTO creature_movement_override (SpawnId, Ground, Swim, Flight, Rooted, Chase, `Random`, InteractionPauseTimer) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE SpawnId = VALUES(SpawnId), Ground = VALUES(Ground), Swim = VALUES(Swim), Flight = VALUES(Flight), Rooted = VALUES(Rooted), Chase = VALUES(Chase), `Random` = VALUES(`Random`), InteractionPauseTimer = VALUES(InteractionPauseTimer)";
    debug_sql!(app, debug, SQL,
        sqlx::query(SQL)
        .bind(spawn_id)
        .bind(movement.Ground)
        .bind(movement.Swim)
        .bind(movement.Flight)
        .bind(movement.Rooted)
        .bind(movement.Chase)
        .bind(movement.Random)
        .bind(movement.InteractionPauseTimer)
        .execute(pool)
        .await,
        spawn_id, movement.Ground, movement.Swim, movement.Flight, movement.Rooted, movement.Chase, movement.Random, movement.InteractionPauseTimer
    ).map_err(|e| format!("Save failed: {}", e))?;

    log::info!("Saved creature_movement_override for SpawnId {}", spawn_id);
    Ok(())
}

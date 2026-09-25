#![allow(non_snake_case)]

use serde::Serialize;
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

/// Where an `areatrigger_teleport` row drops the player.
#[derive(Debug, Clone, Serialize, FromRow)]
pub struct AreatriggerTeleportTarget {
    pub target_map: u16,
    pub target_position_x: f32,
    pub target_position_y: f32,
    pub target_position_z: f32,
    pub target_orientation: f32,
}

/// One landing per target map — the lowest `ID` of the map's triggers. For a
/// dungeon or raid this is where a player lands on entering it, the only spot
/// inside an instance the database knows: the map editor opens instances there.
#[tauri::command]
pub async fn get_areatrigger_teleport_targets(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
) -> Result<Vec<AreatriggerTeleportTarget>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    const SQL: &str = "SELECT t.target_map, t.target_position_x, t.target_position_y, \
         t.target_position_z, t.target_orientation FROM areatrigger_teleport t \
         JOIN (SELECT MIN(ID) AS ID FROM areatrigger_teleport GROUP BY target_map) f \
         ON f.ID = t.ID";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, AreatriggerTeleportTarget>(SQL).fetch_all(pool).await
    ).map_err(|e| format!("Query failed: {}", e))
}

#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct GameObjectSpawn {
    pub guid: u32,
    pub id: u32,
    pub map: u16,
    pub zoneId: u16,
    pub areaId: u16,
    pub spawnMask: u8,
    pub phaseMask: u32,
    pub position_x: f32,
    pub position_y: f32,
    pub position_z: f32,
    pub orientation: f32,
    pub rotation0: f32,
    pub rotation1: f32,
    pub rotation2: f32,
    pub rotation3: f32,
    pub spawntimesecs: i32,
    pub animprogress: u8,
    pub state: u8,
    pub ScriptName: Option<String>,
    pub StringId: Option<String>,
    pub VerifiedBuild: Option<i32>,
}

#[tauri::command]
pub async fn get_gameobject_spawns(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    id: u32,
) -> Result<Vec<GameObjectSpawn>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "SELECT * FROM gameobject WHERE id = ? ORDER BY guid";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, GameObjectSpawn>(SQL)
        .bind(id)
        .fetch_all(pool)
        .await,
        id
    ).map_err(|e| format!("Query failed: {}", e))
}

#[tauri::command]
pub async fn save_gameobject_spawn(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    spawn: GameObjectSpawn,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "INSERT INTO gameobject (
            guid, id, map, zoneId, areaId, spawnMask, phaseMask,
            position_x, position_y, position_z, orientation,
            rotation0, rotation1, rotation2, rotation3,
            spawntimesecs, animprogress, state,
            ScriptName, StringId, VerifiedBuild
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE guid = VALUES(guid), id = VALUES(id), map = VALUES(map), zoneId = VALUES(zoneId), areaId = VALUES(areaId), spawnMask = VALUES(spawnMask), phaseMask = VALUES(phaseMask), position_x = VALUES(position_x), position_y = VALUES(position_y), position_z = VALUES(position_z), orientation = VALUES(orientation), rotation0 = VALUES(rotation0), rotation1 = VALUES(rotation1), rotation2 = VALUES(rotation2), rotation3 = VALUES(rotation3), spawntimesecs = VALUES(spawntimesecs), animprogress = VALUES(animprogress), state = VALUES(state), ScriptName = VALUES(ScriptName), StringId = VALUES(StringId), VerifiedBuild = VALUES(VerifiedBuild)";
    debug_sql!(app, debug, SQL,
        sqlx::query(SQL)
        .bind(spawn.guid)
        .bind(spawn.id)
        .bind(spawn.map)
        .bind(spawn.zoneId)
        .bind(spawn.areaId)
        .bind(spawn.spawnMask)
        .bind(spawn.phaseMask)
        .bind(spawn.position_x)
        .bind(spawn.position_y)
        .bind(spawn.position_z)
        .bind(spawn.orientation)
        .bind(spawn.rotation0)
        .bind(spawn.rotation1)
        .bind(spawn.rotation2)
        .bind(spawn.rotation3)
        .bind(spawn.spawntimesecs)
        .bind(spawn.animprogress)
        .bind(spawn.state)
        .bind(&spawn.ScriptName)
        .bind(&spawn.StringId)
        .bind(spawn.VerifiedBuild)
        .execute(pool)
        .await,
        spawn.guid, spawn.id, spawn.map, spawn.zoneId, spawn.areaId, spawn.spawnMask, spawn.phaseMask,
        spawn.position_x, spawn.position_y, spawn.position_z, spawn.orientation,
        spawn.rotation0, spawn.rotation1, spawn.rotation2, spawn.rotation3,
        spawn.spawntimesecs, spawn.animprogress, spawn.state,
        &spawn.ScriptName, &spawn.StringId, spawn.VerifiedBuild
    ).map_err(|e| format!("Save failed: {}", e))?;

    log::info!("Saved gameobject spawn guid {}", spawn.guid);
    Ok(())
}

#[tauri::command]
pub async fn delete_gameobject_spawn(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    guid: u32,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "DELETE FROM gameobject WHERE guid = ?";
    let result = debug_sql!(app, debug, SQL,
        sqlx::query(SQL)
        .bind(guid)
        .execute(pool)
        .await,
        guid
    ).map_err(|e| format!("Delete failed: {}", e))?;

    if result.rows_affected() == 0 {
        return Err(format!("GameObject spawn with guid {} not found", guid));
    }

    log::info!("Deleted gameobject spawn guid {}", guid);
    Ok(())
}

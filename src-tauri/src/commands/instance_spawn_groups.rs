#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct InstanceSpawnGroup {
    pub instanceMapId: u16,
    pub bossStateId: u8,
    pub bossStates: u8,
    pub spawnGroupId: u32,
    pub flags: u8,
}

#[derive(Debug, Serialize)]
pub struct InstanceSpawnGroupListResult {
    pub data: Vec<InstanceSpawnGroup>,
    pub total: i64,
}

#[tauri::command]
pub async fn get_instance_spawn_groups(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    search: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<InstanceSpawnGroupListResult, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    let limit = limit.unwrap_or(50);
    let offset = offset.unwrap_or(0);

    let (data, total) = match &search {
        Some(q) if !q.is_empty() => {
            let pattern = format!("%{}%", q);
            const SQL_DATA: &str = "SELECT * FROM instance_spawn_groups WHERE instanceMapId LIKE ? OR spawnGroupId LIKE ? ORDER BY instanceMapId, bossStateId, bossStates, spawnGroupId LIMIT ? OFFSET ?";
            let rows: Vec<InstanceSpawnGroup> = debug_sql!(app, debug, SQL_DATA,
                sqlx::query_as(SQL_DATA).bind(&pattern).bind(&pattern).bind(limit).bind(offset).fetch_all(pool).await,
                &pattern, &pattern, limit, offset
            ).map_err(|e| format!("Query failed: {}", e))?;
            const SQL_COUNT: &str = "SELECT COUNT(*) FROM instance_spawn_groups WHERE instanceMapId LIKE ? OR spawnGroupId LIKE ?";
            let count: (i64,) = debug_sql!(app, debug, SQL_COUNT,
                sqlx::query_as(SQL_COUNT).bind(&pattern).bind(&pattern).fetch_one(pool).await,
                &pattern, &pattern
            ).map_err(|e| format!("Count query failed: {}", e))?;
            (rows, count.0)
        }
        _ => {
            const SQL_DATA: &str = "SELECT * FROM instance_spawn_groups ORDER BY instanceMapId, bossStateId, bossStates, spawnGroupId LIMIT ? OFFSET ?";
            let rows: Vec<InstanceSpawnGroup> = debug_sql!(app, debug, SQL_DATA,
                sqlx::query_as(SQL_DATA).bind(limit).bind(offset).fetch_all(pool).await,
                limit, offset
            ).map_err(|e| format!("Query failed: {}", e))?;
            const SQL_COUNT: &str = "SELECT COUNT(*) FROM instance_spawn_groups";
            let count: (i64,) = debug_sql!(app, debug, SQL_COUNT,
                sqlx::query_as(SQL_COUNT).fetch_one(pool).await
            ).map_err(|e| format!("Count query failed: {}", e))?;
            (rows, count.0)
        }
    };

    Ok(InstanceSpawnGroupListResult { data, total })
}

#[tauri::command]
pub async fn get_instance_spawn_groups_by_map(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    map: u16,
) -> Result<Vec<InstanceSpawnGroup>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    const SQL: &str = "SELECT * FROM instance_spawn_groups WHERE instanceMapId = ? ORDER BY bossStateId, bossStates, spawnGroupId";
    let rows: Vec<InstanceSpawnGroup> = debug_sql!(app, debug, SQL,
        sqlx::query_as(SQL).bind(map).fetch_all(pool).await,
        map
    ).map_err(|e| format!("Query failed: {}", e))?;
    Ok(rows)
}

#[tauri::command]
pub async fn get_instance_spawn_group(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    instance_map_id: u16,
    boss_state_id: u8,
    boss_states: u8,
    spawn_group_id: u32,
) -> Result<InstanceSpawnGroup, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    const SQL: &str = "SELECT * FROM instance_spawn_groups WHERE instanceMapId = ? AND bossStateId = ? AND bossStates = ? AND spawnGroupId = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, InstanceSpawnGroup>(SQL)
            .bind(instance_map_id).bind(boss_state_id).bind(boss_states).bind(spawn_group_id)
            .fetch_optional(pool).await,
        instance_map_id, boss_state_id, boss_states, spawn_group_id
    ).map_err(|e| format!("Query failed: {}", e))?
    .ok_or_else(|| format!(
        "Instance spawn group for instanceMapId={} bossStateId={} bossStates={} spawnGroupId={} not found",
        instance_map_id, boss_state_id, boss_states, spawn_group_id
    ))
}

#[tauri::command]
pub async fn save_instance_spawn_group(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    data: InstanceSpawnGroup,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    const SQL: &str = "INSERT INTO instance_spawn_groups (instanceMapId, bossStateId, bossStates, spawnGroupId, flags) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE instanceMapId = VALUES(instanceMapId), bossStateId = VALUES(bossStateId), bossStates = VALUES(bossStates), spawnGroupId = VALUES(spawnGroupId), flags = VALUES(flags)";
    debug_sql!(app, debug, SQL,
        sqlx::query(SQL)
            .bind(data.instanceMapId)
            .bind(data.bossStateId)
            .bind(data.bossStates)
            .bind(data.spawnGroupId)
            .bind(data.flags)
            .execute(pool)
            .await,
        data.instanceMapId, data.bossStateId, data.bossStates, data.spawnGroupId, data.flags
    ).map_err(|e| format!("Save failed: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn delete_instance_spawn_group(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    instance_map_id: u16,
    boss_state_id: u8,
    boss_states: u8,
    spawn_group_id: u32,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    const SQL: &str = "DELETE FROM instance_spawn_groups WHERE instanceMapId = ? AND bossStateId = ? AND bossStates = ? AND spawnGroupId = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query(SQL)
            .bind(instance_map_id).bind(boss_state_id).bind(boss_states).bind(spawn_group_id)
            .execute(pool).await,
        instance_map_id, boss_state_id, boss_states, spawn_group_id
    ).map_err(|e| format!("Delete failed: {}", e))?;
    Ok(())
}

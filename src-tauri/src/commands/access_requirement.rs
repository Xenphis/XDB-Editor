#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AccessRequirement {
    pub mapId: u32,
    pub difficulty: u8,
    pub level_min: u8,
    pub level_max: u8,
    pub item_level: u16,
    pub item: u32,
    pub item2: u32,
    pub quest_done_A: u32,
    pub quest_done_H: u32,
    pub completed_achievement: u32,
    pub quest_failed_text: Option<String>,
    pub comment: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AccessRequirementListResult {
    pub data: Vec<AccessRequirement>,
    pub total: i64,
}

#[tauri::command]
pub async fn get_access_requirements(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    search: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<AccessRequirementListResult, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    let limit = limit.unwrap_or(50);
    let offset = offset.unwrap_or(0);

    let (data, total) = match &search {
        Some(q) if !q.is_empty() => {
            let pattern = format!("%{}%", q);
            const SQL_DATA: &str = "SELECT * FROM access_requirement WHERE mapId LIKE ? OR comment LIKE ? ORDER BY mapId, difficulty LIMIT ? OFFSET ?";
            let rows: Vec<AccessRequirement> = debug_sql!(app, debug, SQL_DATA,
                sqlx::query_as(SQL_DATA).bind(&pattern).bind(&pattern).bind(limit).bind(offset).fetch_all(pool).await,
                &pattern, &pattern, limit, offset
            ).map_err(|e| format!("Query failed: {}", e))?;
            const SQL_COUNT: &str = "SELECT COUNT(*) FROM access_requirement WHERE mapId LIKE ? OR comment LIKE ?";
            let count: (i64,) = debug_sql!(app, debug, SQL_COUNT,
                sqlx::query_as(SQL_COUNT).bind(&pattern).bind(&pattern).fetch_one(pool).await,
                &pattern, &pattern
            ).map_err(|e| format!("Count query failed: {}", e))?;
            (rows, count.0)
        }
        _ => {
            const SQL_DATA: &str = "SELECT * FROM access_requirement ORDER BY mapId, difficulty LIMIT ? OFFSET ?";
            let rows: Vec<AccessRequirement> = debug_sql!(app, debug, SQL_DATA,
                sqlx::query_as(SQL_DATA).bind(limit).bind(offset).fetch_all(pool).await,
                limit, offset
            ).map_err(|e| format!("Query failed: {}", e))?;
            const SQL_COUNT: &str = "SELECT COUNT(*) FROM access_requirement";
            let count: (i64,) = debug_sql!(app, debug, SQL_COUNT,
                sqlx::query_as(SQL_COUNT).fetch_one(pool).await
            ).map_err(|e| format!("Count query failed: {}", e))?;
            (rows, count.0)
        }
    };

    Ok(AccessRequirementListResult { data, total })
}

#[tauri::command]
pub async fn get_access_requirement(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    map_id: u32,
    difficulty: u8,
) -> Result<AccessRequirement, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    const SQL: &str = "SELECT * FROM access_requirement WHERE mapId = ? AND difficulty = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, AccessRequirement>(SQL).bind(map_id).bind(difficulty).fetch_optional(pool).await,
        map_id, difficulty
    ).map_err(|e| format!("Query failed: {}", e))?
    .ok_or_else(|| format!("Access requirement for mapId={} difficulty={} not found", map_id, difficulty))
}

#[tauri::command]
pub async fn save_access_requirement(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    data: AccessRequirement,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    const SQL: &str = "INSERT INTO access_requirement \
        (mapId, difficulty, level_min, level_max, item_level, item, item2, \
         quest_done_A, quest_done_H, completed_achievement, quest_failed_text, comment) \
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) \
        ON DUPLICATE KEY UPDATE mapId = VALUES(mapId), difficulty = VALUES(difficulty), \
        level_min = VALUES(level_min), level_max = VALUES(level_max), item_level = VALUES(item_level), \
        item = VALUES(item), item2 = VALUES(item2), quest_done_A = VALUES(quest_done_A), \
        quest_done_H = VALUES(quest_done_H), completed_achievement = VALUES(completed_achievement), \
        quest_failed_text = VALUES(quest_failed_text), comment = VALUES(comment)";
    debug_sql!(app, debug, SQL,
        sqlx::query(SQL)
            .bind(data.mapId)
            .bind(data.difficulty)
            .bind(data.level_min)
            .bind(data.level_max)
            .bind(data.item_level)
            .bind(data.item)
            .bind(data.item2)
            .bind(data.quest_done_A)
            .bind(data.quest_done_H)
            .bind(data.completed_achievement)
            .bind(&data.quest_failed_text)
            .bind(&data.comment)
            .execute(pool)
            .await,
        data.mapId, data.difficulty, data.level_min, data.level_max, data.item_level,
        data.item, data.item2,
        data.quest_done_A, data.quest_done_H, data.completed_achievement, &data.quest_failed_text, &data.comment
    ).map_err(|e| format!("Save failed: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn delete_access_requirement(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    map_id: u32,
    difficulty: u8,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    const SQL: &str = "DELETE FROM access_requirement WHERE mapId = ? AND difficulty = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query(SQL).bind(map_id).bind(difficulty).execute(pool).await,
        map_id, difficulty
    ).map_err(|e| format!("Delete failed: {}", e))?;
    Ok(())
}

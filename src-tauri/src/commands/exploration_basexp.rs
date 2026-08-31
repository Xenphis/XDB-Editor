#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ExplorationBasexp {
    pub level: u8,
    pub basexp: i32,
}

#[derive(Debug, Serialize)]
pub struct ExplorationBasexpListResult {
    pub data: Vec<ExplorationBasexp>,
    pub total: i64,
}

#[tauri::command]
pub async fn get_exploration_basexps(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    search: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<ExplorationBasexpListResult, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    let limit = limit.unwrap_or(50);
    let offset = offset.unwrap_or(0);

    let (data, total) = match &search {
        Some(q) if !q.is_empty() => {
            let pattern = format!("%{}%", q);
            const SQL_DATA: &str = "SELECT * FROM exploration_basexp WHERE level LIKE ? OR basexp LIKE ? ORDER BY level LIMIT ? OFFSET ?";
            let rows: Vec<ExplorationBasexp> = debug_sql!(app, debug, SQL_DATA,
                sqlx::query_as(SQL_DATA).bind(&pattern).bind(&pattern).bind(limit).bind(offset).fetch_all(pool).await,
                &pattern, &pattern, limit, offset
            ).map_err(|e| format!("Query failed: {}", e))?;
            const SQL_COUNT: &str = "SELECT COUNT(*) FROM exploration_basexp WHERE level LIKE ? OR basexp LIKE ?";
            let count: (i64,) = debug_sql!(app, debug, SQL_COUNT,
                sqlx::query_as(SQL_COUNT).bind(&pattern).bind(&pattern).fetch_one(pool).await,
                &pattern, &pattern
            ).map_err(|e| format!("Count query failed: {}", e))?;
            (rows, count.0)
        }
        _ => {
            const SQL_DATA: &str = "SELECT * FROM exploration_basexp ORDER BY level LIMIT ? OFFSET ?";
            let rows: Vec<ExplorationBasexp> = debug_sql!(app, debug, SQL_DATA,
                sqlx::query_as(SQL_DATA).bind(limit).bind(offset).fetch_all(pool).await,
                limit, offset
            ).map_err(|e| format!("Query failed: {}", e))?;
            const SQL_COUNT: &str = "SELECT COUNT(*) FROM exploration_basexp";
            let count: (i64,) = debug_sql!(app, debug, SQL_COUNT,
                sqlx::query_as(SQL_COUNT).fetch_one(pool).await
            ).map_err(|e| format!("Count query failed: {}", e))?;
            (rows, count.0)
        }
    };

    Ok(ExplorationBasexpListResult { data, total })
}

#[tauri::command]
pub async fn get_exploration_basexp(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    level: u8,
) -> Result<ExplorationBasexp, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    const SQL: &str = "SELECT * FROM exploration_basexp WHERE level = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, ExplorationBasexp>(SQL).bind(level).fetch_optional(pool).await,
        level
    ).map_err(|e| format!("Query failed: {}", e))?
    .ok_or_else(|| format!("Exploration basexp for level={} not found", level))
}

#[tauri::command]
pub async fn save_exploration_basexp(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    data: ExplorationBasexp,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    const SQL: &str = "INSERT INTO exploration_basexp (level, basexp) VALUES (?, ?) ON DUPLICATE KEY UPDATE level = VALUES(level), basexp = VALUES(basexp)";
    debug_sql!(app, debug, SQL,
        sqlx::query(SQL)
            .bind(data.level)
            .bind(data.basexp)
            .execute(pool)
            .await,
        data.level, data.basexp
    ).map_err(|e| format!("Save failed: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn delete_exploration_basexp(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    level: u8,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    const SQL: &str = "DELETE FROM exploration_basexp WHERE level = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query(SQL).bind(level).execute(pool).await,
        level
    ).map_err(|e| format!("Delete failed: {}", e))?;
    Ok(())
}

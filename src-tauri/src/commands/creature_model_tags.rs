#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

/// One row of `creature_model_tags`: a creature model display id, an optional
/// human label, and up to 3 free-form tags used for searching.
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CreatureModelTag {
    pub displayId: u32,
    pub name: Option<String>,
    pub tags01: Option<String>,
    pub tags02: Option<String>,
    pub tags03: Option<String>,
}

/// Search creature models by tag. Matches the query as a substring against any
/// of the 3 tag columns or the name, and returns the matching display ids.
#[tauri::command]
pub async fn search_creature_model_tags(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    search: String,
    limit: Option<i64>,
) -> Result<Vec<CreatureModelTag>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    let limit = limit.unwrap_or(50);
    let pattern = format!("%{}%", search);

    const SQL: &str = "SELECT displayId, name, tags01, tags02, tags03 \
        FROM creature_model_tags \
        WHERE tags01 LIKE ? OR tags02 LIKE ? OR tags03 LIKE ? OR name LIKE ? \
        ORDER BY displayId LIMIT ?";
    let rows: Vec<CreatureModelTag> = debug_sql!(app, debug, SQL,
        sqlx::query_as(SQL)
        .bind(&pattern)
        .bind(&pattern)
        .bind(&pattern)
        .bind(&pattern)
        .bind(limit)
        .fetch_all(pool)
        .await,
        &pattern, &pattern, &pattern, &pattern, limit
    ).map_err(|e| format!("Query failed: {}", e))?;

    Ok(rows)
}

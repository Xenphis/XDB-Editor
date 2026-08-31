#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct InstanceTemplate {
    pub map: u16,
    pub parent: u16,
    pub script: String,
    pub allowMount: u8,
}

#[derive(Debug, Serialize)]
pub struct InstanceTemplateListResult {
    pub data: Vec<InstanceTemplate>,
    pub total: i64,
}

#[tauri::command]
pub async fn get_instance_templates(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    search: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<InstanceTemplateListResult, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    let limit = limit.unwrap_or(50);
    let offset = offset.unwrap_or(0);

    let (data, total) = match &search {
        Some(q) if !q.is_empty() => {
            let pattern = format!("%{}%", q);
            const SQL_DATA: &str = "SELECT * FROM instance_template WHERE map LIKE ? OR script LIKE ? ORDER BY map LIMIT ? OFFSET ?";
            let rows: Vec<InstanceTemplate> = debug_sql!(app, debug, SQL_DATA,
                sqlx::query_as(SQL_DATA).bind(&pattern).bind(&pattern).bind(limit).bind(offset).fetch_all(pool).await,
                &pattern, &pattern, limit, offset
            ).map_err(|e| format!("Query failed: {}", e))?;
            const SQL_COUNT: &str = "SELECT COUNT(*) FROM instance_template WHERE map LIKE ? OR script LIKE ?";
            let count: (i64,) = debug_sql!(app, debug, SQL_COUNT,
                sqlx::query_as(SQL_COUNT).bind(&pattern).bind(&pattern).fetch_one(pool).await,
                &pattern, &pattern
            ).map_err(|e| format!("Count query failed: {}", e))?;
            (rows, count.0)
        }
        _ => {
            const SQL_DATA: &str = "SELECT * FROM instance_template ORDER BY map LIMIT ? OFFSET ?";
            let rows: Vec<InstanceTemplate> = debug_sql!(app, debug, SQL_DATA,
                sqlx::query_as(SQL_DATA).bind(limit).bind(offset).fetch_all(pool).await,
                limit, offset
            ).map_err(|e| format!("Query failed: {}", e))?;
            const SQL_COUNT: &str = "SELECT COUNT(*) FROM instance_template";
            let count: (i64,) = debug_sql!(app, debug, SQL_COUNT,
                sqlx::query_as(SQL_COUNT).fetch_one(pool).await
            ).map_err(|e| format!("Count query failed: {}", e))?;
            (rows, count.0)
        }
    };

    Ok(InstanceTemplateListResult { data, total })
}

#[tauri::command]
pub async fn get_instance_template(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    map: u16,
) -> Result<InstanceTemplate, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    const SQL: &str = "SELECT * FROM instance_template WHERE map = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, InstanceTemplate>(SQL).bind(map).fetch_optional(pool).await,
        map
    ).map_err(|e| format!("Query failed: {}", e))?
    .ok_or_else(|| format!("Instance template for map={} not found", map))
}

#[tauri::command]
pub async fn save_instance_template(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    data: InstanceTemplate,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    const SQL: &str = "INSERT INTO instance_template (map, parent, script, allowMount) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE map = VALUES(map), parent = VALUES(parent), script = VALUES(script), allowMount = VALUES(allowMount)";
    debug_sql!(app, debug, SQL,
        sqlx::query(SQL)
            .bind(data.map)
            .bind(data.parent)
            .bind(&data.script)
            .bind(data.allowMount)
            .execute(pool)
            .await,
        data.map, data.parent, &data.script, data.allowMount
    ).map_err(|e| format!("Save failed: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn delete_instance_template(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    map: u16,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    const SQL: &str = "DELETE FROM instance_template WHERE map = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query(SQL).bind(map).execute(pool).await,
        map
    ).map_err(|e| format!("Delete failed: {}", e))?;
    Ok(())
}

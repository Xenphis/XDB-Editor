#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct GameTele {
    pub id: u32,
    pub position_x: f32,
    pub position_y: f32,
    pub position_z: f32,
    pub orientation: f32,
    pub map: u16,
    pub name: String,
}

/// Smallest unused id (MAX + 1) — seeds the map editor's "new teleport" form
/// so a point can be dropped on the map without looking an id up first.
#[tauri::command]
pub async fn get_next_game_tele_id(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
) -> Result<u32, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    // CAST keeps the unsigned MAX(id) + 1 decodable as a plain i64.
    const SQL: &str = "SELECT CAST(COALESCE(MAX(id), 0) + 1 AS SIGNED) FROM game_tele";
    let next: (i64,) = debug_sql!(app, debug, SQL,
        sqlx::query_as(SQL).fetch_one(pool).await
    ).map_err(|e| format!("Query failed: {}", e))?;
    Ok(next.0 as u32)
}

/// Teleports on one map, for the map editor's zone tables panel. `game_tele`
/// has no zone column, so the optional bounds (the zone's WorldMapArea world
/// rectangle) scope the list spatially; all-NULL bounds mean map-wide.
#[tauri::command]
pub async fn get_game_teles_by_map(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    map: u16,
    search: Option<String>,
    limit: Option<i64>,
    min_x: Option<f32>,
    max_x: Option<f32>,
    min_y: Option<f32>,
    max_y: Option<f32>,
) -> Result<Vec<GameTele>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    let limit = limit.unwrap_or(500);

    // The bounds filter binds min_x twice: NULL disables it (map-wide list).
    let rows = match &search {
        Some(q) if !q.is_empty() => {
            let pattern = format!("%{}%", q);
            const SQL: &str = "SELECT * FROM game_tele WHERE map = ? \
                 AND (? IS NULL OR (position_x BETWEEN ? AND ? AND position_y BETWEEN ? AND ?)) \
                 AND (name LIKE ? OR id LIKE ?) ORDER BY name LIMIT ?";
            debug_sql!(app, debug, SQL,
                sqlx::query_as::<_, GameTele>(SQL)
                    .bind(map)
                    .bind(min_x)
                    .bind(min_x)
                    .bind(max_x)
                    .bind(min_y)
                    .bind(max_y)
                    .bind(&pattern)
                    .bind(&pattern)
                    .bind(limit)
                    .fetch_all(pool)
                    .await,
                map, min_x, min_x, max_x, min_y, max_y, &pattern, &pattern, limit
            ).map_err(|e| format!("Query failed: {}", e))?
        }
        _ => {
            const SQL: &str = "SELECT * FROM game_tele WHERE map = ? \
                 AND (? IS NULL OR (position_x BETWEEN ? AND ? AND position_y BETWEEN ? AND ?)) \
                 ORDER BY name LIMIT ?";
            debug_sql!(app, debug, SQL,
                sqlx::query_as::<_, GameTele>(SQL)
                    .bind(map)
                    .bind(min_x)
                    .bind(min_x)
                    .bind(max_x)
                    .bind(min_y)
                    .bind(max_y)
                    .bind(limit)
                    .fetch_all(pool)
                    .await,
                map, min_x, min_x, max_x, min_y, max_y, limit
            ).map_err(|e| format!("Query failed: {}", e))?
        }
    };

    Ok(rows)
}

#[tauri::command]
pub async fn save_game_tele(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    data: GameTele,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    const SQL: &str = "INSERT INTO game_tele (id, position_x, position_y, position_z, orientation, map, name) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = VALUES(id), position_x = VALUES(position_x), position_y = VALUES(position_y), position_z = VALUES(position_z), orientation = VALUES(orientation), map = VALUES(map), name = VALUES(name)";
    debug_sql!(app, debug, SQL,
        sqlx::query(SQL)
            .bind(data.id)
            .bind(data.position_x)
            .bind(data.position_y)
            .bind(data.position_z)
            .bind(data.orientation)
            .bind(data.map)
            .bind(&data.name)
            .execute(pool)
            .await,
        data.id, data.position_x, data.position_y, data.position_z,
        data.orientation, data.map, &data.name
    ).map_err(|e| format!("Save failed: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn delete_game_tele(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    id: u32,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    const SQL: &str = "DELETE FROM game_tele WHERE id = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query(SQL).bind(id).execute(pool).await,
        id
    ).map_err(|e| format!("Delete failed: {}", e))?;
    Ok(())
}

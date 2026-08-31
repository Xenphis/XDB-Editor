#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct GossipMenu {
    #[sqlx(rename = "MenuID")]
    pub MenuID: u32,
    #[sqlx(rename = "TextID")]
    pub TextID: u32,
    #[sqlx(rename = "VerifiedBuild")]
    pub VerifiedBuild: i32,
}

#[tauri::command]
pub async fn get_gossip_menu_ids(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    search: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<u32>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    let limit = limit.unwrap_or(100);

    let rows: Vec<(u32,)> = match search {
        Some(q) if !q.is_empty() => {
            let pattern = format!("%{}%", q);
            const SQL: &str = "SELECT DISTINCT MenuID FROM gossip_menu WHERE CAST(MenuID AS CHAR) LIKE ? ORDER BY MenuID LIMIT ?";
            debug_sql!(app, debug, SQL,
                sqlx::query_as(SQL)
                    .bind(&pattern)
                    .bind(limit)
                    .fetch_all(pool)
                    .await,
                &pattern, limit
            ).map_err(|e| format!("Query failed: {}", e))?
        }
        _ => {
            const SQL: &str = "SELECT DISTINCT MenuID FROM gossip_menu ORDER BY MenuID LIMIT ?";
            debug_sql!(app, debug, SQL,
                sqlx::query_as(SQL)
                    .bind(limit)
                    .fetch_all(pool)
                    .await,
                limit
            ).map_err(|e| format!("Query failed: {}", e))?
        }
    };

    Ok(rows.into_iter().map(|row| row.0).collect())
}

#[tauri::command]
pub async fn get_gossip_menu(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    menu_id: u32,
) -> Result<Vec<GossipMenu>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "SELECT * FROM gossip_menu WHERE MenuID = ? ORDER BY TextID";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, GossipMenu>(SQL)
            .bind(menu_id)
            .fetch_all(pool)
            .await,
        menu_id
    ).map_err(|e| format!("Query failed: {}", e))
}

#[tauri::command]
pub async fn save_gossip_menu(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    menu_id: u32,
    rows: Vec<GossipMenu>,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL_DELETE: &str = "DELETE FROM gossip_menu WHERE MenuID = ?";
    debug_sql!(app, debug, SQL_DELETE,
        sqlx::query(SQL_DELETE)
            .bind(menu_id)
            .execute(pool)
            .await,
        menu_id
    ).map_err(|e| format!("Delete failed: {}", e))?;

    const SQL_INSERT: &str = "INSERT INTO gossip_menu (MenuID, TextID, VerifiedBuild) VALUES (?, ?, ?)";
    for row in &rows {
        debug_sql!(app, debug, SQL_INSERT,
            sqlx::query(SQL_INSERT)
                .bind(menu_id)
                .bind(row.TextID)
                .bind(row.VerifiedBuild)
                .execute(pool)
                .await,
            menu_id, row.TextID, row.VerifiedBuild
        ).map_err(|e| format!("Insert failed: {}", e))?;
    }

    log::info!("Saved {} gossip_menu row(s) for MenuID {}", rows.len(), menu_id);
    Ok(())
}
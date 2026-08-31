#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CreatureQuestItem {
    #[sqlx(rename = "CreatureEntry")]
    pub CreatureEntry: u32,
    #[sqlx(rename = "Idx")]
    pub Idx: u32,
    #[sqlx(rename = "ItemId")]
    pub ItemId: u32,
    #[sqlx(rename = "VerifiedBuild")]
    pub VerifiedBuild: Option<i32>,
}

#[tauri::command]
pub async fn get_creature_questitem(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
) -> Result<Vec<CreatureQuestItem>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "SELECT * FROM creature_questitem WHERE CreatureEntry = ? ORDER BY Idx";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, CreatureQuestItem>(SQL)
        .bind(entry)
        .fetch_all(pool)
        .await,
        entry
    ).map_err(|e| format!("Query failed: {}", e))
}

#[tauri::command]
pub async fn save_creature_questitem(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
    items: Vec<CreatureQuestItem>,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL_DELETE: &str = "DELETE FROM creature_questitem WHERE CreatureEntry = ?";
    debug_sql!(app, debug, SQL_DELETE,
        sqlx::query(SQL_DELETE)
        .bind(entry)
        .execute(pool)
        .await,
        entry
    ).map_err(|e| format!("Delete failed: {}", e))?;

    const SQL_INSERT: &str = "INSERT INTO creature_questitem (CreatureEntry, Idx, ItemId, VerifiedBuild) VALUES (?, ?, ?, ?)";
    for item in &items {
        debug_sql!(app, debug, SQL_INSERT,
            sqlx::query(SQL_INSERT)
            .bind(entry)
            .bind(item.Idx)
            .bind(item.ItemId)
            .bind(item.VerifiedBuild)
            .execute(pool)
            .await,
            entry, item.Idx, item.ItemId, item.VerifiedBuild
        ).map_err(|e| format!("Insert failed: {}", e))?;
    }

    log::info!("Saved {} quest items for creature {}", items.len(), entry);
    Ok(())
}

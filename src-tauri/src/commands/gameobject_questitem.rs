#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct GameObjectQuestItem {
    #[sqlx(rename = "GameObjectEntry")]
    pub GameObjectEntry: u32,
    #[sqlx(rename = "Idx")]
    pub Idx: u32,
    #[sqlx(rename = "ItemId")]
    pub ItemId: u32,
    #[sqlx(rename = "VerifiedBuild")]
    pub VerifiedBuild: Option<i32>,
}

#[tauri::command]
pub async fn get_gameobject_questitem(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
) -> Result<Vec<GameObjectQuestItem>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "SELECT * FROM gameobject_questitem WHERE GameObjectEntry = ? ORDER BY Idx";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, GameObjectQuestItem>(SQL)
        .bind(entry)
        .fetch_all(pool)
        .await,
        entry
    ).map_err(|e| format!("Query failed: {}", e))
}

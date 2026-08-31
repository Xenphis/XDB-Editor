#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[allow(non_snake_case)]
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct QuestRequestItems {
    #[sqlx(rename = "ID")] pub ID: u32,
    #[sqlx(rename = "EmoteOnComplete")] pub EmoteOnComplete: u16,
    #[sqlx(rename = "EmoteOnCompleteDelay")] pub EmoteOnCompleteDelay: u32,
    #[sqlx(rename = "EmoteOnIncomplete")] pub EmoteOnIncomplete: u16,
    #[sqlx(rename = "EmoteOnIncompleteDelay")] pub EmoteOnIncompleteDelay: u32,
    #[sqlx(rename = "CompletionText")] pub CompletionText: Option<String>,
    #[sqlx(rename = "VerifiedBuild")] pub VerifiedBuild: Option<i32>,
}

#[tauri::command]
pub async fn get_quest_request_items(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    id: u32,
) -> Result<Option<QuestRequestItems>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    const SQL: &str = "SELECT * FROM quest_request_items WHERE ID = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, QuestRequestItems>(SQL).bind(id).fetch_optional(pool).await,
        id
    ).map_err(|e| format!("Query failed: {}", e))
}

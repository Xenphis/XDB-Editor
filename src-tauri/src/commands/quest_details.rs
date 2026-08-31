#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[allow(non_snake_case)]
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct QuestDetails {
    #[sqlx(rename = "ID")] pub ID: u32,
    #[sqlx(rename = "Emote1")] pub Emote1: u16,
    #[sqlx(rename = "Emote2")] pub Emote2: u16,
    #[sqlx(rename = "Emote3")] pub Emote3: u16,
    #[sqlx(rename = "Emote4")] pub Emote4: u16,
    #[sqlx(rename = "EmoteDelay1")] pub EmoteDelay1: u32,
    #[sqlx(rename = "EmoteDelay2")] pub EmoteDelay2: u32,
    #[sqlx(rename = "EmoteDelay3")] pub EmoteDelay3: u32,
    #[sqlx(rename = "EmoteDelay4")] pub EmoteDelay4: u32,
    #[sqlx(rename = "VerifiedBuild")] pub VerifiedBuild: Option<i32>,
}

#[tauri::command]
pub async fn get_quest_details(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    id: u32,
) -> Result<Option<QuestDetails>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    const SQL: &str = "SELECT * FROM quest_details WHERE ID = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, QuestDetails>(SQL).bind(id).fetch_optional(pool).await,
        id
    ).map_err(|e| format!("Query failed: {}", e))
}

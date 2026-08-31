#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[allow(non_snake_case)]
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct QuestRequestItemsLocale {
    #[sqlx(rename = "ID")] pub ID: u32,
    pub locale: String,
    #[sqlx(rename = "CompletionText")] pub CompletionText: Option<String>,
    #[sqlx(rename = "VerifiedBuild")] pub VerifiedBuild: Option<i32>,
}

#[tauri::command]
pub async fn get_quest_request_items_locales(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    id: u32,
) -> Result<Vec<QuestRequestItemsLocale>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    const SQL: &str = "SELECT * FROM quest_request_items_locale WHERE ID = ? ORDER BY locale";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, QuestRequestItemsLocale>(SQL).bind(id).fetch_all(pool).await,
        id
    ).map_err(|e| format!("Query failed: {}", e))
}

#[tauri::command]
pub async fn save_quest_request_items_locales(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    id: u32,
    locales: Vec<QuestRequestItemsLocale>,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL_DELETE: &str = "DELETE FROM quest_request_items_locale WHERE ID = ?";
    debug_sql!(app, debug, SQL_DELETE,
        sqlx::query(SQL_DELETE).bind(id).execute(pool).await,
        id
    ).map_err(|e| format!("Delete failed: {}", e))?;

    for locale in &locales {
        const SQL_INSERT: &str = "INSERT INTO quest_request_items_locale (ID, locale, CompletionText, VerifiedBuild) VALUES (?, ?, ?, 0)";
        debug_sql!(app, debug, SQL_INSERT,
            sqlx::query(SQL_INSERT)
                .bind(id)
                .bind(&locale.locale)
                .bind(&locale.CompletionText)
                .execute(pool).await,
            id, &locale.locale
        ).map_err(|e| format!("Insert locale failed: {}", e))?;
    }

    log::info!("Saved {} quest_request_items locales for ID {}", locales.len(), id);
    Ok(())
}

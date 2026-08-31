#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CreatureTextLocale {
    #[sqlx(rename = "CreatureID")]
    pub CreatureID: u32,
    #[sqlx(rename = "GroupID")]
    pub GroupID: u8,
    #[sqlx(rename = "ID")]
    pub ID: u8,
    #[sqlx(rename = "Locale")]
    pub Locale: String,
    #[sqlx(rename = "Text")]
    pub Text: Option<String>,
}

#[tauri::command]
pub async fn get_creature_text_locales(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
) -> Result<Vec<CreatureTextLocale>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "SELECT * FROM creature_text_locale WHERE CreatureID = ? ORDER BY GroupID, ID, Locale";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, CreatureTextLocale>(SQL)
        .bind(entry)
        .fetch_all(pool)
        .await,
        entry
    ).map_err(|e| format!("Query failed: {}", e))
}

#[tauri::command]
pub async fn save_creature_text_locales(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
    locales: Vec<CreatureTextLocale>,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL_DELETE: &str = "DELETE FROM creature_text_locale WHERE CreatureID = ?";
    debug_sql!(app, debug, SQL_DELETE,
        sqlx::query(SQL_DELETE)
        .bind(entry)
        .execute(pool)
        .await,
        entry
    ).map_err(|e| format!("Delete failed: {}", e))?;

    const SQL_INSERT: &str = "INSERT INTO creature_text_locale (CreatureID, GroupID, ID, Locale, Text) VALUES (?, ?, ?, ?, ?)";
    for loc in &locales {
        debug_sql!(app, debug, SQL_INSERT,
            sqlx::query(SQL_INSERT)
            .bind(entry)
            .bind(loc.GroupID)
            .bind(loc.ID)
            .bind(&loc.Locale)
            .bind(&loc.Text)
            .execute(pool)
            .await,
            entry, loc.GroupID, loc.ID, &loc.Locale, &loc.Text
        ).map_err(|e| format!("Insert failed: {}", e))?;
    }

    log::info!("Saved {} creature text locale(s) for entry {}", locales.len(), entry);
    Ok(())
}

#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CreatureTemplateLocale {
    pub entry: u32,
    pub locale: String,
    #[sqlx(rename = "Name")]
    pub Name: String,
    #[sqlx(rename = "Title")]
    pub Title: Option<String>,
    #[sqlx(rename = "VerifiedBuild")]
    pub VerifiedBuild: i32,
}

#[tauri::command]
pub async fn get_npc_locales(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
) -> Result<Vec<CreatureTemplateLocale>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "SELECT * FROM creature_template_locale WHERE entry = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, CreatureTemplateLocale>(SQL)
        .bind(entry)
        .fetch_all(pool)
        .await,
        entry
    ).map_err(|e| format!("Query failed: {}", e))
}

#[tauri::command]
pub async fn save_npc_locales(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
    locales: Vec<CreatureTemplateLocale>,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    // Delete all existing locale rows for this entry
    const SQL_DELETE: &str = "DELETE FROM creature_template_locale WHERE entry = ?";
    debug_sql!(app, debug, SQL_DELETE,
        sqlx::query(SQL_DELETE)
        .bind(entry)
        .execute(pool)
        .await,
        entry
    ).map_err(|e| format!("Delete failed: {}", e))?;

    // Insert each locale row
    const SQL_INSERT: &str = "INSERT INTO creature_template_locale (entry, locale, Name, Title, VerifiedBuild) VALUES (?, ?, ?, ?, ?)";
    for loc in &locales {
        debug_sql!(app, debug, SQL_INSERT,
            sqlx::query(SQL_INSERT)
            .bind(entry)
            .bind(&loc.locale)
            .bind(&loc.Name)
            .bind(&loc.Title)
            .bind(loc.VerifiedBuild)
            .execute(pool)
            .await,
            entry, &loc.locale, &loc.Name, &loc.Title, loc.VerifiedBuild
        ).map_err(|e| format!("Insert failed: {}", e))?;
    }

    log::info!("Saved {} locale(s) for creature {}", locales.len(), entry);
    Ok(())
}

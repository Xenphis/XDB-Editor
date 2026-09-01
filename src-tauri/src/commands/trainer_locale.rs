#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TrainerLocale {
    #[sqlx(rename = "Id")]
    pub Id: u32,
    #[sqlx(rename = "locale")]
    pub locale: String,
    #[sqlx(rename = "Greeting_lang")]
    pub Greeting_lang: Option<String>,
    #[sqlx(rename = "VerifiedBuild")]
    pub VerifiedBuild: Option<i32>,
}

#[tauri::command]
pub async fn get_trainer_locales(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    trainer_id: u32,
) -> Result<Vec<TrainerLocale>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "SELECT * FROM trainer_locale WHERE Id = ? ORDER BY locale";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, TrainerLocale>(SQL)
        .bind(trainer_id)
        .fetch_all(pool)
        .await,
        trainer_id
    ).map_err(|e| format!("Query failed: {}", e))
}

#[tauri::command]
pub async fn save_trainer_locales(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    trainer_id: u32,
    locales: Vec<TrainerLocale>,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL_DELETE: &str = "DELETE FROM trainer_locale WHERE Id = ?";
    debug_sql!(app, debug, SQL_DELETE,
        sqlx::query(SQL_DELETE)
        .bind(trainer_id)
        .execute(pool)
        .await,
        trainer_id
    ).map_err(|e| format!("Delete failed: {}", e))?;

    const SQL_INSERT: &str = "INSERT INTO trainer_locale (Id, locale, Greeting_lang, VerifiedBuild) VALUES (?, ?, ?, ?)";
    for loc in &locales {
        debug_sql!(app, debug, SQL_INSERT,
            sqlx::query(SQL_INSERT)
            .bind(trainer_id)
            .bind(&loc.locale)
            .bind(&loc.Greeting_lang)
            .bind(loc.VerifiedBuild)
            .execute(pool)
            .await,
            trainer_id, &loc.locale, &loc.Greeting_lang, loc.VerifiedBuild
        ).map_err(|e| format!("Insert failed: {}", e))?;
    }

    log::info!("Saved {} trainer locale(s) for trainer {}", locales.len(), trainer_id);
    Ok(())
}

#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[allow(non_snake_case)]
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct QuestTemplateLocale {
    #[sqlx(rename = "ID")] pub ID: u32,
    pub locale: String,
    #[sqlx(rename = "LogTitle")] pub LogTitle: Option<String>,
    #[sqlx(rename = "QuestDescription")] pub QuestDescription: Option<String>,
    #[sqlx(rename = "LogDescription")] pub LogDescription: Option<String>,
    #[sqlx(rename = "AreaDescription")] pub AreaDescription: Option<String>,
    #[sqlx(rename = "QuestCompletionLog")] pub QuestCompletionLog: Option<String>,
    #[sqlx(rename = "ObjectiveText1")] pub ObjectiveText1: Option<String>,
    #[sqlx(rename = "ObjectiveText2")] pub ObjectiveText2: Option<String>,
    #[sqlx(rename = "ObjectiveText3")] pub ObjectiveText3: Option<String>,
    #[sqlx(rename = "ObjectiveText4")] pub ObjectiveText4: Option<String>,
    #[sqlx(rename = "VerifiedBuild")] pub VerifiedBuild: Option<i32>,
}

#[tauri::command]
pub async fn get_quest_locales(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    id: u32,
) -> Result<Vec<QuestTemplateLocale>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    const SQL: &str = "SELECT * FROM quest_template_locale WHERE ID = ? ORDER BY locale";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, QuestTemplateLocale>(SQL).bind(id).fetch_all(pool).await,
        id
    ).map_err(|e| format!("Query failed: {}", e))
}

#[tauri::command]
pub async fn save_quest_locales(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    id: u32,
    locales: Vec<QuestTemplateLocale>,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL_DELETE: &str = "DELETE FROM quest_template_locale WHERE ID = ?";
    debug_sql!(app, debug, SQL_DELETE,
        sqlx::query(SQL_DELETE).bind(id).execute(pool).await,
        id
    ).map_err(|e| format!("Delete failed: {}", e))?;

    for locale in &locales {
        const SQL_INSERT: &str = "INSERT INTO quest_template_locale (
            ID, locale, LogTitle, QuestDescription, LogDescription, AreaDescription, QuestCompletionLog,
            ObjectiveText1, ObjectiveText2, ObjectiveText3, ObjectiveText4, VerifiedBuild
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)";
        debug_sql!(app, debug, SQL_INSERT,
            sqlx::query(SQL_INSERT)
            .bind(id)
            .bind(&locale.locale)
            .bind(&locale.LogTitle)
            .bind(&locale.QuestDescription)
            .bind(&locale.LogDescription)
            .bind(&locale.AreaDescription)
            .bind(&locale.QuestCompletionLog)
            .bind(&locale.ObjectiveText1)
            .bind(&locale.ObjectiveText2)
            .bind(&locale.ObjectiveText3)
            .bind(&locale.ObjectiveText4)
            .execute(pool).await,
            id, &locale.locale
        ).map_err(|e| format!("Insert locale failed: {}", e))?;
    }

    log::info!("Saved {} quest locales for ID {}", locales.len(), id);
    Ok(())
}

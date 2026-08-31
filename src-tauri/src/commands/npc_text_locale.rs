#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct NpcTextLocale {
    #[sqlx(rename = "ID")]
    pub ID: u32,
    #[sqlx(rename = "Locale")]
    pub Locale: String,
    #[sqlx(rename = "Text0_0")]
    pub Text0_0: Option<String>,
    #[sqlx(rename = "Text0_1")]
    pub Text0_1: Option<String>,
    #[sqlx(rename = "Text1_0")]
    pub Text1_0: Option<String>,
    #[sqlx(rename = "Text1_1")]
    pub Text1_1: Option<String>,
    #[sqlx(rename = "Text2_0")]
    pub Text2_0: Option<String>,
    #[sqlx(rename = "Text2_1")]
    pub Text2_1: Option<String>,
    #[sqlx(rename = "Text3_0")]
    pub Text3_0: Option<String>,
    #[sqlx(rename = "Text3_1")]
    pub Text3_1: Option<String>,
    #[sqlx(rename = "Text4_0")]
    pub Text4_0: Option<String>,
    #[sqlx(rename = "Text4_1")]
    pub Text4_1: Option<String>,
    #[sqlx(rename = "Text5_0")]
    pub Text5_0: Option<String>,
    #[sqlx(rename = "Text5_1")]
    pub Text5_1: Option<String>,
    #[sqlx(rename = "Text6_0")]
    pub Text6_0: Option<String>,
    #[sqlx(rename = "Text6_1")]
    pub Text6_1: Option<String>,
    #[sqlx(rename = "Text7_0")]
    pub Text7_0: Option<String>,
    #[sqlx(rename = "Text7_1")]
    pub Text7_1: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NpcTextLocaleKey {
    pub ID: u32,
    pub Locale: String,
}

const NPC_TEXT_LOCALE_COLUMNS: &str = "ID, Locale, Text0_0, Text0_1, Text1_0, Text1_1, Text2_0, Text2_1, Text3_0, Text3_1, Text4_0, Text4_1, Text5_0, Text5_1, Text6_0, Text6_1, Text7_0, Text7_1";

#[tauri::command]
pub async fn get_npc_text_locales(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    ids: Vec<u32>,
) -> Result<Vec<NpcTextLocale>, String> {
    if ids.is_empty() {
        return Ok(Vec::new());
    }

    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    let placeholders = ids.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
    let sql = format!("SELECT * FROM npc_text_locale WHERE ID IN ({}) ORDER BY ID, Locale", placeholders);
    let mut query = sqlx::query_as::<_, NpcTextLocale>(&sql);
    for id in &ids {
        query = query.bind(id);
    }

    debug_sql!(app, debug, &sql,
        query.fetch_all(pool).await,
        &ids
    ).map_err(|e| format!("Query failed: {}", e))
}

#[tauri::command]
pub async fn save_npc_text_locales(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    locales: Vec<NpcTextLocale>,
    deleted: Vec<NpcTextLocaleKey>,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL_DELETE: &str = "DELETE FROM npc_text_locale WHERE ID = ? AND Locale = ?";
    for key in &deleted {
        debug_sql!(app, debug, SQL_DELETE,
            sqlx::query(SQL_DELETE)
                .bind(key.ID)
                .bind(&key.Locale)
                .execute(pool)
                .await,
            key.ID, &key.Locale
        ).map_err(|e| format!("Delete failed: {}", e))?;
    }

    let placeholders = std::iter::repeat("?").take(18).collect::<Vec<_>>().join(", ");
    let updates = NPC_TEXT_LOCALE_COLUMNS
        .split(',')
        .map(|c| {
            let c = c.trim();
            format!("{c} = VALUES({c})")
        })
        .collect::<Vec<_>>()
        .join(", ");
    let sql = format!(
        "INSERT INTO npc_text_locale ({}) VALUES ({}) ON DUPLICATE KEY UPDATE {}",
        NPC_TEXT_LOCALE_COLUMNS, placeholders, updates
    );
    for locale in &locales {
        debug_sql!(app, debug, &sql,
            sqlx::query(&sql)
                .bind(locale.ID)
                .bind(&locale.Locale)
                .bind(&locale.Text0_0)
                .bind(&locale.Text0_1)
                .bind(&locale.Text1_0)
                .bind(&locale.Text1_1)
                .bind(&locale.Text2_0)
                .bind(&locale.Text2_1)
                .bind(&locale.Text3_0)
                .bind(&locale.Text3_1)
                .bind(&locale.Text4_0)
                .bind(&locale.Text4_1)
                .bind(&locale.Text5_0)
                .bind(&locale.Text5_1)
                .bind(&locale.Text6_0)
                .bind(&locale.Text6_1)
                .bind(&locale.Text7_0)
                .bind(&locale.Text7_1)
                .execute(pool)
                .await,
            locale.ID, &locale.Locale
        ).map_err(|e| format!("Save failed: {}", e))?;
    }

    log::info!("Saved {} npc_text_locale row(s), deleted {}", locales.len(), deleted.len());
    Ok(())
}
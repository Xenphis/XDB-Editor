#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct GossipMenuOptionLocale {
    #[sqlx(rename = "MenuID")]
    pub MenuID: u32,
    #[sqlx(rename = "OptionID")]
    pub OptionID: u32,
    #[sqlx(rename = "Locale")]
    pub Locale: String,
    #[sqlx(rename = "OptionText")]
    pub OptionText: Option<String>,
    #[sqlx(rename = "BoxText")]
    pub BoxText: Option<String>,
}

#[tauri::command]
pub async fn get_gossip_menu_option_locales(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    menu_id: u32,
) -> Result<Vec<GossipMenuOptionLocale>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "SELECT * FROM gossip_menu_option_locale WHERE MenuID = ? ORDER BY OptionID, Locale";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, GossipMenuOptionLocale>(SQL)
            .bind(menu_id)
            .fetch_all(pool)
            .await,
        menu_id
    ).map_err(|e| format!("Query failed: {}", e))
}

#[tauri::command]
pub async fn save_gossip_menu_option_locales(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    menu_id: u32,
    locales: Vec<GossipMenuOptionLocale>,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL_DELETE: &str = "DELETE FROM gossip_menu_option_locale WHERE MenuID = ?";
    debug_sql!(app, debug, SQL_DELETE,
        sqlx::query(SQL_DELETE)
            .bind(menu_id)
            .execute(pool)
            .await,
        menu_id
    ).map_err(|e| format!("Delete failed: {}", e))?;

    const SQL_INSERT: &str = "INSERT INTO gossip_menu_option_locale (MenuID, OptionID, Locale, OptionText, BoxText) VALUES (?, ?, ?, ?, ?)";
    for locale in &locales {
        debug_sql!(app, debug, SQL_INSERT,
            sqlx::query(SQL_INSERT)
                .bind(menu_id)
                .bind(locale.OptionID)
                .bind(&locale.Locale)
                .bind(&locale.OptionText)
                .bind(&locale.BoxText)
                .execute(pool)
                .await,
            menu_id, locale.OptionID, &locale.Locale, &locale.OptionText, &locale.BoxText
        ).map_err(|e| format!("Insert failed: {}", e))?;
    }

    log::info!("Saved {} gossip_menu_option_locale row(s) for MenuID {}", locales.len(), menu_id);
    Ok(())
}
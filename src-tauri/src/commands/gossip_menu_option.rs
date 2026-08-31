#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct GossipMenuOption {
    #[sqlx(rename = "MenuID")]
    pub MenuID: u32,
    #[sqlx(rename = "OptionID")]
    pub OptionID: u32,
    #[sqlx(rename = "OptionIcon")]
    pub OptionIcon: u32,
    #[sqlx(rename = "OptionText")]
    pub OptionText: Option<String>,
    #[sqlx(rename = "OptionBroadcastTextID")]
    pub OptionBroadcastTextID: i32,
    #[sqlx(rename = "OptionType")]
    pub OptionType: u8,
    #[sqlx(rename = "OptionNpcFlag")]
    pub OptionNpcFlag: u32,
    #[sqlx(rename = "ActionMenuID")]
    pub ActionMenuID: u32,
    #[sqlx(rename = "ActionPoiID")]
    pub ActionPoiID: u32,
    #[sqlx(rename = "BoxCoded")]
    pub BoxCoded: u8,
    #[sqlx(rename = "BoxMoney")]
    pub BoxMoney: u32,
    #[sqlx(rename = "BoxText")]
    pub BoxText: Option<String>,
    #[sqlx(rename = "BoxBroadcastTextID")]
    pub BoxBroadcastTextID: i32,
    #[sqlx(rename = "VerifiedBuild")]
    pub VerifiedBuild: i32,
}

#[tauri::command]
pub async fn get_gossip_menu_options(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    menu_id: u32,
) -> Result<Vec<GossipMenuOption>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "SELECT * FROM gossip_menu_option WHERE MenuID = ? ORDER BY OptionID";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, GossipMenuOption>(SQL)
            .bind(menu_id)
            .fetch_all(pool)
            .await,
        menu_id
    ).map_err(|e| format!("Query failed: {}", e))
}

#[tauri::command]
pub async fn save_gossip_menu_options(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    menu_id: u32,
    options: Vec<GossipMenuOption>,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL_DELETE: &str = "DELETE FROM gossip_menu_option WHERE MenuID = ?";
    debug_sql!(app, debug, SQL_DELETE,
        sqlx::query(SQL_DELETE)
            .bind(menu_id)
            .execute(pool)
            .await,
        menu_id
    ).map_err(|e| format!("Delete failed: {}", e))?;

    const SQL_INSERT: &str = "INSERT INTO gossip_menu_option (MenuID, OptionID, OptionIcon, OptionText, OptionBroadcastTextID, OptionType, OptionNpcFlag, ActionMenuID, ActionPoiID, BoxCoded, BoxMoney, BoxText, BoxBroadcastTextID, VerifiedBuild) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    for option in &options {
        debug_sql!(app, debug, SQL_INSERT,
            sqlx::query(SQL_INSERT)
                .bind(menu_id)
                .bind(option.OptionID)
                .bind(option.OptionIcon)
                .bind(&option.OptionText)
                .bind(option.OptionBroadcastTextID)
                .bind(option.OptionType)
                .bind(option.OptionNpcFlag)
                .bind(option.ActionMenuID)
                .bind(option.ActionPoiID)
                .bind(option.BoxCoded)
                .bind(option.BoxMoney)
                .bind(&option.BoxText)
                .bind(option.BoxBroadcastTextID)
                .bind(option.VerifiedBuild)
                .execute(pool)
                .await,
            menu_id, option.OptionID, option.OptionIcon, &option.OptionText, option.OptionBroadcastTextID,
            option.OptionType, option.OptionNpcFlag, option.ActionMenuID, option.ActionPoiID, option.BoxCoded,
            option.BoxMoney, &option.BoxText, option.BoxBroadcastTextID, option.VerifiedBuild
        ).map_err(|e| format!("Insert failed: {}", e))?;
    }

    log::info!("Saved {} gossip_menu_option row(s) for MenuID {}", options.len(), menu_id);
    Ok(())
}
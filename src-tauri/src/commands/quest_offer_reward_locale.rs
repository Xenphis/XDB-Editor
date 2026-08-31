#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[allow(non_snake_case)]
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct QuestOfferRewardLocale {
    #[sqlx(rename = "ID")] pub ID: u32,
    pub locale: String,
    #[sqlx(rename = "RewardText")] pub RewardText: Option<String>,
    #[sqlx(rename = "VerifiedBuild")] pub VerifiedBuild: Option<i32>,
}

#[tauri::command]
pub async fn get_quest_offer_reward_locales(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    id: u32,
) -> Result<Vec<QuestOfferRewardLocale>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    const SQL: &str = "SELECT * FROM quest_offer_reward_locale WHERE ID = ? ORDER BY locale";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, QuestOfferRewardLocale>(SQL).bind(id).fetch_all(pool).await,
        id
    ).map_err(|e| format!("Query failed: {}", e))
}

#[tauri::command]
pub async fn save_quest_offer_reward_locales(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    id: u32,
    locales: Vec<QuestOfferRewardLocale>,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL_DELETE: &str = "DELETE FROM quest_offer_reward_locale WHERE ID = ?";
    debug_sql!(app, debug, SQL_DELETE,
        sqlx::query(SQL_DELETE).bind(id).execute(pool).await,
        id
    ).map_err(|e| format!("Delete failed: {}", e))?;

    for locale in &locales {
        const SQL_INSERT: &str = "INSERT INTO quest_offer_reward_locale (ID, locale, RewardText, VerifiedBuild) VALUES (?, ?, ?, 0)";
        debug_sql!(app, debug, SQL_INSERT,
            sqlx::query(SQL_INSERT)
                .bind(id)
                .bind(&locale.locale)
                .bind(&locale.RewardText)
                .execute(pool).await,
            id, &locale.locale
        ).map_err(|e| format!("Insert locale failed: {}", e))?;
    }

    log::info!("Saved {} quest_offer_reward locales for ID {}", locales.len(), id);
    Ok(())
}

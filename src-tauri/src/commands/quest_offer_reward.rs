#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[allow(non_snake_case)]
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct QuestOfferReward {
    #[sqlx(rename = "ID")] pub ID: u32,
    #[sqlx(rename = "Emote1")] pub Emote1: u16,
    #[sqlx(rename = "Emote2")] pub Emote2: u16,
    #[sqlx(rename = "Emote3")] pub Emote3: u16,
    #[sqlx(rename = "Emote4")] pub Emote4: u16,
    #[sqlx(rename = "EmoteDelay1")] pub EmoteDelay1: u32,
    #[sqlx(rename = "EmoteDelay2")] pub EmoteDelay2: u32,
    #[sqlx(rename = "EmoteDelay3")] pub EmoteDelay3: u32,
    #[sqlx(rename = "EmoteDelay4")] pub EmoteDelay4: u32,
    #[sqlx(rename = "RewardText")] pub RewardText: Option<String>,
    #[sqlx(rename = "VerifiedBuild")] pub VerifiedBuild: Option<i32>,
}

#[tauri::command]
pub async fn get_quest_offer_reward(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    id: u32,
) -> Result<Option<QuestOfferReward>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    const SQL: &str = "SELECT * FROM quest_offer_reward WHERE ID = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, QuestOfferReward>(SQL).bind(id).fetch_optional(pool).await,
        id
    ).map_err(|e| format!("Query failed: {}", e))
}

#[tauri::command]
pub async fn save_quest_offer_reward(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    id: u32,
    data: QuestOfferReward,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    const SQL: &str = "INSERT INTO quest_offer_reward (ID, Emote1, Emote2, Emote3, Emote4, EmoteDelay1, EmoteDelay2, EmoteDelay3, EmoteDelay4, RewardText, VerifiedBuild) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0) ON DUPLICATE KEY UPDATE ID = VALUES(ID), Emote1 = VALUES(Emote1), Emote2 = VALUES(Emote2), Emote3 = VALUES(Emote3), Emote4 = VALUES(Emote4), EmoteDelay1 = VALUES(EmoteDelay1), EmoteDelay2 = VALUES(EmoteDelay2), EmoteDelay3 = VALUES(EmoteDelay3), EmoteDelay4 = VALUES(EmoteDelay4), RewardText = VALUES(RewardText), VerifiedBuild = VALUES(VerifiedBuild)";
    debug_sql!(app, debug, SQL,
        sqlx::query(SQL)
            .bind(id)
            .bind(data.Emote1)
            .bind(data.Emote2)
            .bind(data.Emote3)
            .bind(data.Emote4)
            .bind(data.EmoteDelay1)
            .bind(data.EmoteDelay2)
            .bind(data.EmoteDelay3)
            .bind(data.EmoteDelay4)
            .bind(&data.RewardText)
            .execute(pool).await,
        id
    ).map_err(|e| format!("Save failed: {}", e))?;
    Ok(())
}

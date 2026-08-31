#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct NpcText {
    #[sqlx(rename = "ID")]
    pub ID: u32,
    pub text0_0: Option<String>,
    pub text0_1: Option<String>,
    #[sqlx(rename = "BroadcastTextID0")]
    pub BroadcastTextID0: i32,
    pub lang0: u8,
    #[sqlx(rename = "Probability0")]
    pub Probability0: f32,
    #[sqlx(rename = "EmoteDelay0_0")]
    pub EmoteDelay0_0: u32,
    #[sqlx(rename = "Emote0_0")]
    pub Emote0_0: u32,
    #[sqlx(rename = "EmoteDelay0_1")]
    pub EmoteDelay0_1: u32,
    #[sqlx(rename = "Emote0_1")]
    pub Emote0_1: u32,
    #[sqlx(rename = "EmoteDelay0_2")]
    pub EmoteDelay0_2: u32,
    #[sqlx(rename = "Emote0_2")]
    pub Emote0_2: u32,
    pub text1_0: Option<String>,
    pub text1_1: Option<String>,
    #[sqlx(rename = "BroadcastTextID1")]
    pub BroadcastTextID1: i32,
    pub lang1: u8,
    #[sqlx(rename = "Probability1")]
    pub Probability1: f32,
    #[sqlx(rename = "EmoteDelay1_0")]
    pub EmoteDelay1_0: u32,
    #[sqlx(rename = "Emote1_0")]
    pub Emote1_0: u32,
    #[sqlx(rename = "EmoteDelay1_1")]
    pub EmoteDelay1_1: u32,
    #[sqlx(rename = "Emote1_1")]
    pub Emote1_1: u32,
    #[sqlx(rename = "EmoteDelay1_2")]
    pub EmoteDelay1_2: u32,
    #[sqlx(rename = "Emote1_2")]
    pub Emote1_2: u32,
    pub text2_0: Option<String>,
    pub text2_1: Option<String>,
    #[sqlx(rename = "BroadcastTextID2")]
    pub BroadcastTextID2: i32,
    pub lang2: u8,
    #[sqlx(rename = "Probability2")]
    pub Probability2: f32,
    #[sqlx(rename = "EmoteDelay2_0")]
    pub EmoteDelay2_0: u32,
    #[sqlx(rename = "Emote2_0")]
    pub Emote2_0: u32,
    #[sqlx(rename = "EmoteDelay2_1")]
    pub EmoteDelay2_1: u32,
    #[sqlx(rename = "Emote2_1")]
    pub Emote2_1: u32,
    #[sqlx(rename = "EmoteDelay2_2")]
    pub EmoteDelay2_2: u32,
    #[sqlx(rename = "Emote2_2")]
    pub Emote2_2: u32,
    pub text3_0: Option<String>,
    pub text3_1: Option<String>,
    #[sqlx(rename = "BroadcastTextID3")]
    pub BroadcastTextID3: i32,
    pub lang3: u8,
    #[sqlx(rename = "Probability3")]
    pub Probability3: f32,
    #[sqlx(rename = "EmoteDelay3_0")]
    pub EmoteDelay3_0: u32,
    #[sqlx(rename = "Emote3_0")]
    pub Emote3_0: u32,
    #[sqlx(rename = "EmoteDelay3_1")]
    pub EmoteDelay3_1: u32,
    #[sqlx(rename = "Emote3_1")]
    pub Emote3_1: u32,
    #[sqlx(rename = "EmoteDelay3_2")]
    pub EmoteDelay3_2: u32,
    #[sqlx(rename = "Emote3_2")]
    pub Emote3_2: u32,
    pub text4_0: Option<String>,
    pub text4_1: Option<String>,
    #[sqlx(rename = "BroadcastTextID4")]
    pub BroadcastTextID4: i32,
    pub lang4: u8,
    #[sqlx(rename = "Probability4")]
    pub Probability4: f32,
    #[sqlx(rename = "EmoteDelay4_0")]
    pub EmoteDelay4_0: u32,
    #[sqlx(rename = "Emote4_0")]
    pub Emote4_0: u32,
    #[sqlx(rename = "EmoteDelay4_1")]
    pub EmoteDelay4_1: u32,
    #[sqlx(rename = "Emote4_1")]
    pub Emote4_1: u32,
    #[sqlx(rename = "EmoteDelay4_2")]
    pub EmoteDelay4_2: u32,
    #[sqlx(rename = "Emote4_2")]
    pub Emote4_2: u32,
    pub text5_0: Option<String>,
    pub text5_1: Option<String>,
    #[sqlx(rename = "BroadcastTextID5")]
    pub BroadcastTextID5: i32,
    pub lang5: u8,
    #[sqlx(rename = "Probability5")]
    pub Probability5: f32,
    #[sqlx(rename = "EmoteDelay5_0")]
    pub EmoteDelay5_0: u32,
    #[sqlx(rename = "Emote5_0")]
    pub Emote5_0: u32,
    #[sqlx(rename = "EmoteDelay5_1")]
    pub EmoteDelay5_1: u32,
    #[sqlx(rename = "Emote5_1")]
    pub Emote5_1: u32,
    #[sqlx(rename = "EmoteDelay5_2")]
    pub EmoteDelay5_2: u32,
    #[sqlx(rename = "Emote5_2")]
    pub Emote5_2: u32,
    pub text6_0: Option<String>,
    pub text6_1: Option<String>,
    #[sqlx(rename = "BroadcastTextID6")]
    pub BroadcastTextID6: i32,
    pub lang6: u8,
    #[sqlx(rename = "Probability6")]
    pub Probability6: f32,
    #[sqlx(rename = "EmoteDelay6_0")]
    pub EmoteDelay6_0: u32,
    #[sqlx(rename = "Emote6_0")]
    pub Emote6_0: u32,
    #[sqlx(rename = "EmoteDelay6_1")]
    pub EmoteDelay6_1: u32,
    #[sqlx(rename = "Emote6_1")]
    pub Emote6_1: u32,
    #[sqlx(rename = "EmoteDelay6_2")]
    pub EmoteDelay6_2: u32,
    #[sqlx(rename = "Emote6_2")]
    pub Emote6_2: u32,
    pub text7_0: Option<String>,
    pub text7_1: Option<String>,
    #[sqlx(rename = "BroadcastTextID7")]
    pub BroadcastTextID7: i32,
    pub lang7: u8,
    #[sqlx(rename = "Probability7")]
    pub Probability7: f32,
    #[sqlx(rename = "EmoteDelay7_0")]
    pub EmoteDelay7_0: u32,
    #[sqlx(rename = "Emote7_0")]
    pub Emote7_0: u32,
    #[sqlx(rename = "EmoteDelay7_1")]
    pub EmoteDelay7_1: u32,
    #[sqlx(rename = "Emote7_1")]
    pub Emote7_1: u32,
    #[sqlx(rename = "EmoteDelay7_2")]
    pub EmoteDelay7_2: u32,
    #[sqlx(rename = "Emote7_2")]
    pub Emote7_2: u32,
    #[sqlx(rename = "VerifiedBuild")]
    pub VerifiedBuild: Option<i32>,
}

const NPC_TEXT_COLUMNS: &str = "ID, text0_0, text0_1, BroadcastTextID0, lang0, Probability0, EmoteDelay0_0, Emote0_0, EmoteDelay0_1, Emote0_1, EmoteDelay0_2, Emote0_2, text1_0, text1_1, BroadcastTextID1, lang1, Probability1, EmoteDelay1_0, Emote1_0, EmoteDelay1_1, Emote1_1, EmoteDelay1_2, Emote1_2, text2_0, text2_1, BroadcastTextID2, lang2, Probability2, EmoteDelay2_0, Emote2_0, EmoteDelay2_1, Emote2_1, EmoteDelay2_2, Emote2_2, text3_0, text3_1, BroadcastTextID3, lang3, Probability3, EmoteDelay3_0, Emote3_0, EmoteDelay3_1, Emote3_1, EmoteDelay3_2, Emote3_2, text4_0, text4_1, BroadcastTextID4, lang4, Probability4, EmoteDelay4_0, Emote4_0, EmoteDelay4_1, Emote4_1, EmoteDelay4_2, Emote4_2, text5_0, text5_1, BroadcastTextID5, lang5, Probability5, EmoteDelay5_0, Emote5_0, EmoteDelay5_1, Emote5_1, EmoteDelay5_2, Emote5_2, text6_0, text6_1, BroadcastTextID6, lang6, Probability6, EmoteDelay6_0, Emote6_0, EmoteDelay6_1, Emote6_1, EmoteDelay6_2, Emote6_2, text7_0, text7_1, BroadcastTextID7, lang7, Probability7, EmoteDelay7_0, Emote7_0, EmoteDelay7_1, Emote7_1, EmoteDelay7_2, Emote7_2, VerifiedBuild";

#[tauri::command]
pub async fn get_npc_texts(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    ids: Vec<u32>,
) -> Result<Vec<NpcText>, String> {
    if ids.is_empty() {
        return Ok(Vec::new());
    }

    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    let placeholders = ids.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
    let sql = format!("SELECT * FROM npc_text WHERE ID IN ({}) ORDER BY ID", placeholders);
    let mut query = sqlx::query_as::<_, NpcText>(&sql);
    for id in &ids {
        query = query.bind(id);
    }

    debug_sql!(app, debug, &sql,
        query.fetch_all(pool).await,
        &ids
    ).map_err(|e| format!("Query failed: {}", e))
}

#[tauri::command]
pub async fn save_npc_texts(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    texts: Vec<NpcText>,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    let placeholders = std::iter::repeat("?").take(90).collect::<Vec<_>>().join(", ");
    let updates = NPC_TEXT_COLUMNS
        .split(',')
        .map(|c| {
            let c = c.trim();
            format!("{c} = VALUES({c})")
        })
        .collect::<Vec<_>>()
        .join(", ");
    let sql = format!(
        "INSERT INTO npc_text ({}) VALUES ({}) ON DUPLICATE KEY UPDATE {}",
        NPC_TEXT_COLUMNS, placeholders, updates
    );

    for text in &texts {
        debug_sql!(app, debug, &sql,
            sqlx::query(&sql)
                .bind(text.ID)
                .bind(&text.text0_0)
                .bind(&text.text0_1)
                .bind(text.BroadcastTextID0)
                .bind(text.lang0)
                .bind(text.Probability0)
                .bind(text.EmoteDelay0_0)
                .bind(text.Emote0_0)
                .bind(text.EmoteDelay0_1)
                .bind(text.Emote0_1)
                .bind(text.EmoteDelay0_2)
                .bind(text.Emote0_2)
                .bind(&text.text1_0)
                .bind(&text.text1_1)
                .bind(text.BroadcastTextID1)
                .bind(text.lang1)
                .bind(text.Probability1)
                .bind(text.EmoteDelay1_0)
                .bind(text.Emote1_0)
                .bind(text.EmoteDelay1_1)
                .bind(text.Emote1_1)
                .bind(text.EmoteDelay1_2)
                .bind(text.Emote1_2)
                .bind(&text.text2_0)
                .bind(&text.text2_1)
                .bind(text.BroadcastTextID2)
                .bind(text.lang2)
                .bind(text.Probability2)
                .bind(text.EmoteDelay2_0)
                .bind(text.Emote2_0)
                .bind(text.EmoteDelay2_1)
                .bind(text.Emote2_1)
                .bind(text.EmoteDelay2_2)
                .bind(text.Emote2_2)
                .bind(&text.text3_0)
                .bind(&text.text3_1)
                .bind(text.BroadcastTextID3)
                .bind(text.lang3)
                .bind(text.Probability3)
                .bind(text.EmoteDelay3_0)
                .bind(text.Emote3_0)
                .bind(text.EmoteDelay3_1)
                .bind(text.Emote3_1)
                .bind(text.EmoteDelay3_2)
                .bind(text.Emote3_2)
                .bind(&text.text4_0)
                .bind(&text.text4_1)
                .bind(text.BroadcastTextID4)
                .bind(text.lang4)
                .bind(text.Probability4)
                .bind(text.EmoteDelay4_0)
                .bind(text.Emote4_0)
                .bind(text.EmoteDelay4_1)
                .bind(text.Emote4_1)
                .bind(text.EmoteDelay4_2)
                .bind(text.Emote4_2)
                .bind(&text.text5_0)
                .bind(&text.text5_1)
                .bind(text.BroadcastTextID5)
                .bind(text.lang5)
                .bind(text.Probability5)
                .bind(text.EmoteDelay5_0)
                .bind(text.Emote5_0)
                .bind(text.EmoteDelay5_1)
                .bind(text.Emote5_1)
                .bind(text.EmoteDelay5_2)
                .bind(text.Emote5_2)
                .bind(&text.text6_0)
                .bind(&text.text6_1)
                .bind(text.BroadcastTextID6)
                .bind(text.lang6)
                .bind(text.Probability6)
                .bind(text.EmoteDelay6_0)
                .bind(text.Emote6_0)
                .bind(text.EmoteDelay6_1)
                .bind(text.Emote6_1)
                .bind(text.EmoteDelay6_2)
                .bind(text.Emote6_2)
                .bind(&text.text7_0)
                .bind(&text.text7_1)
                .bind(text.BroadcastTextID7)
                .bind(text.lang7)
                .bind(text.Probability7)
                .bind(text.EmoteDelay7_0)
                .bind(text.Emote7_0)
                .bind(text.EmoteDelay7_1)
                .bind(text.Emote7_1)
                .bind(text.EmoteDelay7_2)
                .bind(text.Emote7_2)
                .bind(text.VerifiedBuild)
                .execute(pool)
                .await,
            text.ID
        ).map_err(|e| format!("Save failed: {}", e))?;
    }

    log::info!("Saved {} npc_text row(s)", texts.len());
    Ok(())
}
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
    pub em0_0: u16,
    pub em0_1: u16,
    pub em0_2: u16,
    pub em0_3: u16,
    pub em0_4: u16,
    pub em0_5: u16,
    pub text1_0: Option<String>,
    pub text1_1: Option<String>,
    #[sqlx(rename = "BroadcastTextID1")]
    pub BroadcastTextID1: i32,
    pub lang1: u8,
    #[sqlx(rename = "Probability1")]
    pub Probability1: f32,
    pub em1_0: u16,
    pub em1_1: u16,
    pub em1_2: u16,
    pub em1_3: u16,
    pub em1_4: u16,
    pub em1_5: u16,
    pub text2_0: Option<String>,
    pub text2_1: Option<String>,
    #[sqlx(rename = "BroadcastTextID2")]
    pub BroadcastTextID2: i32,
    pub lang2: u8,
    #[sqlx(rename = "Probability2")]
    pub Probability2: f32,
    pub em2_0: u16,
    pub em2_1: u16,
    pub em2_2: u16,
    pub em2_3: u16,
    pub em2_4: u16,
    pub em2_5: u16,
    pub text3_0: Option<String>,
    pub text3_1: Option<String>,
    #[sqlx(rename = "BroadcastTextID3")]
    pub BroadcastTextID3: i32,
    pub lang3: u8,
    #[sqlx(rename = "Probability3")]
    pub Probability3: f32,
    pub em3_0: u16,
    pub em3_1: u16,
    pub em3_2: u16,
    pub em3_3: u16,
    pub em3_4: u16,
    pub em3_5: u16,
    pub text4_0: Option<String>,
    pub text4_1: Option<String>,
    #[sqlx(rename = "BroadcastTextID4")]
    pub BroadcastTextID4: i32,
    pub lang4: u8,
    #[sqlx(rename = "Probability4")]
    pub Probability4: f32,
    pub em4_0: u16,
    pub em4_1: u16,
    pub em4_2: u16,
    pub em4_3: u16,
    pub em4_4: u16,
    pub em4_5: u16,
    pub text5_0: Option<String>,
    pub text5_1: Option<String>,
    #[sqlx(rename = "BroadcastTextID5")]
    pub BroadcastTextID5: i32,
    pub lang5: u8,
    #[sqlx(rename = "Probability5")]
    pub Probability5: f32,
    pub em5_0: u16,
    pub em5_1: u16,
    pub em5_2: u16,
    pub em5_3: u16,
    pub em5_4: u16,
    pub em5_5: u16,
    pub text6_0: Option<String>,
    pub text6_1: Option<String>,
    #[sqlx(rename = "BroadcastTextID6")]
    pub BroadcastTextID6: i32,
    pub lang6: u8,
    #[sqlx(rename = "Probability6")]
    pub Probability6: f32,
    pub em6_0: u16,
    pub em6_1: u16,
    pub em6_2: u16,
    pub em6_3: u16,
    pub em6_4: u16,
    pub em6_5: u16,
    pub text7_0: Option<String>,
    pub text7_1: Option<String>,
    #[sqlx(rename = "BroadcastTextID7")]
    pub BroadcastTextID7: i32,
    pub lang7: u8,
    #[sqlx(rename = "Probability7")]
    pub Probability7: f32,
    pub em7_0: u16,
    pub em7_1: u16,
    pub em7_2: u16,
    pub em7_3: u16,
    pub em7_4: u16,
    pub em7_5: u16,
    #[sqlx(rename = "VerifiedBuild")]
    pub VerifiedBuild: Option<i32>,
}

const NPC_TEXT_COLUMNS: &str = "ID, text0_0, text0_1, BroadcastTextID0, lang0, Probability0, em0_0, em0_1, em0_2, em0_3, em0_4, em0_5, text1_0, text1_1, BroadcastTextID1, lang1, Probability1, em1_0, em1_1, em1_2, em1_3, em1_4, em1_5, text2_0, text2_1, BroadcastTextID2, lang2, Probability2, em2_0, em2_1, em2_2, em2_3, em2_4, em2_5, text3_0, text3_1, BroadcastTextID3, lang3, Probability3, em3_0, em3_1, em3_2, em3_3, em3_4, em3_5, text4_0, text4_1, BroadcastTextID4, lang4, Probability4, em4_0, em4_1, em4_2, em4_3, em4_4, em4_5, text5_0, text5_1, BroadcastTextID5, lang5, Probability5, em5_0, em5_1, em5_2, em5_3, em5_4, em5_5, text6_0, text6_1, BroadcastTextID6, lang6, Probability6, em6_0, em6_1, em6_2, em6_3, em6_4, em6_5, text7_0, text7_1, BroadcastTextID7, lang7, Probability7, em7_0, em7_1, em7_2, em7_3, em7_4, em7_5, VerifiedBuild";

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
                .bind(text.em0_0)
                .bind(text.em0_1)
                .bind(text.em0_2)
                .bind(text.em0_3)
                .bind(text.em0_4)
                .bind(text.em0_5)
                .bind(&text.text1_0)
                .bind(&text.text1_1)
                .bind(text.BroadcastTextID1)
                .bind(text.lang1)
                .bind(text.Probability1)
                .bind(text.em1_0)
                .bind(text.em1_1)
                .bind(text.em1_2)
                .bind(text.em1_3)
                .bind(text.em1_4)
                .bind(text.em1_5)
                .bind(&text.text2_0)
                .bind(&text.text2_1)
                .bind(text.BroadcastTextID2)
                .bind(text.lang2)
                .bind(text.Probability2)
                .bind(text.em2_0)
                .bind(text.em2_1)
                .bind(text.em2_2)
                .bind(text.em2_3)
                .bind(text.em2_4)
                .bind(text.em2_5)
                .bind(&text.text3_0)
                .bind(&text.text3_1)
                .bind(text.BroadcastTextID3)
                .bind(text.lang3)
                .bind(text.Probability3)
                .bind(text.em3_0)
                .bind(text.em3_1)
                .bind(text.em3_2)
                .bind(text.em3_3)
                .bind(text.em3_4)
                .bind(text.em3_5)
                .bind(&text.text4_0)
                .bind(&text.text4_1)
                .bind(text.BroadcastTextID4)
                .bind(text.lang4)
                .bind(text.Probability4)
                .bind(text.em4_0)
                .bind(text.em4_1)
                .bind(text.em4_2)
                .bind(text.em4_3)
                .bind(text.em4_4)
                .bind(text.em4_5)
                .bind(&text.text5_0)
                .bind(&text.text5_1)
                .bind(text.BroadcastTextID5)
                .bind(text.lang5)
                .bind(text.Probability5)
                .bind(text.em5_0)
                .bind(text.em5_1)
                .bind(text.em5_2)
                .bind(text.em5_3)
                .bind(text.em5_4)
                .bind(text.em5_5)
                .bind(&text.text6_0)
                .bind(&text.text6_1)
                .bind(text.BroadcastTextID6)
                .bind(text.lang6)
                .bind(text.Probability6)
                .bind(text.em6_0)
                .bind(text.em6_1)
                .bind(text.em6_2)
                .bind(text.em6_3)
                .bind(text.em6_4)
                .bind(text.em6_5)
                .bind(&text.text7_0)
                .bind(&text.text7_1)
                .bind(text.BroadcastTextID7)
                .bind(text.lang7)
                .bind(text.Probability7)
                .bind(text.em7_0)
                .bind(text.em7_1)
                .bind(text.em7_2)
                .bind(text.em7_3)
                .bind(text.em7_4)
                .bind(text.em7_5)
                .bind(text.VerifiedBuild)
                .execute(pool)
                .await,
            text.ID
        ).map_err(|e| format!("Save failed: {}", e))?;
    }

    log::info!("Saved {} npc_text row(s)", texts.len());
    Ok(())
}

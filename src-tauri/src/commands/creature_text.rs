#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CreatureText {
    #[sqlx(rename = "CreatureID")]
    pub CreatureID: u32,
    #[sqlx(rename = "GroupID")]
    pub GroupID: u8,
    #[sqlx(rename = "ID")]
    pub ID: u8,
    #[sqlx(rename = "Text")]
    pub Text: Option<String>,
    #[sqlx(rename = "Type")]
    pub Type: u8,
    #[sqlx(rename = "Language")]
    pub Language: i8,
    #[sqlx(rename = "Probability")]
    pub Probability: f32,
    #[sqlx(rename = "Emote")]
    pub Emote: u32,
    #[sqlx(rename = "Duration")]
    pub Duration: u32,
    #[sqlx(rename = "Sound")]
    pub Sound: u32,
    #[sqlx(rename = "BroadcastTextId")]
    pub BroadcastTextId: i32,
    #[sqlx(rename = "TextRange")]
    pub TextRange: u8,
    pub comment: Option<String>,
}

#[tauri::command]
pub async fn get_creature_texts(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
) -> Result<Vec<CreatureText>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "SELECT * FROM creature_text WHERE CreatureID = ? ORDER BY GroupID, ID";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, CreatureText>(SQL)
        .bind(entry)
        .fetch_all(pool)
        .await,
        entry
    ).map_err(|e| format!("Query failed: {}", e))
}

#[tauri::command]
pub async fn save_creature_texts(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
    texts: Vec<CreatureText>,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL_DELETE: &str = "DELETE FROM creature_text WHERE CreatureID = ?";
    debug_sql!(app, debug, SQL_DELETE,
        sqlx::query(SQL_DELETE)
        .bind(entry)
        .execute(pool)
        .await,
        entry
    ).map_err(|e| format!("Delete failed: {}", e))?;

    const SQL_INSERT: &str = "INSERT INTO creature_text (CreatureID, GroupID, ID, Text, Type, Language, Probability, Emote, Duration, Sound, BroadcastTextId, TextRange, comment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    for t in &texts {
        debug_sql!(app, debug, SQL_INSERT,
            sqlx::query(SQL_INSERT)
            .bind(entry)
            .bind(t.GroupID)
            .bind(t.ID)
            .bind(&t.Text)
            .bind(t.Type)
            .bind(t.Language)
            .bind(t.Probability)
            .bind(t.Emote)
            .bind(t.Duration)
            .bind(t.Sound)
            .bind(t.BroadcastTextId)
            .bind(t.TextRange)
            .bind(&t.comment)
            .execute(pool)
            .await,
            entry, t.GroupID, t.ID, &t.Text, t.Type, t.Language, t.Probability, t.Emote, t.Duration, t.Sound, t.BroadcastTextId, t.TextRange, &t.comment
        ).map_err(|e| format!("Insert failed: {}", e))?;
    }

    log::info!("Saved {} creature texts for entry {}", texts.len(), entry);
    Ok(())
}

#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct GameObjectLootTemplate {
    #[sqlx(rename = "Entry")]
    pub Entry: u32,
    #[sqlx(rename = "Item")]
    pub Item: u32,
    #[sqlx(rename = "Reference")]
    pub Reference: u32,
    #[sqlx(rename = "Chance")]
    pub Chance: f32,
    #[sqlx(rename = "QuestRequired")]
    pub QuestRequired: bool,
    #[sqlx(rename = "LootMode")]
    pub LootMode: u16,
    #[sqlx(rename = "GroupId")]
    pub GroupId: u8,
    #[sqlx(rename = "MinCount")]
    pub MinCount: u8,
    #[sqlx(rename = "MaxCount")]
    pub MaxCount: u8,
    #[sqlx(rename = "Comment")]
    pub Comment: Option<String>,
}

#[tauri::command]
pub async fn get_gameobject_loot(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
) -> Result<Vec<GameObjectLootTemplate>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "SELECT * FROM gameobject_loot_template WHERE Entry = ? ORDER BY Item";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, GameObjectLootTemplate>(SQL)
        .bind(entry)
        .fetch_all(pool)
        .await,
        entry
    ).map_err(|e| format!("Query failed: {}", e))
}

#[tauri::command]
pub async fn save_gameobject_loot(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
    loot: Vec<GameObjectLootTemplate>,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL_DELETE: &str = "DELETE FROM gameobject_loot_template WHERE Entry = ?";
    debug_sql!(app, debug, SQL_DELETE,
        sqlx::query(SQL_DELETE)
        .bind(entry)
        .execute(pool)
        .await,
        entry
    ).map_err(|e| format!("Delete failed: {}", e))?;

    const SQL_INSERT: &str = "INSERT INTO gameobject_loot_template (Entry, Item, Reference, Chance, QuestRequired, LootMode, GroupId, MinCount, MaxCount, Comment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    for item in &loot {
        debug_sql!(app, debug, SQL_INSERT,
            sqlx::query(SQL_INSERT)
            .bind(entry)
            .bind(item.Item)
            .bind(item.Reference)
            .bind(item.Chance)
            .bind(item.QuestRequired)
            .bind(item.LootMode)
            .bind(item.GroupId)
            .bind(item.MinCount)
            .bind(item.MaxCount)
            .bind(&item.Comment)
            .execute(pool)
            .await,
            entry, item.Item, item.Reference, item.Chance, item.QuestRequired, item.LootMode, item.GroupId, item.MinCount, item.MaxCount, &item.Comment
        ).map_err(|e| format!("Insert failed: {}", e))?;
    }

    log::info!("Saved {} loot entries for gameobject entry {}", loot.len(), entry);
    Ok(())
}

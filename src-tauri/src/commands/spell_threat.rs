#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

/// `spell_threat`: overrides the threat a spell generates. One optional row
/// per spell; absent means the engine's own formula applies (`pctMod`
/// defaults to `1` — a full multiplier — the moment a row is added, so a
/// freshly created row is a no-op until edited).
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SpellThreat {
    pub entry: u32,
    pub flatMod: Option<i32>,
    pub pctMod: f32,
    pub apPctMod: f32,
}

#[tauri::command]
pub async fn get_spell_threat(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
) -> Result<Option<SpellThreat>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "SELECT * FROM spell_threat WHERE entry = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, SpellThreat>(SQL)
        .bind(entry)
        .fetch_optional(pool)
        .await,
        entry
    ).map_err(|e| format!("Query failed: {}", e))
}

#[tauri::command]
pub async fn delete_spell_threat(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "DELETE FROM spell_threat WHERE entry = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query(SQL)
        .bind(entry)
        .execute(pool)
        .await,
        entry
    ).map_err(|e| format!("Delete failed: {}", e))?;

    Ok(())
}

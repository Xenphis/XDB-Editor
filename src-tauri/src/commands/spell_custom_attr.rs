use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

/// `spell_custom_attr`: `SpellCustomAttributes` bitmask, TrinityCore's own
/// engine-behavior flags for a spell (crowd control, armor ignore, talent…).
/// One optional row per spell.
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SpellCustomAttr {
    pub entry: u32,
    pub attributes: u32,
}

#[tauri::command]
pub async fn get_spell_custom_attr(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
) -> Result<Option<SpellCustomAttr>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "SELECT * FROM spell_custom_attr WHERE entry = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, SpellCustomAttr>(SQL)
        .bind(entry)
        .fetch_optional(pool)
        .await,
        entry
    ).map_err(|e| format!("Query failed: {}", e))
}

#[tauri::command]
pub async fn delete_spell_custom_attr(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "DELETE FROM spell_custom_attr WHERE entry = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query(SQL)
        .bind(entry)
        .execute(pool)
        .await,
        entry
    ).map_err(|e| format!("Delete failed: {}", e))?;

    Ok(())
}

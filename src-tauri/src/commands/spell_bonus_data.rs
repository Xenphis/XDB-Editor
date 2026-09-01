use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

/// `spell_bonus_data`: overrides the healing/damage coefficients TrinityCore
/// would otherwise compute from the spell's own effect data. One optional row
/// per spell — most spells have none, which is why `get` returns `Option`.
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SpellBonusData {
    pub entry: u32,
    pub direct_bonus: f32,
    pub dot_bonus: f32,
    pub ap_bonus: f32,
    pub ap_dot_bonus: f32,
    pub comments: Option<String>,
}

#[tauri::command]
pub async fn get_spell_bonus_data(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
) -> Result<Option<SpellBonusData>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "SELECT * FROM spell_bonus_data WHERE entry = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, SpellBonusData>(SQL)
        .bind(entry)
        .fetch_optional(pool)
        .await,
        entry
    ).map_err(|e| format!("Query failed: {}", e))
}

#[tauri::command]
pub async fn delete_spell_bonus_data(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "DELETE FROM spell_bonus_data WHERE entry = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query(SQL)
        .bind(entry)
        .execute(pool)
        .await,
        entry
    ).map_err(|e| format!("Delete failed: {}", e))?;

    Ok(())
}

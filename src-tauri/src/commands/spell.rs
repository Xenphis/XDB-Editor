#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CreatureTemplateSpell {
    #[sqlx(rename = "CreatureID")]
    pub CreatureID: u32,
    #[sqlx(rename = "Index")]
    pub Index: u8,
    #[sqlx(rename = "Spell")]
    pub Spell: u32,
    #[sqlx(rename = "VerifiedBuild")]
    pub VerifiedBuild: Option<i32>,
}

#[tauri::command]
pub async fn get_npc_spells(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
) -> Result<Vec<CreatureTemplateSpell>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "SELECT * FROM creature_template_spell WHERE CreatureID = ? ORDER BY `Index`";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, CreatureTemplateSpell>(SQL)
        .bind(entry)
        .fetch_all(pool)
        .await,
        entry
    ).map_err(|e| format!("Query failed: {}", e))
}

#[tauri::command]
pub async fn save_npc_spells(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
    spells: Vec<CreatureTemplateSpell>,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL_DELETE: &str = "DELETE FROM creature_template_spell WHERE CreatureID = ?";
    debug_sql!(app, debug, SQL_DELETE,
        sqlx::query(SQL_DELETE)
        .bind(entry)
        .execute(pool)
        .await,
        entry
    ).map_err(|e| format!("Delete failed: {}", e))?;

    const SQL_INSERT: &str = "INSERT INTO creature_template_spell (CreatureID, `Index`, Spell, VerifiedBuild) VALUES (?, ?, ?, ?)";
    for spell in &spells {
        debug_sql!(app, debug, SQL_INSERT,
            sqlx::query(SQL_INSERT)
            .bind(entry)
            .bind(spell.Index)
            .bind(spell.Spell)
            .bind(spell.VerifiedBuild)
            .execute(pool)
            .await,
            entry, spell.Index, spell.Spell, spell.VerifiedBuild
        ).map_err(|e| format!("Insert failed: {}", e))?;
    }

    log::info!("Saved {} spells for creature {}", spells.len(), entry);
    Ok(())
}

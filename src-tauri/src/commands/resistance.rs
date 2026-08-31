#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CreatureTemplateResistance {
    #[sqlx(rename = "CreatureID")]
    pub CreatureID: u32,
    #[sqlx(rename = "School")]
    pub School: u8,
    #[sqlx(rename = "Resistance")]
    pub Resistance: i16,
    #[sqlx(rename = "VerifiedBuild")]
    pub VerifiedBuild: i32,
}

#[tauri::command]
pub async fn get_npc_resistances(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
) -> Result<Vec<CreatureTemplateResistance>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "SELECT * FROM creature_template_resistance WHERE CreatureID = ? ORDER BY School";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, CreatureTemplateResistance>(SQL)
        .bind(entry)
        .fetch_all(pool)
        .await,
        entry
    ).map_err(|e| format!("Query failed: {}", e))
}

#[tauri::command]
pub async fn save_npc_resistances(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
    resistances: Vec<CreatureTemplateResistance>,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    // Delete all existing resistances for this creature
    const SQL_DELETE: &str = "DELETE FROM creature_template_resistance WHERE CreatureID = ?";
    debug_sql!(app, debug, SQL_DELETE,
        sqlx::query(SQL_DELETE)
        .bind(entry)
        .execute(pool)
        .await,
        entry
    ).map_err(|e| format!("Delete failed: {}", e))?;

    // Insert new resistances (skip zero values)
    const SQL_INSERT: &str = "INSERT INTO creature_template_resistance (CreatureID, School, Resistance, VerifiedBuild) VALUES (?, ?, ?, ?)";
    for r in &resistances {
        if r.Resistance != 0 {
            debug_sql!(app, debug, SQL_INSERT,
                sqlx::query(SQL_INSERT)
                .bind(entry)
                .bind(r.School)
                .bind(r.Resistance)
                .bind(r.VerifiedBuild)
                .execute(pool)
                .await,
                entry, r.School, r.Resistance, r.VerifiedBuild
            ).map_err(|e| format!("Insert failed: {}", e))?;
        }
    }

    log::info!("Saved resistances for creature {}", entry);
    Ok(())
}

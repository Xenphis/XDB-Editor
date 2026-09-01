#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CreatureTemplateModel {
    #[sqlx(rename = "CreatureID")]
    pub CreatureID: u32,
    #[sqlx(rename = "Idx")]
    pub Idx: u16,
    #[sqlx(rename = "CreatureDisplayID")]
    pub CreatureDisplayID: u32,
    #[sqlx(rename = "DisplayScale")]
    pub DisplayScale: f32,
    #[sqlx(rename = "Probability")]
    pub Probability: f32,
    #[sqlx(rename = "VerifiedBuild")]
    pub VerifiedBuild: Option<u16>,
}

#[tauri::command]
pub async fn get_npc_models(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
) -> Result<Vec<CreatureTemplateModel>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "SELECT * FROM creature_template_model WHERE CreatureID = ? ORDER BY Idx";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, CreatureTemplateModel>(SQL)
        .bind(entry)
        .fetch_all(pool)
        .await,
        entry
    ).map_err(|e| format!("Query failed: {}", e))
}

#[tauri::command]
pub async fn save_npc_models(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
    models: Vec<CreatureTemplateModel>,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    // Delete existing rows and re-insert
    const SQL_DELETE: &str = "DELETE FROM creature_template_model WHERE CreatureID = ?";
    debug_sql!(app, debug, SQL_DELETE,
        sqlx::query(SQL_DELETE)
        .bind(entry)
        .execute(pool)
        .await,
        entry
    ).map_err(|e| format!("Delete failed: {}", e))?;

    const SQL_INSERT: &str = "INSERT INTO creature_template_model (CreatureID, Idx, CreatureDisplayID, DisplayScale, Probability, VerifiedBuild) VALUES (?, ?, ?, ?, ?, ?)";
    for model in &models {
        debug_sql!(app, debug, SQL_INSERT,
            sqlx::query(SQL_INSERT)
            .bind(entry)
            .bind(model.Idx)
            .bind(model.CreatureDisplayID)
            .bind(model.DisplayScale)
            .bind(model.Probability)
            .bind(model.VerifiedBuild)
            .execute(pool)
            .await,
            entry, model.Idx, model.CreatureDisplayID, model.DisplayScale, model.Probability, model.VerifiedBuild
        ).map_err(|e| format!("Insert failed: {}", e))?;
    }

    log::info!("Saved {} models for creature {}", models.len(), entry);
    Ok(())
}

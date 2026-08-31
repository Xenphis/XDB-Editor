#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CreatureEquipTemplate {
    #[sqlx(rename = "CreatureID")]
    pub CreatureID: u32,
    #[sqlx(rename = "ID")]
    pub ID: u8,
    #[sqlx(rename = "ItemID1")]
    pub ItemID1: u32,
    #[sqlx(rename = "ItemID2")]
    pub ItemID2: u32,
    #[sqlx(rename = "ItemID3")]
    pub ItemID3: u32,
    #[sqlx(rename = "VerifiedBuild")]
    pub VerifiedBuild: Option<i32>,
}

#[tauri::command]
pub async fn get_npc_equip(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
) -> Result<Vec<CreatureEquipTemplate>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "SELECT * FROM creature_equip_template WHERE CreatureID = ? ORDER BY ID";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, CreatureEquipTemplate>(SQL)
        .bind(entry)
        .fetch_all(pool)
        .await,
        entry
    ).map_err(|e| format!("Query failed: {}", e))
}

#[tauri::command]
pub async fn save_npc_equip(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
    equips: Vec<CreatureEquipTemplate>,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    // Delete existing rows and re-insert
    const SQL_DELETE: &str = "DELETE FROM creature_equip_template WHERE CreatureID = ?";
    debug_sql!(app, debug, SQL_DELETE,
        sqlx::query(SQL_DELETE)
        .bind(entry)
        .execute(pool)
        .await,
        entry
    ).map_err(|e| format!("Delete failed: {}", e))?;

    const SQL_INSERT: &str = "INSERT INTO creature_equip_template (CreatureID, ID, ItemID1, ItemID2, ItemID3, VerifiedBuild) VALUES (?, ?, ?, ?, ?, ?)";
    for equip in &equips {
        debug_sql!(app, debug, SQL_INSERT,
            sqlx::query(SQL_INSERT)
            .bind(entry)
            .bind(equip.ID)
            .bind(equip.ItemID1)
            .bind(equip.ItemID2)
            .bind(equip.ItemID3)
            .bind(equip.VerifiedBuild)
            .execute(pool)
            .await,
            entry, equip.ID, equip.ItemID1, equip.ItemID2, equip.ItemID3, equip.VerifiedBuild
        ).map_err(|e| format!("Insert failed: {}", e))?;
    }

    log::info!("Saved {} equip sets for creature {}", equips.len(), entry);
    Ok(())
}

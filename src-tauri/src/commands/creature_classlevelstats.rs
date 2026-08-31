#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CreatureClassLevelStats {
    pub level: u8,
    pub class: u8,
    pub basehp0: u32,
    pub basehp1: u32,
    pub basehp2: u32,
    pub basemana: u32,
    pub basearmor: u32,
    pub attackpower: u16,
    pub rangedattackpower: u16,
    pub damage_base: f32,
    pub damage_exp1: f32,
    pub damage_exp2: f32,
    pub comment: Option<String>,
}

#[tauri::command]
pub async fn get_creature_classlevelstats(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
) -> Result<Vec<CreatureClassLevelStats>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    const SQL: &str = "SELECT * FROM creature_classlevelstats ORDER BY level, class";
    let rows: Vec<CreatureClassLevelStats> = debug_sql!(app, debug, SQL,
        sqlx::query_as(SQL).fetch_all(pool).await
    ).map_err(|e| format!("Query failed: {}", e))?;
    Ok(rows)
}

#[tauri::command]
pub async fn get_creature_classlevelstat(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    level: u8,
    class_id: u8,
) -> Result<CreatureClassLevelStats, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    const SQL: &str = "SELECT * FROM creature_classlevelstats WHERE level = ? AND class = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, CreatureClassLevelStats>(SQL)
            .bind(level)
            .bind(class_id)
            .fetch_optional(pool)
            .await,
        level, class_id
    ).map_err(|e| format!("Query failed: {}", e))?
    .ok_or_else(|| format!("No entry for level={} class={}", level, class_id))
}

#[tauri::command]
pub async fn save_creature_classlevelstat(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    data: CreatureClassLevelStats,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    const SQL: &str = "INSERT INTO creature_classlevelstats (level, class, basehp0, basehp1, basehp2, basemana, basearmor, \
         attackpower, rangedattackpower, damage_base, damage_exp1, damage_exp2, comment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE level = VALUES(level), class = VALUES(class), basehp0 = VALUES(basehp0), basehp1 = VALUES(basehp1), basehp2 = VALUES(basehp2), basemana = VALUES(basemana), basearmor = VALUES(basearmor), \
         attackpower = VALUES(\
         attackpower), rangedattackpower = VALUES(rangedattackpower), damage_base = VALUES(damage_base), damage_exp1 = VALUES(damage_exp1), damage_exp2 = VALUES(damage_exp2), comment = VALUES(comment)";
    debug_sql!(app, debug, SQL,
        sqlx::query(SQL)
            .bind(data.level)
            .bind(data.class)
            .bind(data.basehp0)
            .bind(data.basehp1)
            .bind(data.basehp2)
            .bind(data.basemana)
            .bind(data.basearmor)
            .bind(data.attackpower)
            .bind(data.rangedattackpower)
            .bind(data.damage_base)
            .bind(data.damage_exp1)
            .bind(data.damage_exp2)
            .bind(&data.comment)
            .execute(pool)
            .await,
        data.level, data.class
    ).map_err(|e| format!("Save failed: {}", e))?;
    Ok(())
}

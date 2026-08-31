#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Trainer {
    #[sqlx(rename = "Id")]
    pub Id: u32,
    #[sqlx(rename = "Type")]
    pub Type: u8,
    #[sqlx(rename = "Requirement")]
    pub Requirement: u32,
    #[sqlx(rename = "Greeting")]
    pub Greeting: Option<String>,
    #[sqlx(rename = "VerifiedBuild")]
    pub VerifiedBuild: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TrainerSpell {
    #[sqlx(rename = "TrainerId")]
    pub TrainerId: u32,
    #[sqlx(rename = "SpellId")]
    pub SpellId: u32,
    #[sqlx(rename = "MoneyCost")]
    pub MoneyCost: u32,
    #[sqlx(rename = "ReqSkillLine")]
    pub ReqSkillLine: u32,
    #[sqlx(rename = "ReqSkillRank")]
    pub ReqSkillRank: u32,
    #[sqlx(rename = "ReqAbility1")]
    pub ReqAbility1: u32,
    #[sqlx(rename = "ReqAbility2")]
    pub ReqAbility2: u32,
    #[sqlx(rename = "ReqAbility3")]
    pub ReqAbility3: u32,
    #[sqlx(rename = "ReqLevel")]
    pub ReqLevel: u8,
    #[sqlx(rename = "VerifiedBuild")]
    pub VerifiedBuild: Option<i32>,
}

#[tauri::command]
pub async fn get_trainers(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<Trainer>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    let limit = limit.unwrap_or(1000);
    let offset = offset.unwrap_or(0);

    const SQL: &str = "SELECT * FROM trainer ORDER BY Id LIMIT ? OFFSET ?";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, Trainer>(SQL)
            .bind(limit)
            .bind(offset)
            .fetch_all(pool)
            .await,
        limit, offset
    ).map_err(|e| format!("Query failed: {}", e))
}

#[tauri::command]
pub async fn get_trainer(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    id: u32,
) -> Result<Trainer, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "SELECT * FROM trainer WHERE Id = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, Trainer>(SQL)
            .bind(id)
            .fetch_optional(pool)
            .await,
        id
    ).map_err(|e| format!("Query failed: {}", e))?
    .ok_or_else(|| format!("Trainer {} not found", id))
}

#[tauri::command]
pub async fn save_trainer(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    data: Trainer,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "INSERT INTO trainer (Id, Type, Requirement, Greeting, VerifiedBuild) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE Id = VALUES(Id), Type = VALUES(Type), Requirement = VALUES(Requirement), Greeting = VALUES(Greeting), VerifiedBuild = VALUES(VerifiedBuild)";
    debug_sql!(app, debug, SQL,
        sqlx::query(SQL)
            .bind(data.Id)
            .bind(data.Type)
            .bind(data.Requirement)
            .bind(&data.Greeting)
            .bind(data.VerifiedBuild)
            .execute(pool)
            .await,
        data.Id
    ).map_err(|e| format!("Save failed: {}", e))?;

    log::info!("Saved trainer {}", data.Id);
    Ok(())
}

#[tauri::command]
pub async fn delete_trainer(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    id: u32,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "DELETE FROM trainer WHERE Id = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query(SQL)
            .bind(id)
            .execute(pool)
            .await,
        id
    ).map_err(|e| format!("Delete failed: {}", e))?;

    log::info!("Deleted trainer {}", id);
    Ok(())
}

#[tauri::command]
pub async fn get_trainer_spells(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    trainer_id: u32,
) -> Result<Vec<TrainerSpell>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "SELECT * FROM trainer_spell WHERE TrainerId = ? ORDER BY SpellId";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, TrainerSpell>(SQL)
            .bind(trainer_id)
            .fetch_all(pool)
            .await,
        trainer_id
    ).map_err(|e| format!("Query failed: {}", e))
}

#[tauri::command]
pub async fn save_trainer_spells(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    trainer_id: u32,
    spells: Vec<TrainerSpell>,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL_DELETE: &str = "DELETE FROM trainer_spell WHERE TrainerId = ?";
    debug_sql!(app, debug, SQL_DELETE,
        sqlx::query(SQL_DELETE)
            .bind(trainer_id)
            .execute(pool)
            .await,
        trainer_id
    ).map_err(|e| format!("Delete failed: {}", e))?;

    const SQL_INSERT: &str = "INSERT INTO trainer_spell \
        (TrainerId, SpellId, MoneyCost, ReqSkillLine, ReqSkillRank, \
         ReqAbility1, ReqAbility2, ReqAbility3, ReqLevel, VerifiedBuild) \
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    for s in &spells {
        debug_sql!(app, debug, SQL_INSERT,
            sqlx::query(SQL_INSERT)
                .bind(trainer_id)
                .bind(s.SpellId)
                .bind(s.MoneyCost)
                .bind(s.ReqSkillLine)
                .bind(s.ReqSkillRank)
                .bind(s.ReqAbility1)
                .bind(s.ReqAbility2)
                .bind(s.ReqAbility3)
                .bind(s.ReqLevel)
                .bind(s.VerifiedBuild)
                .execute(pool)
                .await,
            trainer_id, s.SpellId
        ).map_err(|e| format!("Insert failed: {}", e))?;
    }

    log::info!("Saved {} spells for trainer {}", spells.len(), trainer_id);
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CreatureDefaultTrainer {
    #[sqlx(rename = "CreatureId")]
    pub CreatureId: u32,
    #[sqlx(rename = "TrainerId")]
    pub TrainerId: u32,
}

#[tauri::command]
pub async fn get_creature_default_trainers(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    trainer_id: u32,
) -> Result<Vec<CreatureDefaultTrainer>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "SELECT * FROM creature_default_trainer WHERE TrainerId = ? ORDER BY CreatureId";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, CreatureDefaultTrainer>(SQL)
            .bind(trainer_id)
            .fetch_all(pool)
            .await,
        trainer_id
    ).map_err(|e| format!("Query failed: {}", e))
}

#[tauri::command]
pub async fn save_creature_default_trainers(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    trainer_id: u32,
    entries: Vec<CreatureDefaultTrainer>,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL_DELETE: &str = "DELETE FROM creature_default_trainer WHERE TrainerId = ?";
    debug_sql!(app, debug, SQL_DELETE,
        sqlx::query(SQL_DELETE)
            .bind(trainer_id)
            .execute(pool)
            .await,
        trainer_id
    ).map_err(|e| format!("Delete failed: {}", e))?;

    const SQL_INSERT: &str = "INSERT INTO creature_default_trainer (CreatureId, TrainerId) VALUES (?, ?)";
    for e in &entries {
        debug_sql!(app, debug, SQL_INSERT,
            sqlx::query(SQL_INSERT)
                .bind(e.CreatureId)
                .bind(trainer_id)
                .execute(pool)
                .await,
            e.CreatureId, trainer_id
        ).map_err(|e| format!("Insert failed: {}", e))?;
    }

    log::info!("Saved {} creature links for trainer {}", entries.len(), trainer_id);
    Ok(())
}

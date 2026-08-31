#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CreatureOnkillReputation {
    pub creature_id: u32,
    #[sqlx(rename = "RewOnKillRepFaction1")]
    pub RewOnKillRepFaction1: i16,
    #[sqlx(rename = "RewOnKillRepFaction2")]
    pub RewOnKillRepFaction2: i16,
    #[sqlx(rename = "MaxStanding1")]
    pub MaxStanding1: i8,
    #[sqlx(rename = "IsTeamAward1")]
    pub IsTeamAward1: i8,
    #[sqlx(rename = "RewOnKillRepValue1")]
    pub RewOnKillRepValue1: i32,
    #[sqlx(rename = "MaxStanding2")]
    pub MaxStanding2: i8,
    #[sqlx(rename = "IsTeamAward2")]
    pub IsTeamAward2: i8,
    #[sqlx(rename = "RewOnKillRepValue2")]
    pub RewOnKillRepValue2: i32,
    #[sqlx(rename = "TeamDependent")]
    pub TeamDependent: u8,
}

#[tauri::command]
pub async fn get_creature_onkill_reputation(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
) -> Result<Option<CreatureOnkillReputation>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "SELECT * FROM creature_onkill_reputation WHERE creature_id = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, CreatureOnkillReputation>(SQL)
        .bind(entry)
        .fetch_optional(pool)
        .await,
        entry
    ).map_err(|e| format!("Query failed: {}", e))
}

#[tauri::command]
pub async fn save_creature_onkill_reputation(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
    reputation: CreatureOnkillReputation,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "INSERT INTO creature_onkill_reputation (creature_id, RewOnKillRepFaction1, RewOnKillRepFaction2, MaxStanding1, IsTeamAward1, \
        RewOnKillRepValue1, MaxStanding2, IsTeamAward2, RewOnKillRepValue2, TeamDependent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE creature_id = VALUES(creature_id), RewOnKillRepFaction1 = VALUES(RewOnKillRepFaction1), RewOnKillRepFaction2 = VALUES(RewOnKillRepFaction2), MaxStanding1 = VALUES(MaxStanding1), IsTeamAward1 = VALUES(IsTeamAward1), \
        RewOnKillRepValue1 = VALUES(\
        RewOnKillRepValue1), MaxStanding2 = VALUES(MaxStanding2), IsTeamAward2 = VALUES(IsTeamAward2), RewOnKillRepValue2 = VALUES(RewOnKillRepValue2), TeamDependent = VALUES(TeamDependent)";
    debug_sql!(app, debug, SQL,
        sqlx::query(SQL)
        .bind(entry)
        .bind(reputation.RewOnKillRepFaction1)
        .bind(reputation.RewOnKillRepFaction2)
        .bind(reputation.MaxStanding1)
        .bind(reputation.IsTeamAward1)
        .bind(reputation.RewOnKillRepValue1)
        .bind(reputation.MaxStanding2)
        .bind(reputation.IsTeamAward2)
        .bind(reputation.RewOnKillRepValue2)
        .bind(reputation.TeamDependent)
        .execute(pool)
        .await,
        entry, reputation.RewOnKillRepFaction1, reputation.RewOnKillRepFaction2,
        reputation.MaxStanding1, reputation.IsTeamAward1, reputation.RewOnKillRepValue1,
        reputation.MaxStanding2, reputation.IsTeamAward2, reputation.RewOnKillRepValue2,
        reputation.TeamDependent
    ).map_err(|e| format!("Save failed: {}", e))?;

    log::info!("Saved creature_onkill_reputation for creature {}", entry);
    Ok(())
}

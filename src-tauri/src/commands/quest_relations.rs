#![allow(non_snake_case)]

use serde::Serialize;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize)]
pub struct QuestRelations {
    pub creature_starters: Vec<u32>,
    pub creature_enders: Vec<u32>,
    pub gameobject_starters: Vec<u32>,
    pub gameobject_enders: Vec<u32>,
}

#[derive(Debug, Clone, Serialize)]
pub struct EntityQuestRelations {
    pub starters: Vec<u32>,
    pub enders: Vec<u32>,
}

#[tauri::command]
pub async fn get_quest_relations(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    quest: u32,
) -> Result<QuestRelations, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL_CS: &str = "SELECT id FROM creature_queststarter WHERE quest = ? ORDER BY id";
    const SQL_CE: &str = "SELECT id FROM creature_questender WHERE quest = ? ORDER BY id";
    const SQL_GS: &str = "SELECT id FROM gameobject_queststarter WHERE quest = ? ORDER BY id";
    const SQL_GE: &str = "SELECT id FROM gameobject_questender WHERE quest = ? ORDER BY id";

    let creature_starters = debug_sql!(app, debug, SQL_CS,
        sqlx::query_scalar::<_, u32>(SQL_CS).bind(quest).fetch_all(pool).await, quest
    ).map_err(|e| format!("Query failed: {}", e))?;
    let creature_enders = debug_sql!(app, debug, SQL_CE,
        sqlx::query_scalar::<_, u32>(SQL_CE).bind(quest).fetch_all(pool).await, quest
    ).map_err(|e| format!("Query failed: {}", e))?;
    let gameobject_starters = debug_sql!(app, debug, SQL_GS,
        sqlx::query_scalar::<_, u32>(SQL_GS).bind(quest).fetch_all(pool).await, quest
    ).map_err(|e| format!("Query failed: {}", e))?;
    let gameobject_enders = debug_sql!(app, debug, SQL_GE,
        sqlx::query_scalar::<_, u32>(SQL_GE).bind(quest).fetch_all(pool).await, quest
    ).map_err(|e| format!("Query failed: {}", e))?;

    Ok(QuestRelations { creature_starters, creature_enders, gameobject_starters, gameobject_enders })
}

#[tauri::command]
pub async fn get_creature_quest_relations(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    id: u32,
) -> Result<EntityQuestRelations, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    const SQL_S: &str = "SELECT quest FROM creature_queststarter WHERE id = ? ORDER BY quest";
    const SQL_E: &str = "SELECT quest FROM creature_questender WHERE id = ? ORDER BY quest";
    let starters = debug_sql!(app, debug, SQL_S,
        sqlx::query_scalar::<_, u32>(SQL_S).bind(id).fetch_all(pool).await, id
    ).map_err(|e| format!("Query failed: {}", e))?;
    let enders = debug_sql!(app, debug, SQL_E,
        sqlx::query_scalar::<_, u32>(SQL_E).bind(id).fetch_all(pool).await, id
    ).map_err(|e| format!("Query failed: {}", e))?;
    Ok(EntityQuestRelations { starters, enders })
}

#[tauri::command]
pub async fn get_gameobject_quest_relations(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    id: u32,
) -> Result<EntityQuestRelations, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    const SQL_S: &str = "SELECT quest FROM gameobject_queststarter WHERE id = ? ORDER BY quest";
    const SQL_E: &str = "SELECT quest FROM gameobject_questender WHERE id = ? ORDER BY quest";
    let starters = debug_sql!(app, debug, SQL_S,
        sqlx::query_scalar::<_, u32>(SQL_S).bind(id).fetch_all(pool).await, id
    ).map_err(|e| format!("Query failed: {}", e))?;
    let enders = debug_sql!(app, debug, SQL_E,
        sqlx::query_scalar::<_, u32>(SQL_E).bind(id).fetch_all(pool).await, id
    ).map_err(|e| format!("Query failed: {}", e))?;
    Ok(EntityQuestRelations { starters, enders })
}

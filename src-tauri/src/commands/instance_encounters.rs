#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct InstanceEncounter {
    pub entry: u32,
    pub creditType: u8,
    pub creditEntry: u32,
    pub lastEncounterDungeon: u16,
    pub comment: String,
}

#[derive(Debug, Serialize)]
pub struct InstanceEncounterListResult {
    pub data: Vec<InstanceEncounter>,
    pub total: i64,
}

#[tauri::command]
pub async fn get_instance_encounters(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    search: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<InstanceEncounterListResult, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    let limit = limit.unwrap_or(50);
    let offset = offset.unwrap_or(0);

    let (data, total) = match &search {
        Some(q) if !q.is_empty() => {
            let pattern = format!("%{}%", q);
            const SQL_DATA: &str = "SELECT * FROM instance_encounters WHERE entry LIKE ? OR comment LIKE ? ORDER BY entry LIMIT ? OFFSET ?";
            let rows: Vec<InstanceEncounter> = debug_sql!(app, debug, SQL_DATA,
                sqlx::query_as(SQL_DATA).bind(&pattern).bind(&pattern).bind(limit).bind(offset).fetch_all(pool).await,
                &pattern, &pattern, limit, offset
            ).map_err(|e| format!("Query failed: {}", e))?;
            const SQL_COUNT: &str = "SELECT COUNT(*) FROM instance_encounters WHERE entry LIKE ? OR comment LIKE ?";
            let count: (i64,) = debug_sql!(app, debug, SQL_COUNT,
                sqlx::query_as(SQL_COUNT).bind(&pattern).bind(&pattern).fetch_one(pool).await,
                &pattern, &pattern
            ).map_err(|e| format!("Count query failed: {}", e))?;
            (rows, count.0)
        }
        _ => {
            const SQL_DATA: &str = "SELECT * FROM instance_encounters ORDER BY entry LIMIT ? OFFSET ?";
            let rows: Vec<InstanceEncounter> = debug_sql!(app, debug, SQL_DATA,
                sqlx::query_as(SQL_DATA).bind(limit).bind(offset).fetch_all(pool).await,
                limit, offset
            ).map_err(|e| format!("Query failed: {}", e))?;
            const SQL_COUNT: &str = "SELECT COUNT(*) FROM instance_encounters";
            let count: (i64,) = debug_sql!(app, debug, SQL_COUNT,
                sqlx::query_as(SQL_COUNT).fetch_one(pool).await
            ).map_err(|e| format!("Count query failed: {}", e))?;
            (rows, count.0)
        }
    };

    Ok(InstanceEncounterListResult { data, total })
}

/// Resolve the encounters that belong to a given instance map.
///
/// `instance_encounters` has no map column: an encounter is linked to a map
/// through its boss. For creature-kill credit (`creditType = 0`), `creditEntry`
/// references a `creature_template.entry`; that boss is spawned in the `creature`
/// table, whose `map` column tells us which instance the encounter belongs to.
#[tauri::command]
pub async fn get_instance_encounters_by_map(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    map: u16,
) -> Result<Vec<InstanceEncounter>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    const SQL: &str = "SELECT DISTINCT ie.entry, ie.creditType, ie.creditEntry, ie.lastEncounterDungeon, ie.comment \
        FROM instance_encounters ie \
        JOIN creature c ON c.id = ie.creditEntry AND ie.creditType = 0 \
        WHERE c.map = ? ORDER BY ie.entry";
    let rows: Vec<InstanceEncounter> = debug_sql!(app, debug, SQL,
        sqlx::query_as(SQL).bind(map).fetch_all(pool).await,
        map
    ).map_err(|e| format!("Query failed: {}", e))?;
    Ok(rows)
}

#[tauri::command]
pub async fn get_instance_encounter(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
) -> Result<InstanceEncounter, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    const SQL: &str = "SELECT * FROM instance_encounters WHERE entry = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, InstanceEncounter>(SQL).bind(entry).fetch_optional(pool).await,
        entry
    ).map_err(|e| format!("Query failed: {}", e))?
    .ok_or_else(|| format!("Instance encounter for entry={} not found", entry))
}

#[tauri::command]
pub async fn save_instance_encounter(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    data: InstanceEncounter,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    const SQL: &str = "INSERT INTO instance_encounters (entry, creditType, creditEntry, lastEncounterDungeon, comment) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE entry = VALUES(entry), creditType = VALUES(creditType), creditEntry = VALUES(creditEntry), lastEncounterDungeon = VALUES(lastEncounterDungeon), comment = VALUES(comment)";
    debug_sql!(app, debug, SQL,
        sqlx::query(SQL)
            .bind(data.entry)
            .bind(data.creditType)
            .bind(data.creditEntry)
            .bind(data.lastEncounterDungeon)
            .bind(&data.comment)
            .execute(pool)
            .await,
        data.entry, data.creditType, data.creditEntry, data.lastEncounterDungeon, &data.comment
    ).map_err(|e| format!("Save failed: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn delete_instance_encounter(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    const SQL: &str = "DELETE FROM instance_encounters WHERE entry = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query(SQL).bind(entry).execute(pool).await,
        entry
    ).map_err(|e| format!("Delete failed: {}", e))?;
    Ok(())
}

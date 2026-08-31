#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

/// A `creature_formations` row enriched with the member spawn's identity, so
/// the editor can label a GUID without a second round-trip. The joined columns
/// are optional: a formation may reference a spawn that no longer exists.
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CreatureFormationMember {
    pub leaderGUID: u32,
    pub memberGUID: u32,
    pub dist: f32,
    pub angle: f32,
    pub groupAI: u32,
    pub point_1: u16,
    pub point_2: u16,
    pub entry: Option<u32>,
    pub name: Option<String>,
    pub map: Option<u16>,
}

/// One row of the formation list: the leader plus its member count.
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CreatureFormationGroup {
    pub leaderGUID: u32,
    pub memberCount: i64,
    pub entry: Option<u32>,
    pub name: Option<String>,
    pub map: Option<u16>,
}

/// A candidate spawn for the "add member" picker.
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CreatureSpawnOption {
    pub guid: u32,
    pub id: u32,
    pub map: u16,
    pub name: Option<String>,
    /// Formation this spawn already belongs to, if any. `memberGUID` is the
    /// table's primary key, so adding it elsewhere moves it instead of
    /// duplicating it — the picker warns about that.
    pub leaderGUID: Option<u32>,
}

#[tauri::command]
pub async fn get_creature_formation_groups(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
) -> Result<Vec<CreatureFormationGroup>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "SELECT cf.leaderGUID, COUNT(*) AS memberCount, c.id AS entry, ct.name, c.map \
         FROM creature_formations cf \
         LEFT JOIN creature c ON c.guid = cf.leaderGUID \
         LEFT JOIN creature_template ct ON ct.entry = c.id \
         GROUP BY cf.leaderGUID, c.id, ct.name, c.map \
         ORDER BY cf.leaderGUID";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, CreatureFormationGroup>(SQL)
        .fetch_all(pool)
        .await
    ).map_err(|e| format!("Query failed: {}", e))
}

#[tauri::command]
pub async fn get_creature_formation(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    leader_guid: u32,
) -> Result<Vec<CreatureFormationMember>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    // The leader's own row (memberGUID = leaderGUID) sorts first so the editor
    // can pin it without re-sorting client side.
    const SQL: &str = "SELECT cf.leaderGUID, cf.memberGUID, cf.dist, cf.angle, cf.groupAI, cf.point_1, cf.point_2, \
         c.id AS entry, ct.name, c.map \
         FROM creature_formations cf \
         LEFT JOIN creature c ON c.guid = cf.memberGUID \
         LEFT JOIN creature_template ct ON ct.entry = c.id \
         WHERE cf.leaderGUID = ? \
         ORDER BY cf.memberGUID = cf.leaderGUID DESC, cf.memberGUID";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, CreatureFormationMember>(SQL)
        .bind(leader_guid)
        .fetch_all(pool)
        .await,
        leader_guid
    ).map_err(|e| format!("Query failed: {}", e))
}

/// Formation row of a single spawn — drives the formation frame in the spawn
/// editor. Returns `None` when the spawn is not part of any formation.
#[tauri::command]
pub async fn get_creature_formation_of_member(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    member_guid: u32,
) -> Result<Option<CreatureFormationMember>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "SELECT cf.leaderGUID, cf.memberGUID, cf.dist, cf.angle, cf.groupAI, cf.point_1, cf.point_2, \
         c.id AS entry, ct.name, c.map \
         FROM creature_formations cf \
         LEFT JOIN creature c ON c.guid = cf.leaderGUID \
         LEFT JOIN creature_template ct ON ct.entry = c.id \
         WHERE cf.memberGUID = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, CreatureFormationMember>(SQL)
        .bind(member_guid)
        .fetch_optional(pool)
        .await,
        member_guid
    ).map_err(|e| format!("Query failed: {}", e))
}

/// Spawn lookup for the member picker. `query` matches a GUID, a template
/// entry, or a creature name; `map` restricts the result to the leader's map
/// because a formation only makes sense within one map.
#[tauri::command]
pub async fn search_creature_spawns(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    query: String,
    map: Option<u16>,
    limit: Option<i64>,
) -> Result<Vec<CreatureSpawnOption>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    let limit = limit.unwrap_or(50);
    let numeric = query.trim().parse::<u32>().ok();
    let like = format!("%{}%", query.trim());

    const SQL: &str = "SELECT c.guid, c.id, c.map, ct.name, cf.leaderGUID \
         FROM creature c \
         LEFT JOIN creature_template ct ON ct.entry = c.id \
         LEFT JOIN creature_formations cf ON cf.memberGUID = c.guid \
         WHERE (? IS NULL OR c.map = ?) \
           AND (c.guid = ? OR c.id = ? OR ct.name LIKE ?) \
         ORDER BY c.guid \
         LIMIT ?";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, CreatureSpawnOption>(SQL)
        .bind(map)
        .bind(map)
        .bind(numeric)
        .bind(numeric)
        .bind(&like)
        .bind(limit)
        .fetch_all(pool)
        .await,
        map, numeric, like, limit
    ).map_err(|e| format!("Query failed: {}", e))
}

/// Drops a whole formation (leader row included).
#[tauri::command]
pub async fn delete_creature_formation(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    leader_guid: u32,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "DELETE FROM creature_formations WHERE leaderGUID = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query(SQL)
            .bind(leader_guid)
            .execute(pool)
            .await,
        leader_guid
    ).map_err(|e| format!("Delete failed: {}", e))?;

    log::info!("Deleted formation {}", leader_guid);
    Ok(())
}

#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Creature {
    pub guid: u32,
    pub id1: u32,
    pub id2: u32,
    pub id3: u32,
    pub map: u16,
    pub zoneId: u16,
    pub areaId: u16,
    pub spawnMask: u8,
    pub phaseMask: u32,
    pub equipment_id: i8,
    pub position_x: f32,
    pub position_y: f32,
    pub position_z: f32,
    pub orientation: f32,
    pub spawntimesecs: u32,
    pub wander_distance: f32,
    pub currentwaypoint: u32,
    pub curhealth: u32,
    pub curmana: u32,
    #[sqlx(rename = "MovementType")]
    pub MovementType: u8,
    pub npcflag: u32,
    pub unit_flags: u32,
    pub dynamicflags: u32,
    #[sqlx(rename = "ScriptName")]
    pub ScriptName: String,
    #[sqlx(rename = "VerifiedBuild")]
    pub VerifiedBuild: Option<i32>,
    #[sqlx(rename = "CreateObject")]
    pub CreateObject: u8,
    #[sqlx(rename = "Comment")]
    pub Comment: Option<String>,
}

#[tauri::command]
pub async fn get_creature_spawns(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    id: u32,
) -> Result<Vec<Creature>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "SELECT * FROM creature WHERE id1 = ? ORDER BY guid";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, Creature>(SQL)
        .bind(id)
        .fetch_all(pool)
        .await,
        id
    ).map_err(|e| format!("Query failed: {}", e))
}

/// One spawn by guid, for the 3D view's selected-spawn panel (the marker it
/// streams carries only what's needed to place a model).
#[tauri::command]
pub async fn get_creature_spawn(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    guid: u32,
) -> Result<Option<Creature>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "SELECT * FROM creature WHERE guid = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, Creature>(SQL)
        .bind(guid)
        .fetch_optional(pool)
        .await,
        guid
    ).map_err(|e| format!("Query failed: {}", e))
}

/// A lightweight creature spawn for the 3D map view: only what's needed to
/// place and identify a model, kept small because a camera region can pull
/// thousands of rows. `display_id` is resolved from the template's primary
/// `creature_template_model` row (lowest `Idx`) — AzerothCore's `creature`
/// table carries no per-spawn display override; the client resolves the
/// display id to an M2 path via `minimap_creature_models`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatureSpawnMarker {
    pub guid: u32,
    pub id1: u32,
    pub position_x: f32,
    pub position_y: f32,
    pub position_z: f32,
    pub orientation: f32,
    pub display_id: u32,
    pub name: String,
    pub scale: f32,
}

/// Raw joined row. `display_id`/`scale` come straight from the template's
/// primary `creature_template_model` row (LEFT JOIN filtered to `MIN(Idx)`),
/// `name` from `creature_template` — both nullable since the join can miss.
#[derive(Debug, FromRow)]
struct CreatureSpawnRow {
    guid: u32,
    id1: u32,
    position_x: f32,
    position_y: f32,
    position_z: f32,
    orientation: f32,
    name: Option<String>,
    display_id: Option<u32>,
    scale: Option<f32>,
}

/// Creature spawns inside a world-space bounding box on one map. Used by the 3D
/// view to stream only the spawns around the camera (tile-sized boxes), so big
/// continents don't load tens of thousands of rows at once. `limit` is a safety
/// cap against a pathologically dense box.
///
/// `phase_mask` keeps only the spawns visible in that phase; `None` returns
/// every phase. Filtering here rather than in the client keeps the models that
/// are never drawn from being built at all.
#[tauri::command]
pub async fn get_creature_spawns_in_bounds(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    map: u16,
    min_x: f32,
    max_x: f32,
    min_y: f32,
    max_y: f32,
    phase_mask: Option<u32>,
    limit: i64,
) -> Result<Vec<CreatureSpawnMarker>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    // The phase filter binds phase_mask twice: NULL disables it (every phase).
    // It is a bitmask test, not an equality — a spawn with phaseMask 3 lives in
    // phases 1 and 2 and has to show up under either.
    const SQL: &str = "SELECT c.guid, c.id1, c.position_x, c.position_y, c.position_z, c.orientation, \
         ct.name, ctm.CreatureDisplayID AS display_id, ctm.DisplayScale AS scale \
         FROM creature c \
         LEFT JOIN creature_template ct ON ct.entry = c.id1 \
         LEFT JOIN creature_template_model ctm ON ctm.CreatureID = c.id1 \
             AND ctm.Idx = (SELECT MIN(Idx) FROM creature_template_model WHERE CreatureID = c.id1) \
         WHERE c.map = ? AND c.position_x BETWEEN ? AND ? AND c.position_y BETWEEN ? AND ? \
         AND (? IS NULL OR (c.phaseMask & ?) <> 0) \
         AND NOT EXISTS (SELECT 1 FROM game_event_creature gec WHERE gec.guid = c.guid) \
         LIMIT ?";
    let rows = debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, CreatureSpawnRow>(SQL)
        .bind(map)
        .bind(min_x)
        .bind(max_x)
        .bind(min_y)
        .bind(max_y)
        .bind(phase_mask)
        .bind(phase_mask)
        .bind(limit)
        .fetch_all(pool)
        .await,
        map, min_x, max_x, min_y, max_y, phase_mask, phase_mask, limit
    ).map_err(|e| format!("Query failed: {}", e))?;

    Ok(rows.into_iter().map(CreatureSpawnMarker::from).collect())
}

impl From<CreatureSpawnRow> for CreatureSpawnMarker {
    fn from(r: CreatureSpawnRow) -> Self {
        CreatureSpawnMarker {
            guid: r.guid,
            id1: r.id1,
            position_x: r.position_x,
            position_y: r.position_y,
            position_z: r.position_z,
            orientation: r.orientation,
            display_id: r.display_id.unwrap_or(0),
            name: r.name.unwrap_or_default(),
            scale: r.scale.unwrap_or(1.0),
        }
    }
}

/// Creature spawns on one map, searchable by template name, entry or guid.
/// Backs the map editor's zone tables panel. Zone scoping is spatial (the
/// zone's WorldMapArea world rectangle): the DB's `creature.zoneId` column is
/// 0 on stock rows — the server computes it at runtime — so it can't be
/// trusted for filtering. All-NULL bounds mean map-wide.
#[tauri::command]
pub async fn get_creature_spawns_by_map(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    map: u16,
    search: Option<String>,
    limit: i64,
    min_x: Option<f32>,
    max_x: Option<f32>,
    min_y: Option<f32>,
    max_y: Option<f32>,
) -> Result<Vec<CreatureSpawnMarker>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    // The bounds filter binds min_x twice: NULL disables it (map-wide list).
    let rows = match &search {
        Some(q) if !q.is_empty() => {
            let pattern = format!("%{}%", q);
            const SQL: &str = "SELECT c.guid, c.id1, c.position_x, c.position_y, c.position_z, c.orientation, \
                 ct.name, ctm.CreatureDisplayID AS display_id, ctm.DisplayScale AS scale \
                 FROM creature c \
                 LEFT JOIN creature_template ct ON ct.entry = c.id1 \
                 LEFT JOIN creature_template_model ctm ON ctm.CreatureID = c.id1 \
                     AND ctm.Idx = (SELECT MIN(Idx) FROM creature_template_model WHERE CreatureID = c.id1) \
                 WHERE c.map = ? \
                 AND (? IS NULL OR (c.position_x BETWEEN ? AND ? AND c.position_y BETWEEN ? AND ?)) \
                 AND (ct.name LIKE ? OR c.id1 LIKE ? OR c.guid LIKE ?) \
                 ORDER BY ct.name, c.guid LIMIT ?";
            debug_sql!(app, debug, SQL,
                sqlx::query_as::<_, CreatureSpawnRow>(SQL)
                .bind(map)
                .bind(min_x)
                .bind(min_x)
                .bind(max_x)
                .bind(min_y)
                .bind(max_y)
                .bind(&pattern)
                .bind(&pattern)
                .bind(&pattern)
                .bind(limit)
                .fetch_all(pool)
                .await,
                map, min_x, min_x, max_x, min_y, max_y, &pattern, &pattern, &pattern, limit
            ).map_err(|e| format!("Query failed: {}", e))?
        }
        _ => {
            const SQL: &str = "SELECT c.guid, c.id1, c.position_x, c.position_y, c.position_z, c.orientation, \
                 ct.name, ctm.CreatureDisplayID AS display_id, ctm.DisplayScale AS scale \
                 FROM creature c \
                 LEFT JOIN creature_template ct ON ct.entry = c.id1 \
                 LEFT JOIN creature_template_model ctm ON ctm.CreatureID = c.id1 \
                     AND ctm.Idx = (SELECT MIN(Idx) FROM creature_template_model WHERE CreatureID = c.id1) \
                 WHERE c.map = ? \
                 AND (? IS NULL OR (c.position_x BETWEEN ? AND ? AND c.position_y BETWEEN ? AND ?)) \
                 ORDER BY ct.name, c.guid LIMIT ?";
            debug_sql!(app, debug, SQL,
                sqlx::query_as::<_, CreatureSpawnRow>(SQL)
                .bind(map)
                .bind(min_x)
                .bind(min_x)
                .bind(max_x)
                .bind(min_y)
                .bind(max_y)
                .bind(limit)
                .fetch_all(pool)
                .await,
                map, min_x, min_x, max_x, min_y, max_y, limit
            ).map_err(|e| format!("Query failed: {}", e))?
        }
    };

    Ok(rows.into_iter().map(CreatureSpawnMarker::from).collect())
}

#[tauri::command]
pub async fn save_creature_spawn(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    creature: Creature,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "INSERT INTO creature (guid, id1, id2, id3, map, zoneId, areaId, spawnMask, phaseMask, equipment_id, position_x, position_y, position_z, orientation, spawntimesecs, wander_distance, currentwaypoint, curhealth, curmana, MovementType, npcflag, unit_flags, dynamicflags, ScriptName, VerifiedBuild, CreateObject, Comment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE guid = VALUES(guid), id1 = VALUES(id1), id2 = VALUES(id2), id3 = VALUES(id3), map = VALUES(map), zoneId = VALUES(zoneId), areaId = VALUES(areaId), spawnMask = VALUES(spawnMask), phaseMask = VALUES(phaseMask), equipment_id = VALUES(equipment_id), position_x = VALUES(position_x), position_y = VALUES(position_y), position_z = VALUES(position_z), orientation = VALUES(orientation), spawntimesecs = VALUES(spawntimesecs), wander_distance = VALUES(wander_distance), currentwaypoint = VALUES(currentwaypoint), curhealth = VALUES(curhealth), curmana = VALUES(curmana), MovementType = VALUES(MovementType), npcflag = VALUES(npcflag), unit_flags = VALUES(unit_flags), dynamicflags = VALUES(dynamicflags), ScriptName = VALUES(ScriptName), VerifiedBuild = VALUES(VerifiedBuild), CreateObject = VALUES(CreateObject), Comment = VALUES(Comment)";
    debug_sql!(app, debug, SQL,
        sqlx::query(SQL)
        .bind(creature.guid)
        .bind(creature.id1)
        .bind(creature.id2)
        .bind(creature.id3)
        .bind(creature.map)
        .bind(creature.zoneId)
        .bind(creature.areaId)
        .bind(creature.spawnMask)
        .bind(creature.phaseMask)
        .bind(creature.equipment_id)
        .bind(creature.position_x)
        .bind(creature.position_y)
        .bind(creature.position_z)
        .bind(creature.orientation)
        .bind(creature.spawntimesecs)
        .bind(creature.wander_distance)
        .bind(creature.currentwaypoint)
        .bind(creature.curhealth)
        .bind(creature.curmana)
        .bind(creature.MovementType)
        .bind(creature.npcflag)
        .bind(creature.unit_flags)
        .bind(creature.dynamicflags)
        .bind(&creature.ScriptName)
        .bind(creature.VerifiedBuild)
        .bind(creature.CreateObject)
        .bind(&creature.Comment)
        .execute(pool)
        .await,
        creature.guid, creature.id1, creature.id2, creature.id3, creature.map, creature.zoneId, creature.areaId,
        creature.spawnMask, creature.phaseMask, creature.equipment_id,
        creature.position_x, creature.position_y, creature.position_z, creature.orientation,
        creature.spawntimesecs, creature.wander_distance, creature.currentwaypoint,
        creature.curhealth, creature.curmana, creature.MovementType, creature.npcflag,
        creature.unit_flags, creature.dynamicflags, &creature.ScriptName,
        creature.VerifiedBuild, creature.CreateObject, &creature.Comment
    ).map_err(|e| format!("Save failed: {}", e))?;

    log::info!("Saved creature spawn guid {}", creature.guid);
    Ok(())
}

#[tauri::command]
pub async fn delete_creature_spawn(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    guid: u32,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "DELETE FROM creature WHERE guid = ?";
    let result = debug_sql!(app, debug, SQL,
        sqlx::query(SQL)
        .bind(guid)
        .execute(pool)
        .await,
        guid
    ).map_err(|e| format!("Delete failed: {}", e))?;

    if result.rows_affected() == 0 {
        return Err(format!("Creature spawn with guid {} not found", guid));
    }

    log::info!("Deleted creature spawn guid {}", guid);
    Ok(())
}

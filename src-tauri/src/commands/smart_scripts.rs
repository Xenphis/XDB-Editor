use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SmartScriptRow {
    pub entryorguid: i32,
    pub source_type: u8,
    pub id: u16,
    pub link: u16,
    pub event_type: u16,
    pub event_phase_mask: u16,
    pub event_chance: u8,
    pub event_flags: u16,
    pub event_param1: u32,
    pub event_param2: u32,
    pub event_param3: u32,
    pub event_param4: u32,
    pub action_type: u16,
    pub action_param1: u32,
    pub action_param2: u32,
    pub action_param3: u32,
    pub action_param4: u32,
    pub action_param5: u32,
    pub action_param6: u32,
    pub target_type: u16,
    pub target_param1: u32,
    pub target_param2: u32,
    pub target_param3: u32,
    pub target_x: f32,
    pub target_y: f32,
    pub target_z: f32,
    pub target_o: f32,
    pub comment: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SmartScriptOwner {
    pub entryorguid: i32,
    pub source_type: u8,
    pub name: String,
    pub row_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmartScriptOwnerInfo {
    pub exists: bool,
    pub name: String,
    /// creature_template.AIName / gameobject_template.AIName; for
    /// areatriggers this carries areatrigger_scripts.ScriptName instead.
    pub ai_name: String,
    pub script_name: String,
}

#[tauri::command]
pub async fn get_smart_scripts(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entryorguid: i32,
    source_type: u8,
) -> Result<Vec<SmartScriptRow>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "SELECT * FROM smart_scripts WHERE entryorguid = ? AND source_type = ? ORDER BY id, link";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, SmartScriptRow>(SQL)
            .bind(entryorguid)
            .bind(source_type)
            .fetch_all(pool)
            .await,
        entryorguid, source_type
    ).map_err(|e| format!("Query failed: {}", e))
}

/// Distinct (entryorguid, source_type) pairs having smart_scripts rows, with
/// resolved names for creatures/gameobjects (per-entry and per-guid scripts).
#[tauri::command]
pub async fn get_smart_script_owners(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    search: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<SmartScriptOwner>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    let limit = limit.unwrap_or(500);

    const BASE: &str = "SELECT ss.entryorguid, ss.source_type, \
         COALESCE(MAX(ct.name), MAX(gt.name), MAX(ctg.name), MAX(gtg.name), '') AS name, \
         COUNT(*) AS row_count \
         FROM smart_scripts ss \
         LEFT JOIN creature_template ct ON ss.source_type = 0 AND ss.entryorguid > 0 AND ct.entry = ss.entryorguid \
         LEFT JOIN creature c ON ss.source_type = 0 AND ss.entryorguid < 0 AND c.guid = -ss.entryorguid \
         LEFT JOIN creature_template ctg ON ctg.entry = c.id \
         LEFT JOIN gameobject_template gt ON ss.source_type = 1 AND ss.entryorguid > 0 AND gt.entry = ss.entryorguid \
         LEFT JOIN gameobject g ON ss.source_type = 1 AND ss.entryorguid < 0 AND g.guid = -ss.entryorguid \
         LEFT JOIN gameobject_template gtg ON gtg.entry = g.id \
         WHERE ss.source_type IN (0, 1, 2) \
         GROUP BY ss.entryorguid, ss.source_type";

    if let Some(search) = search.filter(|s| !s.trim().is_empty()) {
        let sql = format!(
            "{} HAVING name LIKE CONCAT('%', ?, '%') OR CAST(ss.entryorguid AS CHAR) LIKE CONCAT('%', ?, '%') ORDER BY name, ss.entryorguid LIMIT ?",
            BASE
        );
        let search = search.trim().to_string();
        debug_sql!(app, debug, &sql,
            sqlx::query_as::<_, SmartScriptOwner>(&sql)
                .bind(&search)
                .bind(&search)
                .bind(limit)
                .fetch_all(pool)
                .await,
            search, limit
        ).map_err(|e| format!("Query failed: {}", e))
    } else {
        let sql = format!("{} ORDER BY name, ss.entryorguid LIMIT ?", BASE);
        debug_sql!(app, debug, &sql,
            sqlx::query_as::<_, SmartScriptOwner>(&sql)
                .bind(limit)
                .fetch_all(pool)
                .await,
            limit
        ).map_err(|e| format!("Query failed: {}", e))
    }
}

#[derive(Debug, FromRow)]
struct OwnerInfoRow {
    name: String,
    ai_name: String,
    script_name: String,
}

/// Name + AIName/ScriptName of a script owner, used by the editor to warn
/// when the SmartAI hook is missing and to build the fix statement.
#[tauri::command]
pub async fn get_smart_script_owner_info(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entryorguid: i32,
    source_type: u8,
) -> Result<SmartScriptOwnerInfo, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    let query = match (source_type, entryorguid >= 0) {
        (0, true) => Some((
            "SELECT name, AIName AS ai_name, ScriptName AS script_name FROM creature_template WHERE entry = ?",
            entryorguid,
        )),
        (0, false) => Some((
            "SELECT ct.name, ct.AIName AS ai_name, ct.ScriptName AS script_name \
             FROM creature c JOIN creature_template ct ON ct.entry = c.id WHERE c.guid = ?",
            -entryorguid,
        )),
        (1, true) => Some((
            "SELECT name, AIName AS ai_name, ScriptName AS script_name FROM gameobject_template WHERE entry = ?",
            entryorguid,
        )),
        (1, false) => Some((
            "SELECT gt.name, gt.AIName AS ai_name, gt.ScriptName AS script_name \
             FROM gameobject g JOIN gameobject_template gt ON gt.entry = g.id WHERE g.guid = ?",
            -entryorguid,
        )),
        (2, _) => Some((
            "SELECT CONCAT('Areatrigger ', entry) AS name, ScriptName AS ai_name, '' AS script_name \
             FROM areatrigger_scripts WHERE entry = ?",
            entryorguid,
        )),
        _ => None,
    };

    let Some((sql, id)) = query else {
        return Ok(SmartScriptOwnerInfo {
            exists: true,
            name: String::new(),
            ai_name: String::new(),
            script_name: String::new(),
        });
    };

    let row = debug_sql!(app, debug, sql,
        sqlx::query_as::<_, OwnerInfoRow>(sql)
            .bind(id)
            .fetch_optional(pool)
            .await,
        id
    ).map_err(|e| format!("Query failed: {}", e))?;

    Ok(match row {
        Some(row) => SmartScriptOwnerInfo {
            exists: true,
            name: row.name,
            ai_name: row.ai_name,
            script_name: row.script_name,
        },
        // Areatriggers without an areatrigger_scripts row still exist — the
        // missing row is exactly what the AIName-style fix will create.
        None if source_type == 2 => SmartScriptOwnerInfo {
            exists: true,
            name: format!("Areatrigger {}", entryorguid),
            ai_name: String::new(),
            script_name: String::new(),
        },
        None => SmartScriptOwnerInfo {
            exists: false,
            name: String::new(),
            ai_name: String::new(),
            script_name: String::new(),
        },
    })
}

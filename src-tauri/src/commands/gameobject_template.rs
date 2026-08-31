#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct GameObjectTemplate {
    pub entry: u32,
    #[sqlx(rename = "type")]
    pub r#type: u8,
    pub displayId: u32,
    pub name: String,
    #[sqlx(rename = "IconName")]
    pub IconName: String,
    pub castBarCaption: String,
    pub unk1: String,
    pub size: f32,
    #[sqlx(rename = "Data0")]
    pub Data0: i32,
    #[sqlx(rename = "Data1")]
    pub Data1: i32,
    #[sqlx(rename = "Data2")]
    pub Data2: i32,
    #[sqlx(rename = "Data3")]
    pub Data3: i32,
    #[sqlx(rename = "Data4")]
    pub Data4: i32,
    #[sqlx(rename = "Data5")]
    pub Data5: i32,
    #[sqlx(rename = "Data6")]
    pub Data6: i32,
    #[sqlx(rename = "Data7")]
    pub Data7: i32,
    #[sqlx(rename = "Data8")]
    pub Data8: i32,
    #[sqlx(rename = "Data9")]
    pub Data9: i32,
    #[sqlx(rename = "Data10")]
    pub Data10: i32,
    #[sqlx(rename = "Data11")]
    pub Data11: i32,
    #[sqlx(rename = "Data12")]
    pub Data12: i32,
    #[sqlx(rename = "Data13")]
    pub Data13: i32,
    #[sqlx(rename = "Data14")]
    pub Data14: i32,
    #[sqlx(rename = "Data15")]
    pub Data15: i32,
    #[sqlx(rename = "Data16")]
    pub Data16: i32,
    #[sqlx(rename = "Data17")]
    pub Data17: i32,
    #[sqlx(rename = "Data18")]
    pub Data18: i32,
    #[sqlx(rename = "Data19")]
    pub Data19: i32,
    #[sqlx(rename = "Data20")]
    pub Data20: i32,
    #[sqlx(rename = "Data21")]
    pub Data21: i32,
    #[sqlx(rename = "Data22")]
    pub Data22: i32,
    #[sqlx(rename = "Data23")]
    pub Data23: i32,
    #[sqlx(rename = "AIName")]
    pub AIName: String,
    #[sqlx(rename = "ScriptName")]
    pub ScriptName: String,
    #[sqlx(rename = "StringId")]
    pub StringId: Option<String>,
    #[sqlx(rename = "VerifiedBuild")]
    pub VerifiedBuild: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct GameObjectListResult {
    pub data: Vec<GameObjectTemplate>,
    pub total: i64,
}

#[tauri::command]
pub async fn get_gameobjects(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    search: Option<String>,
    gameobject_type: Option<u8>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<GameObjectListResult, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    let limit = limit.unwrap_or(50);
    let offset = offset.unwrap_or(0);
    let pattern = search.as_ref().filter(|q| !q.is_empty()).map(|q| format!("%{}%", q));

    let (data, total) = match (&pattern, gameobject_type) {
        (Some(pattern), Some(t)) => {
            const SQL_DATA: &str = "SELECT * FROM gameobject_template WHERE (name LIKE ? OR entry LIKE ?) AND type = ? ORDER BY entry LIMIT ? OFFSET ?";
            let rows: Vec<GameObjectTemplate> = debug_sql!(app, debug, SQL_DATA,
                sqlx::query_as(SQL_DATA)
                .bind(pattern)
                .bind(pattern)
                .bind(t)
                .bind(limit)
                .bind(offset)
                .fetch_all(pool)
                .await,
                pattern, pattern, t, limit, offset
            ).map_err(|e| format!("Query failed: {}", e))?;

            const SQL_COUNT: &str = "SELECT COUNT(*) FROM gameobject_template WHERE (name LIKE ? OR entry LIKE ?) AND type = ?";
            let count: (i64,) = debug_sql!(app, debug, SQL_COUNT,
                sqlx::query_as(SQL_COUNT)
                .bind(pattern)
                .bind(pattern)
                .bind(t)
                .fetch_one(pool)
                .await,
                pattern, pattern, t
            ).map_err(|e| format!("Count query failed: {}", e))?;

            (rows, count.0)
        }
        (Some(pattern), None) => {
            const SQL_DATA: &str = "SELECT * FROM gameobject_template WHERE name LIKE ? OR entry LIKE ? ORDER BY entry LIMIT ? OFFSET ?";
            let rows: Vec<GameObjectTemplate> = debug_sql!(app, debug, SQL_DATA,
                sqlx::query_as(SQL_DATA)
                .bind(pattern)
                .bind(pattern)
                .bind(limit)
                .bind(offset)
                .fetch_all(pool)
                .await,
                pattern, pattern, limit, offset
            ).map_err(|e| format!("Query failed: {}", e))?;

            const SQL_COUNT: &str = "SELECT COUNT(*) FROM gameobject_template WHERE name LIKE ? OR entry LIKE ?";
            let count: (i64,) = debug_sql!(app, debug, SQL_COUNT,
                sqlx::query_as(SQL_COUNT)
                .bind(pattern)
                .bind(pattern)
                .fetch_one(pool)
                .await,
                pattern, pattern
            ).map_err(|e| format!("Count query failed: {}", e))?;

            (rows, count.0)
        }
        (None, Some(t)) => {
            const SQL_DATA: &str = "SELECT * FROM gameobject_template WHERE type = ? ORDER BY entry LIMIT ? OFFSET ?";
            let rows: Vec<GameObjectTemplate> = debug_sql!(app, debug, SQL_DATA,
                sqlx::query_as(SQL_DATA)
                .bind(t)
                .bind(limit)
                .bind(offset)
                .fetch_all(pool)
                .await,
                t, limit, offset
            ).map_err(|e| format!("Query failed: {}", e))?;

            const SQL_COUNT: &str = "SELECT COUNT(*) FROM gameobject_template WHERE type = ?";
            let count: (i64,) = debug_sql!(app, debug, SQL_COUNT,
                sqlx::query_as(SQL_COUNT)
                .bind(t)
                .fetch_one(pool)
                .await,
                t
            ).map_err(|e| format!("Count query failed: {}", e))?;

            (rows, count.0)
        }
        (None, None) => {
            const SQL_DATA: &str = "SELECT * FROM gameobject_template ORDER BY entry LIMIT ? OFFSET ?";
            let rows: Vec<GameObjectTemplate> = debug_sql!(app, debug, SQL_DATA,
                sqlx::query_as(SQL_DATA)
                .bind(limit)
                .bind(offset)
                .fetch_all(pool)
                .await,
                limit, offset
            ).map_err(|e| format!("Query failed: {}", e))?;

            const SQL_COUNT: &str = "SELECT COUNT(*) FROM gameobject_template";
            let count: (i64,) = debug_sql!(app, debug, SQL_COUNT,
                sqlx::query_as(SQL_COUNT)
                .fetch_one(pool)
                .await
            ).map_err(|e| format!("Count query failed: {}", e))?;

            (rows, count.0)
        }
    };

    Ok(GameObjectListResult { data, total })
}

#[tauri::command]
pub async fn get_gameobject(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
) -> Result<GameObjectTemplate, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "SELECT * FROM gameobject_template WHERE entry = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, GameObjectTemplate>(SQL)
        .bind(entry)
        .fetch_optional(pool)
        .await,
        entry
    ).map_err(|e| format!("Query failed: {}", e))?
    .ok_or_else(|| format!("GameObject with entry {} not found", entry))
}

#[tauri::command]
pub async fn save_gameobject(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    data: GameObjectTemplate,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "INSERT INTO gameobject_template (
            entry, `type`, displayId, name, IconName, castBarCaption, unk1, size,
            Data0, Data1, Data2, Data3, Data4, Data5, Data6, Data7,
            Data8, Data9, Data10, Data11, Data12, Data13, Data14, Data15,
            Data16, Data17, Data18, Data19, Data20, Data21, Data22, Data23,
            AIName, ScriptName, StringId, VerifiedBuild
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?
        ) ON DUPLICATE KEY UPDATE entry = VALUES(entry), `type` = VALUES(`type`), displayId = VALUES(displayId), name = VALUES(name), IconName = VALUES(IconName), castBarCaption = VALUES(castBarCaption), unk1 = VALUES(unk1), size = VALUES(size), Data0 = VALUES(Data0), Data1 = VALUES(Data1), Data2 = VALUES(Data2), Data3 = VALUES(Data3), Data4 = VALUES(Data4), Data5 = VALUES(Data5), Data6 = VALUES(Data6), Data7 = VALUES(Data7), Data8 = VALUES(Data8), Data9 = VALUES(Data9), Data10 = VALUES(Data10), Data11 = VALUES(Data11), Data12 = VALUES(Data12), Data13 = VALUES(Data13), Data14 = VALUES(Data14), Data15 = VALUES(Data15), Data16 = VALUES(Data16), Data17 = VALUES(Data17), Data18 = VALUES(Data18), Data19 = VALUES(Data19), Data20 = VALUES(Data20), Data21 = VALUES(Data21), Data22 = VALUES(Data22), Data23 = VALUES(Data23), AIName = VALUES(AIName), ScriptName = VALUES(ScriptName), StringId = VALUES(StringId), VerifiedBuild = VALUES(VerifiedBuild)";
    debug_sql!(app, debug, SQL,
        sqlx::query(SQL)
        .bind(data.entry)
        .bind(data.r#type)
        .bind(data.displayId)
        .bind(&data.name)
        .bind(&data.IconName)
        .bind(&data.castBarCaption)
        .bind(&data.unk1)
        .bind(data.size)
        .bind(data.Data0).bind(data.Data1).bind(data.Data2).bind(data.Data3)
        .bind(data.Data4).bind(data.Data5).bind(data.Data6).bind(data.Data7)
        .bind(data.Data8).bind(data.Data9).bind(data.Data10).bind(data.Data11)
        .bind(data.Data12).bind(data.Data13).bind(data.Data14).bind(data.Data15)
        .bind(data.Data16).bind(data.Data17).bind(data.Data18).bind(data.Data19)
        .bind(data.Data20).bind(data.Data21).bind(data.Data22).bind(data.Data23)
        .bind(&data.AIName)
        .bind(&data.ScriptName)
        .bind(&data.StringId)
        .bind(data.VerifiedBuild)
        .execute(pool)
        .await,
        data.entry, data.r#type, data.displayId, &data.name, &data.IconName, &data.castBarCaption, &data.unk1, data.size,
        data.Data0, data.Data1, data.Data2, data.Data3, data.Data4, data.Data5, data.Data6, data.Data7,
        data.Data8, data.Data9, data.Data10, data.Data11, data.Data12, data.Data13, data.Data14, data.Data15,
        data.Data16, data.Data17, data.Data18, data.Data19, data.Data20, data.Data21, data.Data22, data.Data23,
        &data.AIName, &data.ScriptName, &data.StringId, data.VerifiedBuild
    ).map_err(|e| format!("Save failed: {}", e))?;

    log::info!("Saved GameObject entry {}", data.entry);
    Ok(())
}

#[tauri::command]
pub async fn delete_gameobject(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "DELETE FROM gameobject_template WHERE entry = ?";
    let result = debug_sql!(app, debug, SQL,
        sqlx::query(SQL)
        .bind(entry)
        .execute(pool)
        .await,
        entry
    ).map_err(|e| format!("Delete failed: {}", e))?;

    if result.rows_affected() == 0 {
        return Err(format!("GameObject with entry {} not found", entry));
    }

    log::info!("Deleted GameObject entry {}", entry);
    Ok(())
}

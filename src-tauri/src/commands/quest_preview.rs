#![allow(non_snake_case)]

use serde::Serialize;
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

/// A quest's item as the in-game quest frame shows it: name, quality colour,
/// and the display id the frontend turns into an icon (ItemDisplayInfo.dbc).
#[derive(Debug, Clone, Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct QuestPreviewItem {
    pub entry: u32,
    pub name: String,
    #[sqlx(rename = "Quality")]
    pub quality: u8,
    #[sqlx(rename = "displayid")]
    pub display_id: u32,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct QuestPreviewName {
    pub entry: u32,
    pub name: String,
}

/// Everything a quest references by id that the in-game preview needs by name.
#[derive(Debug, Clone, Serialize)]
pub struct QuestPreviewRefs {
    pub items: Vec<QuestPreviewItem>,
    pub creatures: Vec<QuestPreviewName>,
    pub gameobjects: Vec<QuestPreviewName>,
}

/// Resolves the item / creature / gameobject ids a quest references (rewards,
/// required items, kill objectives) to their names in one round-trip, for the
/// read-only in-game preview. Unknown ids are simply absent from the result.
#[tauri::command]
pub async fn get_quest_preview_refs(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    items: Vec<u32>,
    creatures: Vec<u32>,
    gameobjects: Vec<u32>,
) -> Result<QuestPreviewRefs, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    let placeholders = |ids: &[u32]| ids.iter().map(|_| "?").collect::<Vec<_>>().join(", ");

    let items = if items.is_empty() {
        Vec::new()
    } else {
        let sql = format!(
            "SELECT entry, name, Quality, displayid FROM item_template WHERE entry IN ({})",
            placeholders(&items)
        );
        let mut query = sqlx::query_as::<_, QuestPreviewItem>(&sql);
        for id in &items {
            query = query.bind(id);
        }
        debug_sql!(app, debug, &sql, query.fetch_all(pool).await, &items)
            .map_err(|e| format!("Query failed: {}", e))?
    };

    let creatures = if creatures.is_empty() {
        Vec::new()
    } else {
        let sql = format!(
            "SELECT entry, name FROM creature_template WHERE entry IN ({})",
            placeholders(&creatures)
        );
        let mut query = sqlx::query_as::<_, QuestPreviewName>(&sql);
        for id in &creatures {
            query = query.bind(id);
        }
        debug_sql!(app, debug, &sql, query.fetch_all(pool).await, &creatures)
            .map_err(|e| format!("Query failed: {}", e))?
    };

    let gameobjects = if gameobjects.is_empty() {
        Vec::new()
    } else {
        let sql = format!(
            "SELECT entry, name FROM gameobject_template WHERE entry IN ({})",
            placeholders(&gameobjects)
        );
        let mut query = sqlx::query_as::<_, QuestPreviewName>(&sql);
        for id in &gameobjects {
            query = query.bind(id);
        }
        debug_sql!(app, debug, &sql, query.fetch_all(pool).await, &gameobjects)
            .map_err(|e| format!("Query failed: {}", e))?
    };

    Ok(QuestPreviewRefs { items, creatures, gameobjects })
}

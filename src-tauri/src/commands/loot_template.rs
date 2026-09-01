#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

/// The profession loot tables, which share one schema — PK `(Entry, Item)` plus
/// Reference/Chance/QuestRequired/LootMode/GroupId/MinCount/MaxCount/Comment —
/// and therefore one set of commands, picked by the `table` parameter.
///
/// `creature_loot_template` and `gameobject_loot_template` have the same shape
/// but are deliberately out of scope: the gameobject one is already edited from
/// the GameObject editor's Loot tab, and letting a second screen write it would
/// be two sources of truth for one table.
///
/// What `Entry` points at differs per table, which is what the list query joins
/// on (all verified against a stock 3.3.5 world DB):
///
/// | table         | `Entry` references                     |
/// |---------------|----------------------------------------|
/// | fishing       | an AreaTable id (no name in the world DB) |
/// | milling       | `item_template.entry` (the herb)       |
/// | prospecting   | `item_template.entry` (the ore)        |
/// | disenchant    | `item_template.DisenchantID`           |
/// | skinning      | `creature_template.skinloot`           |
/// | pickpocketing | `creature_template.pickpocketloot`     |

/// One loot row, plus the looted item's identity for display only —
/// `itemName`/`itemQuality` are never written back. Both are optional: a loot
/// table may reference an item that no longer exists, and a row that only
/// carries a `Reference` has no item at all.
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct LootTemplateRow {
    pub Entry: u32,
    pub Item: u32,
    pub Reference: i32,
    pub Chance: f32,
    pub QuestRequired: bool,
    pub LootMode: u16,
    pub GroupId: u8,
    pub MinCount: u8,
    pub MaxCount: u8,
    pub Comment: Option<String>,
    pub itemName: Option<String>,
    pub itemQuality: Option<u8>,
}

/// One row of the loot list: an `Entry` with how many rows it holds and, when
/// the table's `Entry` can be joined to something nameable, a label for it.
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct LootTemplateGroup {
    pub entry: u32,
    pub rowCount: i64,
    pub label: Option<String>,
}

/// Maps the frontend's loot-type slug to its real table name.
///
/// This is the only place a table name enters the SQL, and it comes from this
/// fixed list rather than from the caller: the table can't be a bound
/// parameter, so an unchecked slug would be a straight injection.
fn table_name(loot_type: &str) -> Result<&'static str, String> {
    match loot_type {
        "fishing" => Ok("fishing_loot_template"),
        "milling" => Ok("milling_loot_template"),
        "pickpocketing" => Ok("pickpocketing_loot_template"),
        "disenchant" => Ok("disenchant_loot_template"),
        "skinning" => Ok("skinning_loot_template"),
        "prospecting" => Ok("prospecting_loot_template"),
        other => Err(format!("unknown loot type: {other}")),
    }
}

/// The list query for one loot type: `Entry` + row count, plus the label its
/// `Entry` can be resolved to. Each is a full literal rather than a built
/// string, so what runs is exactly what is written here.
fn groups_sql(loot_type: &str) -> Result<&'static str, String> {
    match loot_type {
        // An AreaTable id: the zone names live in the client DBCs, not the DB.
        "fishing" => Ok(
            "SELECT l.Entry AS entry, COUNT(*) AS rowCount, NULL AS label \
             FROM fishing_loot_template l GROUP BY l.Entry ORDER BY l.Entry",
        ),
        "milling" => Ok(
            "SELECT l.Entry AS entry, COUNT(*) AS rowCount, it.name AS label \
             FROM milling_loot_template l \
             LEFT JOIN item_template it ON it.entry = l.Entry \
             GROUP BY l.Entry, it.name ORDER BY l.Entry",
        ),
        "prospecting" => Ok(
            "SELECT l.Entry AS entry, COUNT(*) AS rowCount, it.name AS label \
             FROM prospecting_loot_template l \
             LEFT JOIN item_template it ON it.entry = l.Entry \
             GROUP BY l.Entry, it.name ORDER BY l.Entry",
        ),
        // The next three are reverse lookups: several rows of item_template /
        // creature_template can point at one loot id, so the label is any one
        // of them (MIN). They resolve it through a derived table rather than a
        // correlated subquery — none of `DisenchantID`, `skinloot` or
        // `pickpocketloot` is indexed, so a correlated form re-scans the whole
        // parent table once per entry: 15.5s for pickpocketing's 2597 entries,
        // against 0.06s for the single grouped pass below.
        "disenchant" => Ok(
            "SELECT l.Entry AS entry, COUNT(*) AS rowCount, n.label \
             FROM disenchant_loot_template l \
             LEFT JOIN (SELECT DisenchantID AS lootId, MIN(name) AS label FROM item_template \
                        WHERE DisenchantID > 0 GROUP BY DisenchantID) n ON n.lootId = l.Entry \
             GROUP BY l.Entry, n.label ORDER BY l.Entry",
        ),
        "skinning" => Ok(
            "SELECT l.Entry AS entry, COUNT(*) AS rowCount, n.label \
             FROM skinning_loot_template l \
             LEFT JOIN (SELECT skinloot AS lootId, MIN(name) AS label FROM creature_template \
                        WHERE skinloot > 0 GROUP BY skinloot) n ON n.lootId = l.Entry \
             GROUP BY l.Entry, n.label ORDER BY l.Entry",
        ),
        "pickpocketing" => Ok(
            "SELECT l.Entry AS entry, COUNT(*) AS rowCount, n.label \
             FROM pickpocketing_loot_template l \
             LEFT JOIN (SELECT pickpocketloot AS lootId, MIN(name) AS label FROM creature_template \
                        WHERE pickpocketloot > 0 GROUP BY pickpocketloot) n ON n.lootId = l.Entry \
             GROUP BY l.Entry, n.label ORDER BY l.Entry",
        ),
        other => Err(format!("unknown loot type: {other}")),
    }
}

/// Every `Entry` of one loot table, with its row count and a display label.
#[tauri::command]
pub async fn get_loot_groups(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    lootType: String,
) -> Result<Vec<LootTemplateGroup>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    let sql = groups_sql(&lootType)?;
    debug_sql!(app, debug, sql,
        sqlx::query_as::<_, LootTemplateGroup>(sql)
            .fetch_all(pool)
            .await,
        lootType
    ).map_err(|e| format!("Query failed: {}", e))
}

/// The rows of one loot `Entry`, ordered as the core groups them: by drop
/// group first, then by item, so a group's members stay together.
#[tauri::command]
pub async fn get_loot_rows(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    lootType: String,
    entry: u32,
) -> Result<Vec<LootTemplateRow>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    // Built from a name this module owns (see `table_name`), never from the
    // caller's string.
    let sql = format!(
        "SELECT l.Entry, l.Item, l.Reference, l.Chance, l.QuestRequired, l.LootMode, \
                l.GroupId, l.MinCount, l.MaxCount, l.Comment, \
                it.name AS itemName, it.Quality AS itemQuality \
         FROM {} l \
         LEFT JOIN item_template it ON it.entry = l.Item \
         WHERE l.Entry = ? \
         ORDER BY l.GroupId, l.Item",
        table_name(&lootType)?
    );
    debug_sql!(app, debug, sql.as_str(),
        sqlx::query_as::<_, LootTemplateRow>(&sql)
            .bind(entry)
            .fetch_all(pool)
            .await,
        lootType, entry
    ).map_err(|e| format!("Query failed: {}", e))
}

/// Drops every row of one loot `Entry`. Whatever points at that entry — an
/// item's DisenchantID, a creature's skinloot — is left untouched: the loot
/// table is the only thing this owns.
#[tauri::command]
pub async fn delete_loot_entry(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    lootType: String,
    entry: u32,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    let sql = format!("DELETE FROM {} WHERE Entry = ?", table_name(&lootType)?);
    debug_sql!(app, debug, sql.as_str(),
        sqlx::query(&sql)
            .bind(entry)
            .execute(pool)
            .await,
        lootType, entry
    ).map_err(|e| format!("Delete failed: {}", e))?;

    log::info!("Deleted {} loot entry {}", lootType, entry);
    Ok(())
}

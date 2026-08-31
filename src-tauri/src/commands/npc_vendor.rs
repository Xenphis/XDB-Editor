#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

/// One `npc_vendor` row enriched with the sold item's identity, so the stock
/// table can label an item id without a second round-trip. The joined columns
/// are optional: a vendor may reference an item that no longer exists.
///
/// `VerifiedBuild` is deliberately absent — it is sniffer metadata the editor
/// has no use for, and leaving it out of both the SELECT and the generated
/// INSERT keeps the module working on cores that lack the column.
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct NpcVendorItem {
    pub entry: u32,
    pub slot: i32,
    pub item: i32,
    pub maxcount: u32,
    pub incrtime: u32,
    pub ExtendedCost: u32,
    pub itemName: Option<String>,
    pub itemQuality: Option<u8>,
}

/// One row of the vendor list: the creature plus how many items it sells.
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct NpcVendorGroup {
    pub entry: u32,
    pub itemCount: i64,
    pub name: Option<String>,
    pub npcflag: Option<u32>,
}

/// A candidate creature for the "new vendor" picker.
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct VendorCreatureOption {
    pub entry: u32,
    pub name: Option<String>,
    pub npcflag: u32,
    /// Rows this creature already has in `npc_vendor`. Non-zero means picking
    /// it opens the existing vendor instead of creating one.
    pub itemCount: i64,
}

/// A candidate item for the "add item" picker.
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct VendorItemOption {
    pub entry: u32,
    pub name: String,
    pub Quality: u8,
    pub ItemLevel: u16,
    pub BuyPrice: i64,
}

#[tauri::command]
pub async fn get_npc_vendors(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
) -> Result<Vec<NpcVendorGroup>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "SELECT nv.entry, COUNT(*) AS itemCount, ct.name, ct.npcflag \
         FROM npc_vendor nv \
         LEFT JOIN creature_template ct ON ct.entry = nv.entry \
         GROUP BY nv.entry, ct.name, ct.npcflag \
         ORDER BY nv.entry";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, NpcVendorGroup>(SQL)
        .fetch_all(pool)
        .await
    ).map_err(|e| format!("Query failed: {}", e))
}

#[tauri::command]
pub async fn get_npc_vendor(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
) -> Result<Vec<NpcVendorItem>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    // Ordered like the in-game vendor window: by slot, then by item id for the
    // rows that share the default slot 0.
    const SQL: &str = "SELECT nv.entry, nv.slot, nv.item, nv.maxcount, nv.incrtime, nv.ExtendedCost, \
         it.name AS itemName, it.Quality AS itemQuality \
         FROM npc_vendor nv \
         LEFT JOIN item_template it ON it.entry = nv.item \
         WHERE nv.entry = ? \
         ORDER BY nv.slot, nv.item";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, NpcVendorItem>(SQL)
        .bind(entry)
        .fetch_all(pool)
        .await,
        entry
    ).map_err(|e| format!("Query failed: {}", e))
}

/// Creature lookup for the "new vendor" picker. `query` matches a template
/// entry or a creature name.
#[tauri::command]
pub async fn search_vendor_creatures(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    query: String,
    limit: Option<i64>,
) -> Result<Vec<VendorCreatureOption>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    let limit = limit.unwrap_or(50);
    let numeric = query.trim().parse::<u32>().ok();
    let like = format!("%{}%", query.trim());

    const SQL: &str = "SELECT ct.entry, ct.name, ct.npcflag, \
         (SELECT COUNT(*) FROM npc_vendor nv WHERE nv.entry = ct.entry) AS itemCount \
         FROM creature_template ct \
         WHERE ct.entry = ? OR ct.name LIKE ? \
         ORDER BY ct.entry \
         LIMIT ?";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, VendorCreatureOption>(SQL)
        .bind(numeric)
        .bind(&like)
        .bind(limit)
        .fetch_all(pool)
        .await,
        numeric, like, limit
    ).map_err(|e| format!("Query failed: {}", e))
}

/// Item lookup for the "add item" picker. Kept separate from the item module's
/// `get_items` on purpose: the picker only needs five columns, not the whole
/// `item_template` row.
#[tauri::command]
pub async fn search_vendor_items(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    query: String,
    limit: Option<i64>,
) -> Result<Vec<VendorItemOption>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    let limit = limit.unwrap_or(50);
    let numeric = query.trim().parse::<u32>().ok();
    let like = format!("%{}%", query.trim());

    const SQL: &str = "SELECT entry, name, Quality, ItemLevel, BuyPrice \
         FROM item_template \
         WHERE entry = ? OR name LIKE ? \
         ORDER BY entry \
         LIMIT ?";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, VendorItemOption>(SQL)
        .bind(numeric)
        .bind(&like)
        .bind(limit)
        .fetch_all(pool)
        .await,
        numeric, like, limit
    ).map_err(|e| format!("Query failed: {}", e))
}

/// Drops a vendor's whole stock — the creature itself is left untouched.
#[tauri::command]
pub async fn delete_npc_vendor(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "DELETE FROM npc_vendor WHERE entry = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query(SQL)
            .bind(entry)
            .execute(pool)
            .await,
        entry
    ).map_err(|e| format!("Delete failed: {}", e))?;

    log::info!("Deleted vendor stock {}", entry);
    Ok(())
}

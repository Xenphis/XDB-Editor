#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[allow(non_snake_case)]
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct QuestTemplate {
    #[sqlx(rename = "ID")] pub ID: u32,
    #[sqlx(rename = "QuestType")] pub QuestType: u8,
    #[sqlx(rename = "QuestLevel")] pub QuestLevel: i32,
    #[sqlx(rename = "MinLevel")] pub MinLevel: u8,
    #[sqlx(rename = "QuestSortID")] pub QuestSortID: i32,
    #[sqlx(rename = "QuestInfoID")] pub QuestInfoID: u16,
    #[sqlx(rename = "SuggestedGroupNum")] pub SuggestedGroupNum: u8,
    #[sqlx(rename = "RequiredFactionId1")] pub RequiredFactionId1: u16,
    #[sqlx(rename = "RequiredFactionId2")] pub RequiredFactionId2: u16,
    #[sqlx(rename = "RequiredFactionValue1")] pub RequiredFactionValue1: i32,
    #[sqlx(rename = "RequiredFactionValue2")] pub RequiredFactionValue2: i32,
    #[sqlx(rename = "RewardNextQuest")] pub RewardNextQuest: u32,
    #[sqlx(rename = "RewardXPDifficulty")] pub RewardXPDifficulty: u8,
    #[sqlx(rename = "RewardMoney")] pub RewardMoney: i32,
    #[sqlx(rename = "RewardBonusMoney")] pub RewardBonusMoney: u32,
    #[sqlx(rename = "RewardDisplaySpell")] pub RewardDisplaySpell: u32,
    #[sqlx(rename = "RewardSpell")] pub RewardSpell: i32,
    #[sqlx(rename = "RewardHonor")] pub RewardHonor: i32,
    #[sqlx(rename = "RewardKillHonor")] pub RewardKillHonor: f32,
    #[sqlx(rename = "StartItem")] pub StartItem: u32,
    #[sqlx(rename = "Flags")] pub Flags: u32,
    #[sqlx(rename = "RequiredPlayerKills")] pub RequiredPlayerKills: u8,
    #[sqlx(rename = "RewardItem1")] pub RewardItem1: u32,
    #[sqlx(rename = "RewardAmount1")] pub RewardAmount1: u32,
    #[sqlx(rename = "RewardItem2")] pub RewardItem2: u32,
    #[sqlx(rename = "RewardAmount2")] pub RewardAmount2: u32,
    #[sqlx(rename = "RewardItem3")] pub RewardItem3: u32,
    #[sqlx(rename = "RewardAmount3")] pub RewardAmount3: u32,
    #[sqlx(rename = "RewardItem4")] pub RewardItem4: u32,
    #[sqlx(rename = "RewardAmount4")] pub RewardAmount4: u32,
    #[sqlx(rename = "ItemDrop1")] pub ItemDrop1: u32,
    #[sqlx(rename = "ItemDropQuantity1")] pub ItemDropQuantity1: u32,
    #[sqlx(rename = "ItemDrop2")] pub ItemDrop2: u32,
    #[sqlx(rename = "ItemDropQuantity2")] pub ItemDropQuantity2: u32,
    #[sqlx(rename = "ItemDrop3")] pub ItemDrop3: u32,
    #[sqlx(rename = "ItemDropQuantity3")] pub ItemDropQuantity3: u32,
    #[sqlx(rename = "ItemDrop4")] pub ItemDrop4: u32,
    #[sqlx(rename = "ItemDropQuantity4")] pub ItemDropQuantity4: u32,
    #[sqlx(rename = "RewardChoiceItemID1")] pub RewardChoiceItemID1: u32,
    #[sqlx(rename = "RewardChoiceItemQuantity1")] pub RewardChoiceItemQuantity1: u32,
    #[sqlx(rename = "RewardChoiceItemID2")] pub RewardChoiceItemID2: u32,
    #[sqlx(rename = "RewardChoiceItemQuantity2")] pub RewardChoiceItemQuantity2: u32,
    #[sqlx(rename = "RewardChoiceItemID3")] pub RewardChoiceItemID3: u32,
    #[sqlx(rename = "RewardChoiceItemQuantity3")] pub RewardChoiceItemQuantity3: u32,
    #[sqlx(rename = "RewardChoiceItemID4")] pub RewardChoiceItemID4: u32,
    #[sqlx(rename = "RewardChoiceItemQuantity4")] pub RewardChoiceItemQuantity4: u32,
    #[sqlx(rename = "RewardChoiceItemID5")] pub RewardChoiceItemID5: u32,
    #[sqlx(rename = "RewardChoiceItemQuantity5")] pub RewardChoiceItemQuantity5: u32,
    #[sqlx(rename = "RewardChoiceItemID6")] pub RewardChoiceItemID6: u32,
    #[sqlx(rename = "RewardChoiceItemQuantity6")] pub RewardChoiceItemQuantity6: u32,
    #[sqlx(rename = "POIContinent")] pub POIContinent: u16,
    #[sqlx(rename = "POIx")] pub POIx: f32,
    #[sqlx(rename = "POIy")] pub POIy: f32,
    #[sqlx(rename = "POIPriority")] pub POIPriority: u32,
    #[sqlx(rename = "RewardTitle")] pub RewardTitle: u32,
    #[sqlx(rename = "RewardTalents")] pub RewardTalents: u32,
    #[sqlx(rename = "RewardArenaPoints")] pub RewardArenaPoints: u32,
    #[sqlx(rename = "RewardFactionID1")] pub RewardFactionID1: u32,
    #[sqlx(rename = "RewardFactionValue1")] pub RewardFactionValue1: i32,
    #[sqlx(rename = "RewardFactionOverride1")] pub RewardFactionOverride1: i32,
    #[sqlx(rename = "RewardFactionID2")] pub RewardFactionID2: u32,
    #[sqlx(rename = "RewardFactionValue2")] pub RewardFactionValue2: i32,
    #[sqlx(rename = "RewardFactionOverride2")] pub RewardFactionOverride2: i32,
    #[sqlx(rename = "RewardFactionID3")] pub RewardFactionID3: u32,
    #[sqlx(rename = "RewardFactionValue3")] pub RewardFactionValue3: i32,
    #[sqlx(rename = "RewardFactionOverride3")] pub RewardFactionOverride3: i32,
    #[sqlx(rename = "RewardFactionID4")] pub RewardFactionID4: u32,
    #[sqlx(rename = "RewardFactionValue4")] pub RewardFactionValue4: i32,
    #[sqlx(rename = "RewardFactionOverride4")] pub RewardFactionOverride4: i32,
    #[sqlx(rename = "RewardFactionID5")] pub RewardFactionID5: u32,
    #[sqlx(rename = "RewardFactionValue5")] pub RewardFactionValue5: i32,
    #[sqlx(rename = "RewardFactionOverride5")] pub RewardFactionOverride5: i32,
    #[sqlx(rename = "RewardFactionFlags")] pub RewardFactionFlags: u32,
    #[sqlx(rename = "TimeAllowed")] pub TimeAllowed: u32,
    #[sqlx(rename = "AllowableRaces")] pub AllowableRaces: u32,
    #[sqlx(rename = "LogTitle")] pub LogTitle: Option<String>,
    #[sqlx(rename = "LogDescription")] pub LogDescription: Option<String>,
    #[sqlx(rename = "QuestDescription")] pub QuestDescription: Option<String>,
    #[sqlx(rename = "AreaDescription")] pub AreaDescription: Option<String>,
    #[sqlx(rename = "QuestCompletionLog")] pub QuestCompletionLog: Option<String>,
    #[sqlx(rename = "RequiredNpcOrGo1")] pub RequiredNpcOrGo1: i32,
    #[sqlx(rename = "RequiredNpcOrGo2")] pub RequiredNpcOrGo2: i32,
    #[sqlx(rename = "RequiredNpcOrGo3")] pub RequiredNpcOrGo3: i32,
    #[sqlx(rename = "RequiredNpcOrGo4")] pub RequiredNpcOrGo4: i32,
    #[sqlx(rename = "RequiredNpcOrGoCount1")] pub RequiredNpcOrGoCount1: u16,
    #[sqlx(rename = "RequiredNpcOrGoCount2")] pub RequiredNpcOrGoCount2: u16,
    #[sqlx(rename = "RequiredNpcOrGoCount3")] pub RequiredNpcOrGoCount3: u16,
    #[sqlx(rename = "RequiredNpcOrGoCount4")] pub RequiredNpcOrGoCount4: u16,
    #[sqlx(rename = "RequiredItemId1")] pub RequiredItemId1: u32,
    #[sqlx(rename = "RequiredItemId2")] pub RequiredItemId2: u32,
    #[sqlx(rename = "RequiredItemId3")] pub RequiredItemId3: u32,
    #[sqlx(rename = "RequiredItemId4")] pub RequiredItemId4: u32,
    #[sqlx(rename = "RequiredItemId5")] pub RequiredItemId5: u32,
    #[sqlx(rename = "RequiredItemId6")] pub RequiredItemId6: u32,
    #[sqlx(rename = "RequiredItemCount1")] pub RequiredItemCount1: u16,
    #[sqlx(rename = "RequiredItemCount2")] pub RequiredItemCount2: u16,
    #[sqlx(rename = "RequiredItemCount3")] pub RequiredItemCount3: u16,
    #[sqlx(rename = "RequiredItemCount4")] pub RequiredItemCount4: u16,
    #[sqlx(rename = "RequiredItemCount5")] pub RequiredItemCount5: u16,
    #[sqlx(rename = "RequiredItemCount6")] pub RequiredItemCount6: u16,
    #[sqlx(rename = "ObjectiveText1")] pub ObjectiveText1: Option<String>,
    #[sqlx(rename = "ObjectiveText2")] pub ObjectiveText2: Option<String>,
    #[sqlx(rename = "ObjectiveText3")] pub ObjectiveText3: Option<String>,
    #[sqlx(rename = "ObjectiveText4")] pub ObjectiveText4: Option<String>,
    #[sqlx(rename = "VerifiedBuild")] pub VerifiedBuild: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct QuestListResult {
    pub data: Vec<QuestTemplate>,
    pub total: i64,
}

/// Quests listed by title/ID, optionally only those whose giver (creature or
/// gameobject queststarter) spawns in a zone. Zone scoping is spatial, like the
/// map editor's tables: `creature.zoneId` is 0 on stock rows, so a zone is its
/// WorldMapArea world rectangle on `map`. `map` NULL disables the zone filter;
/// all-NULL bounds mean map-wide (instances).
#[tauri::command]
pub async fn get_quests(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    search: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
    map: Option<u16>,
    min_x: Option<f32>,
    max_x: Option<f32>,
    min_y: Option<f32>,
    max_y: Option<f32>,
) -> Result<QuestListResult, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    let limit = limit.unwrap_or(50);
    let offset = offset.unwrap_or(0);
    // No search = match everything.
    let pattern = format!("%{}%", search.unwrap_or_default());

    // Zone scope, resolved first as a plain list of quest IDs. Folding it into
    // the list query as `? IS NULL OR q.ID IN (subquery)` keeps MySQL from
    // turning it into a semi-join: it re-runs the subquery per quest row and
    // the list never comes back. `None` = no zone filter.
    let zone_ids: Option<Vec<u32>> = match map {
        None => None,
        Some(map) => {
            // The bounds filter binds min_x twice: NULL disables it (map-wide).
            const SQL_ZONE: &str = "SELECT cq.quest FROM creature c \
                JOIN creature_queststarter cq ON cq.id = c.id \
                WHERE c.map = ? AND (? IS NULL OR (c.position_x BETWEEN ? AND ? AND c.position_y BETWEEN ? AND ?)) \
                UNION \
                SELECT gq.quest FROM gameobject g \
                JOIN gameobject_queststarter gq ON gq.id = g.id \
                WHERE g.map = ? AND (? IS NULL OR (g.position_x BETWEEN ? AND ? AND g.position_y BETWEEN ? AND ?))";
            let rows: Vec<(u32,)> = debug_sql!(app, debug, SQL_ZONE,
                sqlx::query_as(SQL_ZONE)
                    .bind(map).bind(min_x).bind(min_x).bind(max_x).bind(min_y).bind(max_y)
                    .bind(map).bind(min_x).bind(min_x).bind(max_x).bind(min_y).bind(max_y)
                    .fetch_all(pool).await,
                map, min_x, max_x, min_y, max_y
            ).map_err(|e| format!("Zone query failed: {}", e))?;
            Some(rows.into_iter().map(|r| r.0).collect())
        }
    };

    // IDs are u32s from the DB, so inlining them can't inject anything (the
    // list can't be a single bound parameter).
    let zone_clause = match &zone_ids {
        None => String::new(),
        Some(ids) if ids.is_empty() => " AND 1 = 0".to_string(),
        Some(ids) => format!(
            " AND q.ID IN ({})",
            ids.iter().map(u32::to_string).collect::<Vec<_>>().join(",")
        ),
    };
    let where_sql = format!("WHERE (q.LogTitle LIKE ? OR q.ID LIKE ?){zone_clause}");

    // A zone list reads by level (scaling quests, level -1, last); the full
    // list stays in ID order.
    let order_sql = if zone_ids.is_some() {
        "ORDER BY q.QuestLevel = -1, q.QuestLevel, q.MinLevel, q.ID"
    } else {
        "ORDER BY q.ID"
    };
    let sql_data = format!("SELECT q.* FROM quest_template q {where_sql} {order_sql} LIMIT ? OFFSET ?");
    let data: Vec<QuestTemplate> = debug_sql!(app, debug, &sql_data,
        sqlx::query_as(&sql_data)
            .bind(&pattern).bind(&pattern)
            .bind(limit).bind(offset)
            .fetch_all(pool).await,
        &pattern, limit, offset
    ).map_err(|e| format!("Query failed: {}", e))?;

    let sql_count = format!("SELECT COUNT(*) FROM quest_template q {where_sql}");
    let count: (i64,) = debug_sql!(app, debug, &sql_count,
        sqlx::query_as(&sql_count)
            .bind(&pattern).bind(&pattern)
            .fetch_one(pool).await,
        &pattern
    ).map_err(|e| format!("Count query failed: {}", e))?;

    Ok(QuestListResult { data, total: count.0 })
}

#[tauri::command]
pub async fn get_quest(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    id: u32,
) -> Result<QuestTemplate, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    const SQL: &str = "SELECT * FROM quest_template WHERE ID = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, QuestTemplate>(SQL).bind(id).fetch_optional(pool).await,
        id
    ).map_err(|e| format!("Query failed: {}", e))?
    .ok_or_else(|| format!("Quest with ID {} not found", id))
}

#[tauri::command]
pub async fn save_quest(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    data: QuestTemplate,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    const SQL: &str = "INSERT INTO quest_template (
        ID,QuestType,QuestLevel,MinLevel,QuestSortID,QuestInfoID,SuggestedGroupNum,
        RequiredFactionId1,RequiredFactionId2,RequiredFactionValue1,RequiredFactionValue2,
        RewardNextQuest,RewardXPDifficulty,RewardMoney,RewardBonusMoney,
        RewardDisplaySpell,RewardSpell,RewardHonor,RewardKillHonor,StartItem,Flags,RequiredPlayerKills,
        RewardItem1,RewardAmount1,RewardItem2,RewardAmount2,RewardItem3,RewardAmount3,RewardItem4,RewardAmount4,
        ItemDrop1,ItemDropQuantity1,ItemDrop2,ItemDropQuantity2,ItemDrop3,ItemDropQuantity3,ItemDrop4,ItemDropQuantity4,
        RewardChoiceItemID1,RewardChoiceItemQuantity1,RewardChoiceItemID2,RewardChoiceItemQuantity2,
        RewardChoiceItemID3,RewardChoiceItemQuantity3,RewardChoiceItemID4,RewardChoiceItemQuantity4,
        RewardChoiceItemID5,RewardChoiceItemQuantity5,RewardChoiceItemID6,RewardChoiceItemQuantity6,
        POIContinent,POIx,POIy,POIPriority,RewardTitle,RewardTalents,RewardArenaPoints,
        RewardFactionID1,RewardFactionValue1,RewardFactionOverride1,
        RewardFactionID2,RewardFactionValue2,RewardFactionOverride2,
        RewardFactionID3,RewardFactionValue3,RewardFactionOverride3,
        RewardFactionID4,RewardFactionValue4,RewardFactionOverride4,
        RewardFactionID5,RewardFactionValue5,RewardFactionOverride5,
        RewardFactionFlags,TimeAllowed,AllowableRaces,
        LogTitle,LogDescription,QuestDescription,AreaDescription,QuestCompletionLog,
        RequiredNpcOrGo1,RequiredNpcOrGo2,RequiredNpcOrGo3,RequiredNpcOrGo4,
        RequiredNpcOrGoCount1,RequiredNpcOrGoCount2,RequiredNpcOrGoCount3,RequiredNpcOrGoCount4,
        RequiredItemId1,RequiredItemId2,RequiredItemId3,RequiredItemId4,RequiredItemId5,RequiredItemId6,
        RequiredItemCount1,RequiredItemCount2,RequiredItemCount3,RequiredItemCount4,RequiredItemCount5,RequiredItemCount6,
        ObjectiveText1,ObjectiveText2,ObjectiveText3,ObjectiveText4,VerifiedBuild
    ) VALUES (
        ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,
        ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,
        ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,
        ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
    ) ON DUPLICATE KEY UPDATE ID = VALUES(ID), QuestType = VALUES(QuestType), QuestLevel = VALUES(QuestLevel), MinLevel = VALUES(MinLevel), QuestSortID = VALUES(QuestSortID), QuestInfoID = VALUES(QuestInfoID), SuggestedGroupNum = VALUES(SuggestedGroupNum), RequiredFactionId1 = VALUES(RequiredFactionId1), RequiredFactionId2 = VALUES(RequiredFactionId2), RequiredFactionValue1 = VALUES(RequiredFactionValue1), RequiredFactionValue2 = VALUES(RequiredFactionValue2), RewardNextQuest = VALUES(RewardNextQuest), RewardXPDifficulty = VALUES(RewardXPDifficulty), RewardMoney = VALUES(RewardMoney), RewardBonusMoney = VALUES(RewardBonusMoney), RewardDisplaySpell = VALUES(RewardDisplaySpell), RewardSpell = VALUES(RewardSpell), RewardHonor = VALUES(RewardHonor), RewardKillHonor = VALUES(RewardKillHonor), StartItem = VALUES(StartItem), Flags = VALUES(Flags), RequiredPlayerKills = VALUES(RequiredPlayerKills), RewardItem1 = VALUES(RewardItem1), RewardAmount1 = VALUES(RewardAmount1), RewardItem2 = VALUES(RewardItem2), RewardAmount2 = VALUES(RewardAmount2), RewardItem3 = VALUES(RewardItem3), RewardAmount3 = VALUES(RewardAmount3), RewardItem4 = VALUES(RewardItem4), RewardAmount4 = VALUES(RewardAmount4), ItemDrop1 = VALUES(ItemDrop1), ItemDropQuantity1 = VALUES(ItemDropQuantity1), ItemDrop2 = VALUES(ItemDrop2), ItemDropQuantity2 = VALUES(ItemDropQuantity2), ItemDrop3 = VALUES(ItemDrop3), ItemDropQuantity3 = VALUES(ItemDropQuantity3), ItemDrop4 = VALUES(ItemDrop4), ItemDropQuantity4 = VALUES(ItemDropQuantity4), RewardChoiceItemID1 = VALUES(RewardChoiceItemID1), RewardChoiceItemQuantity1 = VALUES(RewardChoiceItemQuantity1), RewardChoiceItemID2 = VALUES(RewardChoiceItemID2), RewardChoiceItemQuantity2 = VALUES(RewardChoiceItemQuantity2), RewardChoiceItemID3 = VALUES(RewardChoiceItemID3), RewardChoiceItemQuantity3 = VALUES(RewardChoiceItemQuantity3), RewardChoiceItemID4 = VALUES(RewardChoiceItemID4), RewardChoiceItemQuantity4 = VALUES(RewardChoiceItemQuantity4), RewardChoiceItemID5 = VALUES(RewardChoiceItemID5), RewardChoiceItemQuantity5 = VALUES(RewardChoiceItemQuantity5), RewardChoiceItemID6 = VALUES(RewardChoiceItemID6), RewardChoiceItemQuantity6 = VALUES(RewardChoiceItemQuantity6), POIContinent = VALUES(POIContinent), POIx = VALUES(POIx), POIy = VALUES(POIy), POIPriority = VALUES(POIPriority), RewardTitle = VALUES(RewardTitle), RewardTalents = VALUES(RewardTalents), RewardArenaPoints = VALUES(RewardArenaPoints), RewardFactionID1 = VALUES(RewardFactionID1), RewardFactionValue1 = VALUES(RewardFactionValue1), RewardFactionOverride1 = VALUES(RewardFactionOverride1), RewardFactionID2 = VALUES(RewardFactionID2), RewardFactionValue2 = VALUES(RewardFactionValue2), RewardFactionOverride2 = VALUES(RewardFactionOverride2), RewardFactionID3 = VALUES(RewardFactionID3), RewardFactionValue3 = VALUES(RewardFactionValue3), RewardFactionOverride3 = VALUES(RewardFactionOverride3), RewardFactionID4 = VALUES(RewardFactionID4), RewardFactionValue4 = VALUES(RewardFactionValue4), RewardFactionOverride4 = VALUES(RewardFactionOverride4), RewardFactionID5 = VALUES(RewardFactionID5), RewardFactionValue5 = VALUES(RewardFactionValue5), RewardFactionOverride5 = VALUES(RewardFactionOverride5), RewardFactionFlags = VALUES(RewardFactionFlags), TimeAllowed = VALUES(TimeAllowed), AllowableRaces = VALUES(AllowableRaces), LogTitle = VALUES(LogTitle), LogDescription = VALUES(LogDescription), QuestDescription = VALUES(QuestDescription), AreaDescription = VALUES(AreaDescription), QuestCompletionLog = VALUES(QuestCompletionLog), RequiredNpcOrGo1 = VALUES(RequiredNpcOrGo1), RequiredNpcOrGo2 = VALUES(RequiredNpcOrGo2), RequiredNpcOrGo3 = VALUES(RequiredNpcOrGo3), RequiredNpcOrGo4 = VALUES(RequiredNpcOrGo4), RequiredNpcOrGoCount1 = VALUES(RequiredNpcOrGoCount1), RequiredNpcOrGoCount2 = VALUES(RequiredNpcOrGoCount2), RequiredNpcOrGoCount3 = VALUES(RequiredNpcOrGoCount3), RequiredNpcOrGoCount4 = VALUES(RequiredNpcOrGoCount4), RequiredItemId1 = VALUES(RequiredItemId1), RequiredItemId2 = VALUES(RequiredItemId2), RequiredItemId3 = VALUES(RequiredItemId3), RequiredItemId4 = VALUES(RequiredItemId4), RequiredItemId5 = VALUES(RequiredItemId5), RequiredItemId6 = VALUES(RequiredItemId6), RequiredItemCount1 = VALUES(RequiredItemCount1), RequiredItemCount2 = VALUES(RequiredItemCount2), RequiredItemCount3 = VALUES(RequiredItemCount3), RequiredItemCount4 = VALUES(RequiredItemCount4), RequiredItemCount5 = VALUES(RequiredItemCount5), RequiredItemCount6 = VALUES(RequiredItemCount6), ObjectiveText1 = VALUES(ObjectiveText1), ObjectiveText2 = VALUES(ObjectiveText2), ObjectiveText3 = VALUES(ObjectiveText3), ObjectiveText4 = VALUES(ObjectiveText4), VerifiedBuild = VALUES(VerifiedBuild)";
    debug_sql!(app, debug, SQL,
        sqlx::query(SQL)
        .bind(data.ID).bind(data.QuestType).bind(data.QuestLevel).bind(data.MinLevel)
        .bind(data.QuestSortID).bind(data.QuestInfoID).bind(data.SuggestedGroupNum)
        .bind(data.RequiredFactionId1).bind(data.RequiredFactionId2)
        .bind(data.RequiredFactionValue1).bind(data.RequiredFactionValue2)
        .bind(data.RewardNextQuest).bind(data.RewardXPDifficulty).bind(data.RewardMoney)
        .bind(data.RewardBonusMoney).bind(data.RewardDisplaySpell).bind(data.RewardSpell)
        .bind(data.RewardHonor).bind(data.RewardKillHonor).bind(data.StartItem)
        .bind(data.Flags).bind(data.RequiredPlayerKills)
        .bind(data.RewardItem1).bind(data.RewardAmount1).bind(data.RewardItem2).bind(data.RewardAmount2)
        .bind(data.RewardItem3).bind(data.RewardAmount3).bind(data.RewardItem4).bind(data.RewardAmount4)
        .bind(data.ItemDrop1).bind(data.ItemDropQuantity1).bind(data.ItemDrop2).bind(data.ItemDropQuantity2)
        .bind(data.ItemDrop3).bind(data.ItemDropQuantity3).bind(data.ItemDrop4).bind(data.ItemDropQuantity4)
        .bind(data.RewardChoiceItemID1).bind(data.RewardChoiceItemQuantity1)
        .bind(data.RewardChoiceItemID2).bind(data.RewardChoiceItemQuantity2)
        .bind(data.RewardChoiceItemID3).bind(data.RewardChoiceItemQuantity3)
        .bind(data.RewardChoiceItemID4).bind(data.RewardChoiceItemQuantity4)
        .bind(data.RewardChoiceItemID5).bind(data.RewardChoiceItemQuantity5)
        .bind(data.RewardChoiceItemID6).bind(data.RewardChoiceItemQuantity6)
        .bind(data.POIContinent).bind(data.POIx).bind(data.POIy).bind(data.POIPriority)
        .bind(data.RewardTitle).bind(data.RewardTalents).bind(data.RewardArenaPoints)
        .bind(data.RewardFactionID1).bind(data.RewardFactionValue1).bind(data.RewardFactionOverride1)
        .bind(data.RewardFactionID2).bind(data.RewardFactionValue2).bind(data.RewardFactionOverride2)
        .bind(data.RewardFactionID3).bind(data.RewardFactionValue3).bind(data.RewardFactionOverride3)
        .bind(data.RewardFactionID4).bind(data.RewardFactionValue4).bind(data.RewardFactionOverride4)
        .bind(data.RewardFactionID5).bind(data.RewardFactionValue5).bind(data.RewardFactionOverride5)
        .bind(data.RewardFactionFlags)
        .bind(data.TimeAllowed).bind(data.AllowableRaces)
        .bind(&data.LogTitle).bind(&data.LogDescription).bind(&data.QuestDescription)
        .bind(&data.AreaDescription).bind(&data.QuestCompletionLog)
        .bind(data.RequiredNpcOrGo1).bind(data.RequiredNpcOrGo2)
        .bind(data.RequiredNpcOrGo3).bind(data.RequiredNpcOrGo4)
        .bind(data.RequiredNpcOrGoCount1).bind(data.RequiredNpcOrGoCount2)
        .bind(data.RequiredNpcOrGoCount3).bind(data.RequiredNpcOrGoCount4)
        .bind(data.RequiredItemId1).bind(data.RequiredItemId2).bind(data.RequiredItemId3)
        .bind(data.RequiredItemId4).bind(data.RequiredItemId5).bind(data.RequiredItemId6)
        .bind(data.RequiredItemCount1).bind(data.RequiredItemCount2).bind(data.RequiredItemCount3)
        .bind(data.RequiredItemCount4).bind(data.RequiredItemCount5).bind(data.RequiredItemCount6)
        .bind(&data.ObjectiveText1).bind(&data.ObjectiveText2)
        .bind(&data.ObjectiveText3).bind(&data.ObjectiveText4)
        .bind(data.VerifiedBuild)
        .execute(pool).await,
        data.ID
    ).map_err(|e| format!("Save failed: {}", e))?;
    log::info!("Saved Quest ID {}", data.ID);
    Ok(())
}

#[tauri::command]
pub async fn delete_quest(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    id: u32,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    const SQL: &str = "DELETE FROM quest_template WHERE ID = ?";
    let result = debug_sql!(app, debug, SQL,
        sqlx::query(SQL).bind(id).execute(pool).await,
        id
    ).map_err(|e| format!("Delete failed: {}", e))?;
    if result.rows_affected() == 0 {
        return Err(format!("Quest with ID {} not found", id));
    }
    log::info!("Deleted Quest ID {}", id);
    Ok(())
}

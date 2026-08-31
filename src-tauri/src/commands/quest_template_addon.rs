#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[allow(non_snake_case)]
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct QuestTemplateAddon {
    #[sqlx(rename = "ID")] pub ID: u32,
    #[sqlx(rename = "MaxLevel")] pub MaxLevel: u8,
    #[sqlx(rename = "AllowableClasses")] pub AllowableClasses: u32,
    #[sqlx(rename = "SourceSpellID")] pub SourceSpellID: u32,
    #[sqlx(rename = "PrevQuestID")] pub PrevQuestID: i32,
    #[sqlx(rename = "NextQuestID")] pub NextQuestID: i32,
    #[sqlx(rename = "ExclusiveGroup")] pub ExclusiveGroup: i32,
    #[sqlx(rename = "BreadcrumbForQuestId")] pub BreadcrumbForQuestId: i32,
    #[sqlx(rename = "RewardMailTemplateID")] pub RewardMailTemplateID: u32,
    #[sqlx(rename = "RewardMailDelay")] pub RewardMailDelay: u32,
    #[sqlx(rename = "RequiredSkillID")] pub RequiredSkillID: u16,
    #[sqlx(rename = "RequiredSkillPoints")] pub RequiredSkillPoints: u16,
    #[sqlx(rename = "RequiredMinRepFaction")] pub RequiredMinRepFaction: u16,
    #[sqlx(rename = "RequiredMaxRepFaction")] pub RequiredMaxRepFaction: u16,
    #[sqlx(rename = "RequiredMinRepValue")] pub RequiredMinRepValue: i32,
    #[sqlx(rename = "RequiredMaxRepValue")] pub RequiredMaxRepValue: i32,
    #[sqlx(rename = "ProvidedItemCount")] pub ProvidedItemCount: u8,
    #[sqlx(rename = "SpecialFlags")] pub SpecialFlags: u8,
}

#[tauri::command]
pub async fn get_quest_addon(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    id: u32,
) -> Result<Option<QuestTemplateAddon>, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    const SQL: &str = "SELECT * FROM quest_template_addon WHERE ID = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query_as::<_, QuestTemplateAddon>(SQL).bind(id).fetch_optional(pool).await,
        id
    ).map_err(|e| format!("Query failed: {}", e))
}

#[tauri::command]
pub async fn save_quest_addon(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    id: u32,
    addon: QuestTemplateAddon,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;
    const SQL: &str = "INSERT INTO quest_template_addon (
        ID, MaxLevel, AllowableClasses, SourceSpellID, PrevQuestID, NextQuestID,
        ExclusiveGroup, BreadcrumbForQuestId, RewardMailTemplateID, RewardMailDelay,
        RequiredSkillID, RequiredSkillPoints, RequiredMinRepFaction, RequiredMaxRepFaction,
        RequiredMinRepValue, RequiredMaxRepValue, ProvidedItemCount, SpecialFlags
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE ID = VALUES(ID), MaxLevel = VALUES(MaxLevel), AllowableClasses = VALUES(AllowableClasses), SourceSpellID = VALUES(SourceSpellID), PrevQuestID = VALUES(PrevQuestID), NextQuestID = VALUES(NextQuestID), ExclusiveGroup = VALUES(ExclusiveGroup), BreadcrumbForQuestId = VALUES(BreadcrumbForQuestId), RewardMailTemplateID = VALUES(RewardMailTemplateID), RewardMailDelay = VALUES(RewardMailDelay), RequiredSkillID = VALUES(RequiredSkillID), RequiredSkillPoints = VALUES(RequiredSkillPoints), RequiredMinRepFaction = VALUES(RequiredMinRepFaction), RequiredMaxRepFaction = VALUES(RequiredMaxRepFaction), RequiredMinRepValue = VALUES(RequiredMinRepValue), RequiredMaxRepValue = VALUES(RequiredMaxRepValue), ProvidedItemCount = VALUES(ProvidedItemCount), SpecialFlags = VALUES(SpecialFlags)";
    debug_sql!(app, debug, SQL,
        sqlx::query(SQL)
        .bind(id)
        .bind(addon.MaxLevel)
        .bind(addon.AllowableClasses)
        .bind(addon.SourceSpellID)
        .bind(addon.PrevQuestID)
        .bind(addon.NextQuestID)
        .bind(addon.ExclusiveGroup)
        .bind(addon.BreadcrumbForQuestId)
        .bind(addon.RewardMailTemplateID)
        .bind(addon.RewardMailDelay)
        .bind(addon.RequiredSkillID)
        .bind(addon.RequiredSkillPoints)
        .bind(addon.RequiredMinRepFaction)
        .bind(addon.RequiredMaxRepFaction)
        .bind(addon.RequiredMinRepValue)
        .bind(addon.RequiredMaxRepValue)
        .bind(addon.ProvidedItemCount)
        .bind(addon.SpecialFlags)
        .execute(pool).await,
        id
    ).map_err(|e| format!("Save failed: {}", e))?;
    log::info!("Saved quest_template_addon for ID {}", id);
    Ok(())
}

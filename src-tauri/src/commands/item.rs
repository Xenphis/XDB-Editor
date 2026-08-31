#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use crate::db::DbState;
use crate::debug::DebugState;
use crate::debug_sql;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ItemTemplate {
    pub entry: u32,
    pub class: u8,
    pub subclass: u8,
    #[sqlx(rename = "SoundOverrideSubclass")]
    pub SoundOverrideSubclass: i8,
    pub name: String,
    pub displayid: u32,
    #[sqlx(rename = "Quality")]
    pub Quality: u8,
    #[sqlx(rename = "Flags")]
    pub Flags: u32,
    #[sqlx(rename = "FlagsExtra")]
    pub FlagsExtra: u32,
    #[sqlx(rename = "BuyCount")]
    pub BuyCount: u8,
    #[sqlx(rename = "BuyPrice")]
    pub BuyPrice: i64,
    #[sqlx(rename = "SellPrice")]
    pub SellPrice: u32,
    #[sqlx(rename = "InventoryType")]
    pub InventoryType: u8,
    #[sqlx(rename = "AllowableClass")]
    pub AllowableClass: i32,
    #[sqlx(rename = "AllowableRace")]
    pub AllowableRace: i32,
    #[sqlx(rename = "ItemLevel")]
    pub ItemLevel: u16,
    #[sqlx(rename = "RequiredLevel")]
    pub RequiredLevel: u8,
    #[sqlx(rename = "RequiredSkill")]
    pub RequiredSkill: u16,
    #[sqlx(rename = "RequiredSkillRank")]
    pub RequiredSkillRank: u16,
    pub requiredspell: u32,
    pub requiredhonorrank: u32,
    #[sqlx(rename = "RequiredCityRank")]
    pub RequiredCityRank: u32,
    #[sqlx(rename = "RequiredReputationFaction")]
    pub RequiredReputationFaction: u16,
    #[sqlx(rename = "RequiredReputationRank")]
    pub RequiredReputationRank: u16,
    pub maxcount: i32,
    pub stackable: Option<i32>,
    #[sqlx(rename = "ContainerSlots")]
    pub ContainerSlots: u8,
    #[sqlx(rename = "StatsCount")]
    pub StatsCount: u8,
    pub stat_type1: u8,
    pub stat_value1: i16,
    pub stat_type2: u8,
    pub stat_value2: i16,
    pub stat_type3: u8,
    pub stat_value3: i16,
    pub stat_type4: u8,
    pub stat_value4: i16,
    pub stat_type5: u8,
    pub stat_value5: i16,
    pub stat_type6: u8,
    pub stat_value6: i16,
    pub stat_type7: u8,
    pub stat_value7: i16,
    pub stat_type8: u8,
    pub stat_value8: i16,
    pub stat_type9: u8,
    pub stat_value9: i16,
    pub stat_type10: u8,
    pub stat_value10: i16,
    #[sqlx(rename = "ScalingStatDistribution")]
    pub ScalingStatDistribution: i16,
    #[sqlx(rename = "ScalingStatValue")]
    pub ScalingStatValue: u32,
    pub dmg_min1: f32,
    pub dmg_max1: f32,
    pub dmg_type1: u8,
    pub dmg_min2: f32,
    pub dmg_max2: f32,
    pub dmg_type2: u8,
    pub armor: u16,
    pub holy_res: u8,
    pub fire_res: u8,
    pub nature_res: u8,
    pub frost_res: u8,
    pub shadow_res: u8,
    pub arcane_res: u8,
    pub delay: u16,
    pub ammo_type: u8,
    #[sqlx(rename = "RangedModRange")]
    pub RangedModRange: f32,
    pub spellid_1: i32,
    pub spelltrigger_1: u8,
    pub spellcharges_1: i16,
    pub spellppmRate_1: f32,
    pub spellcooldown_1: i32,
    pub spellcategory_1: u16,
    pub spellcategorycooldown_1: i32,
    pub spellid_2: i32,
    pub spelltrigger_2: u8,
    pub spellcharges_2: i16,
    pub spellppmRate_2: f32,
    pub spellcooldown_2: i32,
    pub spellcategory_2: u16,
    pub spellcategorycooldown_2: i32,
    pub spellid_3: i32,
    pub spelltrigger_3: u8,
    pub spellcharges_3: i16,
    pub spellppmRate_3: f32,
    pub spellcooldown_3: i32,
    pub spellcategory_3: u16,
    pub spellcategorycooldown_3: i32,
    pub spellid_4: i32,
    pub spelltrigger_4: u8,
    pub spellcharges_4: i16,
    pub spellppmRate_4: f32,
    pub spellcooldown_4: i32,
    pub spellcategory_4: u16,
    pub spellcategorycooldown_4: i32,
    pub spellid_5: i32,
    pub spelltrigger_5: u8,
    pub spellcharges_5: i16,
    pub spellppmRate_5: f32,
    pub spellcooldown_5: i32,
    pub spellcategory_5: u16,
    pub spellcategorycooldown_5: i32,
    pub bonding: u8,
    pub description: String,
    #[sqlx(rename = "PageText")]
    pub PageText: u32,
    #[sqlx(rename = "LanguageID")]
    pub LanguageID: u8,
    #[sqlx(rename = "PageMaterial")]
    pub PageMaterial: u8,
    pub startquest: u32,
    pub lockid: u32,
    #[sqlx(rename = "Material")]
    pub Material: i8,
    pub sheath: u8,
    #[sqlx(rename = "RandomProperty")]
    pub RandomProperty: i32,
    #[sqlx(rename = "RandomSuffix")]
    pub RandomSuffix: u32,
    pub block: u32,
    pub itemset: u32,
    #[sqlx(rename = "MaxDurability")]
    pub MaxDurability: u16,
    pub area: u32,
    #[sqlx(rename = "Map")]
    pub Map: i16,
    #[sqlx(rename = "BagFamily")]
    pub BagFamily: i32,
    #[sqlx(rename = "TotemCategory")]
    pub TotemCategory: i32,
    pub socketColor_1: i8,
    pub socketContent_1: i32,
    pub socketColor_2: i8,
    pub socketContent_2: i32,
    pub socketColor_3: i8,
    pub socketContent_3: i32,
    pub socketBonus: i32,
    #[sqlx(rename = "GemProperties")]
    pub GemProperties: i32,
    #[sqlx(rename = "RequiredDisenchantSkill")]
    pub RequiredDisenchantSkill: i16,
    #[sqlx(rename = "ArmorDamageModifier")]
    pub ArmorDamageModifier: f32,
    pub duration: u32,
    #[sqlx(rename = "ItemLimitCategory")]
    pub ItemLimitCategory: i16,
    #[sqlx(rename = "HolidayId")]
    pub HolidayId: u32,
    #[sqlx(rename = "ScriptName")]
    pub ScriptName: String,
    #[sqlx(rename = "DisenchantID")]
    pub DisenchantID: u32,
    #[sqlx(rename = "FoodType")]
    pub FoodType: u8,
    pub minMoneyLoot: u32,
    pub maxMoneyLoot: u32,
    pub flagsCustom: u32,
    #[sqlx(rename = "VerifiedBuild")]
    pub VerifiedBuild: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct ItemListResult {
    pub data: Vec<ItemTemplate>,
    pub total: i64,
}

#[tauri::command]
pub async fn get_items(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    search: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<ItemListResult, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    let limit = limit.unwrap_or(50);
    let offset = offset.unwrap_or(0);

    let (data, total) = match &search {
        Some(q) if !q.is_empty() => {
            let pattern = format!("%{}%", q);
            const SQL_DATA: &str = "SELECT * FROM item_template WHERE name LIKE ? OR entry LIKE ? ORDER BY entry LIMIT ? OFFSET ?";
            let rows: Vec<ItemTemplate> = debug_sql!(app, debug, SQL_DATA,
                sqlx::query_as(SQL_DATA)
                .bind(&pattern)
                .bind(&pattern)
                .bind(limit)
                .bind(offset)
                .fetch_all(pool)
                .await,
                &pattern, &pattern, limit, offset
            ).map_err(|e| format!("Query failed: {}", e))?;

            const SQL_COUNT: &str = "SELECT COUNT(*) FROM item_template WHERE name LIKE ? OR entry LIKE ?";
            let count: (i64,) = debug_sql!(app, debug, SQL_COUNT,
                sqlx::query_as(SQL_COUNT)
                .bind(&pattern)
                .bind(&pattern)
                .fetch_one(pool)
                .await,
                &pattern, &pattern
            ).map_err(|e| format!("Count query failed: {}", e))?;

            (rows, count.0)
        }
        _ => {
            const SQL_DATA: &str = "SELECT * FROM item_template ORDER BY entry LIMIT ? OFFSET ?";
            let rows: Vec<ItemTemplate> = debug_sql!(app, debug, SQL_DATA,
                sqlx::query_as(SQL_DATA)
                .bind(limit)
                .bind(offset)
                .fetch_all(pool)
                .await,
                limit, offset
            ).map_err(|e| format!("Query failed: {}", e))?;

            const SQL_COUNT: &str = "SELECT COUNT(*) FROM item_template";
            let count: (i64,) = debug_sql!(app, debug, SQL_COUNT,
                sqlx::query_as(SQL_COUNT)
                .fetch_one(pool)
                .await
            ).map_err(|e| format!("Count query failed: {}", e))?;

            (rows, count.0)
        }
    };

    Ok(ItemListResult { data, total })
}

#[tauri::command]
pub async fn get_item(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
) -> Result<ItemTemplate, String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "SELECT * FROM item_template WHERE entry = ?";
    let item: ItemTemplate = debug_sql!(app, debug, SQL,
        sqlx::query_as(SQL)
        .bind(entry)
        .fetch_one(pool)
        .await,
        entry
    ).map_err(|e| format!("Query failed: {}", e))?;

    Ok(item)
}

#[tauri::command]
pub async fn save_item(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    item: ItemTemplate,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "INSERT INTO item_template (
            entry, class, subclass, SoundOverrideSubclass, name, displayid, Quality,
            Flags, FlagsExtra, BuyCount, BuyPrice, SellPrice, InventoryType,
            AllowableClass, AllowableRace, ItemLevel, RequiredLevel, RequiredSkill,
            RequiredSkillRank, requiredspell, requiredhonorrank, RequiredCityRank,
            RequiredReputationFaction, RequiredReputationRank, maxcount, stackable,
            ContainerSlots, StatsCount, stat_type1, stat_value1, stat_type2, stat_value2,
            stat_type3, stat_value3, stat_type4, stat_value4, stat_type5, stat_value5,
            stat_type6, stat_value6, stat_type7, stat_value7, stat_type8, stat_value8,
            stat_type9, stat_value9, stat_type10, stat_value10, ScalingStatDistribution,
            ScalingStatValue, dmg_min1, dmg_max1, dmg_type1, dmg_min2, dmg_max2, dmg_type2,
            armor, holy_res, fire_res, nature_res, frost_res, shadow_res, arcane_res,
            delay, ammo_type, RangedModRange, spellid_1, spelltrigger_1, spellcharges_1,
            spellppmRate_1, spellcooldown_1, spellcategory_1, spellcategorycooldown_1,
            spellid_2, spelltrigger_2, spellcharges_2, spellppmRate_2, spellcooldown_2,
            spellcategory_2, spellcategorycooldown_2, spellid_3, spelltrigger_3,
            spellcharges_3, spellppmRate_3, spellcooldown_3, spellcategory_3,
            spellcategorycooldown_3, spellid_4, spelltrigger_4, spellcharges_4,
            spellppmRate_4, spellcooldown_4, spellcategory_4, spellcategorycooldown_4,
            spellid_5, spelltrigger_5, spellcharges_5, spellppmRate_5, spellcooldown_5,
            spellcategory_5, spellcategorycooldown_5, bonding, description, PageText,
            LanguageID, PageMaterial, startquest, lockid, Material, sheath,
            RandomProperty, RandomSuffix, block, itemset, MaxDurability, area, Map,
            BagFamily, TotemCategory, socketColor_1, socketContent_1, socketColor_2,
            socketContent_2, socketColor_3, socketContent_3, socketBonus, GemProperties,
            RequiredDisenchantSkill, ArmorDamageModifier, duration, ItemLimitCategory,
            HolidayId, ScriptName, DisenchantID, FoodType, minMoneyLoot, maxMoneyLoot,
            flagsCustom, VerifiedBuild
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        ) ON DUPLICATE KEY UPDATE entry = VALUES(entry), class = VALUES(class), subclass = VALUES(subclass), SoundOverrideSubclass = VALUES(SoundOverrideSubclass), name = VALUES(name), displayid = VALUES(displayid), Quality = VALUES(Quality), Flags = VALUES(Flags), FlagsExtra = VALUES(FlagsExtra), BuyCount = VALUES(BuyCount), BuyPrice = VALUES(BuyPrice), SellPrice = VALUES(SellPrice), InventoryType = VALUES(InventoryType), AllowableClass = VALUES(AllowableClass), AllowableRace = VALUES(AllowableRace), ItemLevel = VALUES(ItemLevel), RequiredLevel = VALUES(RequiredLevel), RequiredSkill = VALUES(RequiredSkill), RequiredSkillRank = VALUES(RequiredSkillRank), requiredspell = VALUES(requiredspell), requiredhonorrank = VALUES(requiredhonorrank), RequiredCityRank = VALUES(RequiredCityRank), RequiredReputationFaction = VALUES(RequiredReputationFaction), RequiredReputationRank = VALUES(RequiredReputationRank), maxcount = VALUES(maxcount), stackable = VALUES(stackable), ContainerSlots = VALUES(ContainerSlots), StatsCount = VALUES(StatsCount), stat_type1 = VALUES(stat_type1), stat_value1 = VALUES(stat_value1), stat_type2 = VALUES(stat_type2), stat_value2 = VALUES(stat_value2), stat_type3 = VALUES(stat_type3), stat_value3 = VALUES(stat_value3), stat_type4 = VALUES(stat_type4), stat_value4 = VALUES(stat_value4), stat_type5 = VALUES(stat_type5), stat_value5 = VALUES(stat_value5), stat_type6 = VALUES(stat_type6), stat_value6 = VALUES(stat_value6), stat_type7 = VALUES(stat_type7), stat_value7 = VALUES(stat_value7), stat_type8 = VALUES(stat_type8), stat_value8 = VALUES(stat_value8), stat_type9 = VALUES(stat_type9), stat_value9 = VALUES(stat_value9), stat_type10 = VALUES(stat_type10), stat_value10 = VALUES(stat_value10), ScalingStatDistribution = VALUES(ScalingStatDistribution), ScalingStatValue = VALUES(ScalingStatValue), dmg_min1 = VALUES(dmg_min1), dmg_max1 = VALUES(dmg_max1), dmg_type1 = VALUES(dmg_type1), dmg_min2 = VALUES(dmg_min2), dmg_max2 = VALUES(dmg_max2), dmg_type2 = VALUES(dmg_type2), armor = VALUES(armor), holy_res = VALUES(holy_res), fire_res = VALUES(fire_res), nature_res = VALUES(nature_res), frost_res = VALUES(frost_res), shadow_res = VALUES(shadow_res), arcane_res = VALUES(arcane_res), delay = VALUES(delay), ammo_type = VALUES(ammo_type), RangedModRange = VALUES(RangedModRange), spellid_1 = VALUES(spellid_1), spelltrigger_1 = VALUES(spelltrigger_1), spellcharges_1 = VALUES(spellcharges_1), spellppmRate_1 = VALUES(spellppmRate_1), spellcooldown_1 = VALUES(spellcooldown_1), spellcategory_1 = VALUES(spellcategory_1), spellcategorycooldown_1 = VALUES(spellcategorycooldown_1), spellid_2 = VALUES(spellid_2), spelltrigger_2 = VALUES(spelltrigger_2), spellcharges_2 = VALUES(spellcharges_2), spellppmRate_2 = VALUES(spellppmRate_2), spellcooldown_2 = VALUES(spellcooldown_2), spellcategory_2 = VALUES(spellcategory_2), spellcategorycooldown_2 = VALUES(spellcategorycooldown_2), spellid_3 = VALUES(spellid_3), spelltrigger_3 = VALUES(spelltrigger_3), spellcharges_3 = VALUES(spellcharges_3), spellppmRate_3 = VALUES(spellppmRate_3), spellcooldown_3 = VALUES(spellcooldown_3), spellcategory_3 = VALUES(spellcategory_3), spellcategorycooldown_3 = VALUES(spellcategorycooldown_3), spellid_4 = VALUES(spellid_4), spelltrigger_4 = VALUES(spelltrigger_4), spellcharges_4 = VALUES(spellcharges_4), spellppmRate_4 = VALUES(spellppmRate_4), spellcooldown_4 = VALUES(spellcooldown_4), spellcategory_4 = VALUES(spellcategory_4), spellcategorycooldown_4 = VALUES(spellcategorycooldown_4), spellid_5 = VALUES(spellid_5), spelltrigger_5 = VALUES(spelltrigger_5), spellcharges_5 = VALUES(spellcharges_5), spellppmRate_5 = VALUES(spellppmRate_5), spellcooldown_5 = VALUES(spellcooldown_5), spellcategory_5 = VALUES(spellcategory_5), spellcategorycooldown_5 = VALUES(spellcategorycooldown_5), bonding = VALUES(bonding), description = VALUES(description), PageText = VALUES(PageText), LanguageID = VALUES(LanguageID), PageMaterial = VALUES(PageMaterial), startquest = VALUES(startquest), lockid = VALUES(lockid), Material = VALUES(Material), sheath = VALUES(sheath), RandomProperty = VALUES(RandomProperty), RandomSuffix = VALUES(RandomSuffix), block = VALUES(block), itemset = VALUES(itemset), MaxDurability = VALUES(MaxDurability), area = VALUES(area), Map = VALUES(Map), BagFamily = VALUES(BagFamily), TotemCategory = VALUES(TotemCategory), socketColor_1 = VALUES(socketColor_1), socketContent_1 = VALUES(socketContent_1), socketColor_2 = VALUES(socketColor_2), socketContent_2 = VALUES(socketContent_2), socketColor_3 = VALUES(socketColor_3), socketContent_3 = VALUES(socketContent_3), socketBonus = VALUES(socketBonus), GemProperties = VALUES(GemProperties), RequiredDisenchantSkill = VALUES(RequiredDisenchantSkill), ArmorDamageModifier = VALUES(ArmorDamageModifier), duration = VALUES(duration), ItemLimitCategory = VALUES(ItemLimitCategory), HolidayId = VALUES(HolidayId), ScriptName = VALUES(ScriptName), DisenchantID = VALUES(DisenchantID), FoodType = VALUES(FoodType), minMoneyLoot = VALUES(minMoneyLoot), maxMoneyLoot = VALUES(maxMoneyLoot), flagsCustom = VALUES(flagsCustom), VerifiedBuild = VALUES(VerifiedBuild)";
    debug_sql!(app, debug, SQL,
        sqlx::query(SQL)
        .bind(item.entry)
        .bind(item.class)
        .bind(item.subclass)
        .bind(item.SoundOverrideSubclass)
        .bind(&item.name)
        .bind(item.displayid)
        .bind(item.Quality)
        .bind(item.Flags)
        .bind(item.FlagsExtra)
        .bind(item.BuyCount)
        .bind(item.BuyPrice)
        .bind(item.SellPrice)
        .bind(item.InventoryType)
        .bind(item.AllowableClass)
        .bind(item.AllowableRace)
        .bind(item.ItemLevel)
        .bind(item.RequiredLevel)
        .bind(item.RequiredSkill)
        .bind(item.RequiredSkillRank)
        .bind(item.requiredspell)
        .bind(item.requiredhonorrank)
        .bind(item.RequiredCityRank)
        .bind(item.RequiredReputationFaction)
        .bind(item.RequiredReputationRank)
        .bind(item.maxcount)
        .bind(item.stackable)
        .bind(item.ContainerSlots)
        .bind(item.StatsCount)
        .bind(item.stat_type1)
        .bind(item.stat_value1)
        .bind(item.stat_type2)
        .bind(item.stat_value2)
        .bind(item.stat_type3)
        .bind(item.stat_value3)
        .bind(item.stat_type4)
        .bind(item.stat_value4)
        .bind(item.stat_type5)
        .bind(item.stat_value5)
        .bind(item.stat_type6)
        .bind(item.stat_value6)
        .bind(item.stat_type7)
        .bind(item.stat_value7)
        .bind(item.stat_type8)
        .bind(item.stat_value8)
        .bind(item.stat_type9)
        .bind(item.stat_value9)
        .bind(item.stat_type10)
        .bind(item.stat_value10)
        .bind(item.ScalingStatDistribution)
        .bind(item.ScalingStatValue)
        .bind(item.dmg_min1)
        .bind(item.dmg_max1)
        .bind(item.dmg_type1)
        .bind(item.dmg_min2)
        .bind(item.dmg_max2)
        .bind(item.dmg_type2)
        .bind(item.armor)
        .bind(item.holy_res)
        .bind(item.fire_res)
        .bind(item.nature_res)
        .bind(item.frost_res)
        .bind(item.shadow_res)
        .bind(item.arcane_res)
        .bind(item.delay)
        .bind(item.ammo_type)
        .bind(item.RangedModRange)
        .bind(item.spellid_1)
        .bind(item.spelltrigger_1)
        .bind(item.spellcharges_1)
        .bind(item.spellppmRate_1)
        .bind(item.spellcooldown_1)
        .bind(item.spellcategory_1)
        .bind(item.spellcategorycooldown_1)
        .bind(item.spellid_2)
        .bind(item.spelltrigger_2)
        .bind(item.spellcharges_2)
        .bind(item.spellppmRate_2)
        .bind(item.spellcooldown_2)
        .bind(item.spellcategory_2)
        .bind(item.spellcategorycooldown_2)
        .bind(item.spellid_3)
        .bind(item.spelltrigger_3)
        .bind(item.spellcharges_3)
        .bind(item.spellppmRate_3)
        .bind(item.spellcooldown_3)
        .bind(item.spellcategory_3)
        .bind(item.spellcategorycooldown_3)
        .bind(item.spellid_4)
        .bind(item.spelltrigger_4)
        .bind(item.spellcharges_4)
        .bind(item.spellppmRate_4)
        .bind(item.spellcooldown_4)
        .bind(item.spellcategory_4)
        .bind(item.spellcategorycooldown_4)
        .bind(item.spellid_5)
        .bind(item.spelltrigger_5)
        .bind(item.spellcharges_5)
        .bind(item.spellppmRate_5)
        .bind(item.spellcooldown_5)
        .bind(item.spellcategory_5)
        .bind(item.spellcategorycooldown_5)
        .bind(item.bonding)
        .bind(&item.description)
        .bind(item.PageText)
        .bind(item.LanguageID)
        .bind(item.PageMaterial)
        .bind(item.startquest)
        .bind(item.lockid)
        .bind(item.Material)
        .bind(item.sheath)
        .bind(item.RandomProperty)
        .bind(item.RandomSuffix)
        .bind(item.block)
        .bind(item.itemset)
        .bind(item.MaxDurability)
        .bind(item.area)
        .bind(item.Map)
        .bind(item.BagFamily)
        .bind(item.TotemCategory)
        .bind(item.socketColor_1)
        .bind(item.socketContent_1)
        .bind(item.socketColor_2)
        .bind(item.socketContent_2)
        .bind(item.socketColor_3)
        .bind(item.socketContent_3)
        .bind(item.socketBonus)
        .bind(item.GemProperties)
        .bind(item.RequiredDisenchantSkill)
        .bind(item.ArmorDamageModifier)
        .bind(item.duration)
        .bind(item.ItemLimitCategory)
        .bind(item.HolidayId)
        .bind(&item.ScriptName)
        .bind(item.DisenchantID)
        .bind(item.FoodType)
        .bind(item.minMoneyLoot)
        .bind(item.maxMoneyLoot)
        .bind(item.flagsCustom)
        .bind(item.VerifiedBuild)
        .execute(pool)
        .await,
        item.entry, item.class, item.subclass, item.SoundOverrideSubclass, &item.name, item.displayid,
        item.Quality, item.Flags, item.FlagsExtra, item.BuyCount, item.BuyPrice, item.SellPrice,
        item.InventoryType, item.AllowableClass, item.AllowableRace, item.ItemLevel, item.RequiredLevel,
        item.RequiredSkill, item.RequiredSkillRank, item.requiredspell, item.requiredhonorrank,
        item.RequiredCityRank, item.RequiredReputationFaction, item.RequiredReputationRank,
        item.maxcount, item.stackable, item.ContainerSlots, item.StatsCount,
        item.stat_type1, item.stat_value1, item.stat_type2, item.stat_value2,
        item.stat_type3, item.stat_value3, item.stat_type4, item.stat_value4,
        item.stat_type5, item.stat_value5, item.stat_type6, item.stat_value6,
        item.stat_type7, item.stat_value7, item.stat_type8, item.stat_value8,
        item.stat_type9, item.stat_value9, item.stat_type10, item.stat_value10,
        item.ScalingStatDistribution, item.ScalingStatValue,
        item.dmg_min1, item.dmg_max1, item.dmg_type1, item.dmg_min2, item.dmg_max2, item.dmg_type2,
        item.armor, item.holy_res, item.fire_res, item.nature_res, item.frost_res, item.shadow_res,
        item.arcane_res, item.delay, item.ammo_type, item.RangedModRange,
        item.spellid_1, item.spelltrigger_1, item.spellcharges_1, item.spellppmRate_1,
        item.spellcooldown_1, item.spellcategory_1, item.spellcategorycooldown_1,
        item.spellid_2, item.spelltrigger_2, item.spellcharges_2, item.spellppmRate_2,
        item.spellcooldown_2, item.spellcategory_2, item.spellcategorycooldown_2,
        item.spellid_3, item.spelltrigger_3, item.spellcharges_3, item.spellppmRate_3,
        item.spellcooldown_3, item.spellcategory_3, item.spellcategorycooldown_3,
        item.spellid_4, item.spelltrigger_4, item.spellcharges_4, item.spellppmRate_4,
        item.spellcooldown_4, item.spellcategory_4, item.spellcategorycooldown_4,
        item.spellid_5, item.spelltrigger_5, item.spellcharges_5, item.spellppmRate_5,
        item.spellcooldown_5, item.spellcategory_5, item.spellcategorycooldown_5,
        item.bonding, &item.description, item.PageText, item.LanguageID, item.PageMaterial,
        item.startquest, item.lockid, item.Material, item.sheath,
        item.RandomProperty, item.RandomSuffix, item.block, item.itemset, item.MaxDurability,
        item.area, item.Map, item.BagFamily, item.TotemCategory,
        item.socketColor_1, item.socketContent_1, item.socketColor_2, item.socketContent_2,
        item.socketColor_3, item.socketContent_3, item.socketBonus, item.GemProperties,
        item.RequiredDisenchantSkill, item.ArmorDamageModifier, item.duration, item.ItemLimitCategory,
        item.HolidayId, &item.ScriptName, item.DisenchantID, item.FoodType,
        item.minMoneyLoot, item.maxMoneyLoot, item.flagsCustom, item.VerifiedBuild
    ).map_err(|e| format!("Failed to save item: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn delete_item(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    entry: u32,
) -> Result<(), String> {
    let db = state.pool.read().await;
    let pool = db.as_ref().ok_or("Not connected to database")?;

    const SQL: &str = "DELETE FROM item_template WHERE entry = ?";
    debug_sql!(app, debug, SQL,
        sqlx::query(SQL)
        .bind(entry)
        .execute(pool)
        .await,
        entry
    ).map_err(|e| format!("Failed to delete item: {}", e))?;

    Ok(())
}

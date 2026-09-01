use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use tauri::Manager;

use crate::minimap::MinimapState;

/// Spell name/icon index read from the client's `Spell.dbc`, plus the
/// read-only "info card" (`SpellDetail`) shown for one selected spell at a
/// time.
///
/// The world database has no `spell` table: a spell's identity (name, rank,
/// icon) lives client-side, and every `spell_*` table is just an overlay keyed
/// on a SpellID. So every spell editor needs this index to show anything but
/// raw numbers, and it is built from the same MPQ patch chain the map editor
/// and the model preview already use (see `minimap.rs`).
///
/// Pure parsing lives here; the state and the lazy cache live in `minimap.rs`,
/// mirroring how `liquids.rs` splits from it.

/// Localized string fields in a 3.3.5 DBC are 16 string-block offsets followed
/// by a flags field. Only the slot matching the installed locale MPQ is filled;
/// the others point at offset 0 (an empty string), which is why every read
/// takes the first non-empty slot rather than assuming enUS.
const LOCALE_SLOTS: usize = 16;

/// Byte offsets inside one `Spell.dbc` record (3.3.5a, build 12340).
///
/// Derived from TrinityCore's `SpellEntryfmt` in `DBCfmt.h`: a 234-character
/// format string, one character per 4-byte field, cross-checked field by
/// field against WoWDBDefs' named field order (each confirms the other: the
/// format string's `f`/`i`/`x`/`s` pattern lines up with every named field's
/// expected type at the position WoWDBDefs puts it — `Speed` lands on an `f`,
/// `SpellIconID` lands exactly on field 133, etc.).
const SPELL_RECORD_SIZE: usize = 234 * 4;
const OFF_CATEGORY: usize = 1 * 4;
const OFF_DISPEL_TYPE: usize = 2 * 4;
const OFF_MECHANIC: usize = 3 * 4;
const OFF_ATTRIBUTES: usize = 4 * 4;
const OFF_RECOVERY_TIME: usize = 29 * 4;
const OFF_CATEGORY_RECOVERY_TIME: usize = 30 * 4;
const OFF_PROC_CHANCE: usize = 35 * 4;
const OFF_PROC_CHARGES: usize = 36 * 4;
const OFF_MAX_LEVEL: usize = 37 * 4;
const OFF_BASE_LEVEL: usize = 38 * 4;
const OFF_SPELL_LEVEL: usize = 39 * 4;
const OFF_DURATION_INDEX: usize = 40 * 4;
const OFF_POWER_TYPE: usize = 41 * 4;
const OFF_MANA_COST: usize = 42 * 4;
const OFF_MANA_COST_PER_LEVEL: usize = 43 * 4;
const OFF_RANGE_INDEX: usize = 46 * 4;
const OFF_CASTING_TIME_INDEX: usize = 28 * 4;
const OFF_EFFECT: [usize; 3] = [71 * 4, 72 * 4, 73 * 4];
const OFF_EFFECT_BASE_POINTS: [usize; 3] = [80 * 4, 81 * 4, 82 * 4];
const OFF_IMPLICIT_TARGET_A: [usize; 3] = [86 * 4, 87 * 4, 88 * 4];
const OFF_SPELL_ICON_ID: usize = 133 * 4;
const OFF_NAME: usize = 136 * 4;
const OFF_RANK: usize = 153 * 4;
const OFF_SCHOOL_MASK: usize = 225 * 4;
/// `SpellClassSet`: which spell family this spell belongs to (0 = generic —
/// most NPC abilities — non-zero = a player class, e.g. 3 = Mage). Grouping
/// same-named spells by rank also needs this: two unrelated spells with an
/// identical name (very common among generic-family NPC abilities, e.g. a
/// dozen different creatures each having their own "Charge") must not merge
/// into one fake rank chain just because the name string matches.
const OFF_SPELL_CLASS_SET: usize = 208 * 4;
/// `EffectAura[3]` (a.k.a. EffectApplyAuraName): the `AuraType` each of the
/// spell's 3 effect slots applies, 0 when that slot isn't an aura effect.
/// There is no dedicated "this record is an aura" flag in the DBC — a spell
/// and an aura are the same kind of record, "aura" is just effects that
/// attach a buff/debuff rather than doing something immediate (damage,
/// heal, teleport…). Any non-zero slot means the spell applies at least one.
const OFF_EFFECT_AURA: [usize; 3] = [95 * 4, 96 * 4, 97 * 4];

/// `SPELL_ATTR0_PASSIVE` (TrinityCore `SpellDefines.h`): set on spells the
/// engine casts on the owner by itself rather than something a player casts
/// — talents, racials, most buffs granted by an item or another spell.
const ATTR0_PASSIVE: u32 = 0x00000040;

/// `SpellIcon.dbc` holds two fields: the icon id and a string-block offset to a
/// texture path such as `Interface\Icons\Spell_Fire_FlameBolt` — stored without
/// the `.blp` extension the file actually has.
const ICON_RECORD_SIZE: usize = 2 * 4;
const OFF_ICON_TEXTURE: usize = 4;

/// `SpellCastTime.dbc`: id, base cast time in milliseconds, two fields this
/// module doesn't need (per-level scaling, minimum). Record layout "nixx".
const CAST_TIME_RECORD_SIZE: usize = 4 * 4;
const OFF_CAST_TIME_BASE: usize = 1 * 4;

/// `SpellDuration.dbc`: id, base duration in milliseconds (the other two
/// fields are per-level scaling and a cap this module doesn't need). Record
/// layout "niii".
const DURATION_RECORD_SIZE: usize = 4 * 4;
const OFF_DURATION_BASE: usize = 1 * 4;

/// `SpellRange.dbc`: id, then `RangeMin`/`RangeMax` as `[hostile, friendly]`
/// float pairs. Only the hostile pair is read — the pair that matters for
/// "how far can this spell reach", the way the client's own tooltip shows
/// it. Record layout "nffffi" plus two unread localized name blocks.
const RANGE_RECORD_SIZE: usize = 6 * 4;
const OFF_RANGE_MIN_HOSTILE: usize = 1 * 4;
const OFF_RANGE_MAX_HOSTILE: usize = 3 * 4;

/// WDBC header: magic, record count, field count, record size, string-block
/// size — 5 u32s, so records start at byte 20.
const HEADER_SIZE: usize = 20;

/// One spell as the frontend sees it in a list (search results, resolved
/// names). Lean on purpose — `SpellDetail` below is the "read one spell's
/// full DBC record" counterpart, fetched only for whichever spell is open.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpellInfo {
    pub id: u32,
    pub name: String,
    /// `NameSubtext`: "Rank 3", "Passive"… Empty for most spells, but the only
    /// thing telling apart the dozen-odd rows that share a name.
    pub rank: String,
    /// Full MPQ path of the icon BLP, servable over the `blp://` scheme. Empty
    /// when the spell has no icon or `SpellIcon.dbc` could not be read.
    pub icon: String,
    /// `SpellClassSet`: 0 (generic) or a player class id. Exposed so the
    /// frontend's rank-chain grouping can key on name *and* family, not name
    /// alone — see `OFF_SPELL_CLASS_SET`.
    pub class_set: u32,
    /// Whether any of the spell's effects applies an aura (see
    /// `OFF_EFFECT_AURA`) — the "Spells" / "Auras" list filter.
    pub is_aura: bool,
}

/// One of a spell's 3 effect slots, raw — the frontend resolves `effectType`
/// / `auraType` to a name (TrinityCore's `SpellEffects` / `AuraType` enums
/// are large and change rarely enough that a generated lookup table living
/// in TypeScript, next to the rest of this module's display logic, is easier
/// to keep in sync than duplicating it in Rust).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpellEffectDetail {
    pub effect_type: u32,
    /// Signed: plenty of effects (snares, stat reductions…) carry a negative
    /// value.
    pub base_points: i32,
    /// 0 when this effect slot isn't an aura-applying one.
    pub aura_type: u32,
    pub implicit_target_a: u32,
}

/// The read-only "info card" for one spell — every `Spell.dbc` field this
/// module surfaces, plus the cast time / duration / range resolved from
/// their own small cross-reference DBCs (`SpellCastTime.dbc`,
/// `SpellDuration.dbc`, `SpellRange.dbc`) so the frontend shows seconds and
/// yards instead of meaningless index numbers.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpellDetail {
    pub id: u32,
    pub name: String,
    pub rank: String,
    pub icon: String,
    pub school_mask: u32,
    pub dispel_type: u32,
    pub mechanic: u32,
    pub class_set: u32,
    pub is_aura: bool,
    pub is_passive: bool,
    /// Signed: `POWER_HEALTH` is -2 (a handful of spells cost health).
    pub power_type: i32,
    pub mana_cost: u32,
    pub mana_cost_per_level: u32,
    pub recovery_time_ms: u32,
    pub category_recovery_time_ms: u32,
    pub category: u32,
    /// Percent, 0-100 (0 with `procCharges == 0` means "doesn't proc").
    pub proc_chance: u32,
    pub proc_charges: u32,
    pub spell_level: u32,
    pub base_level: u32,
    pub max_level: u32,
    /// 0 means instant cast — distinct from "index not found in the client's
    /// `SpellCastTime.dbc`", which is what a `None` resolved value means.
    pub casting_time_index: u32,
    pub cast_time_ms: Option<u32>,
    /// 0 means no duration (most direct-effect spells). Some rows store -1
    /// for "until cancelled" — kept signed so that survives.
    pub duration_index: u32,
    pub duration_ms: Option<i32>,
    /// 0 means melee range (no `SpellRange.dbc` lookup happens).
    pub range_index: u32,
    pub range_min: Option<f32>,
    pub range_max: Option<f32>,
    pub effects: [SpellEffectDetail; 3],
}

impl SpellDetail {
    fn to_info(&self) -> SpellInfo {
        SpellInfo {
            id: self.id,
            name: self.name.clone(),
            rank: self.rank.clone(),
            icon: self.icon.clone(),
            class_set: self.class_set,
            is_aura: self.is_aura,
        }
    }
}

/// The "Sorts" / "Auras" list filter. `None` (the default, not a variant)
/// means no filter — every spell.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SpellKind {
    Spell,
    Aura,
}

/// One indexed row: the full parsed record, plus its lowercased name
/// precomputed so a search does not re-lowercase ~49k names on every
/// keystroke.
struct IndexedSpell {
    detail: SpellDetail,
    name_lc: String,
}

/// Searchable spell table, built once per loaded client.
#[derive(Default)]
pub struct SpellIndex {
    /// Sorted by (name, id): search results come out stable and with a spell's
    /// ranks grouped together instead of in DBC order.
    entries: Vec<IndexedSpell>,
    by_id: HashMap<u32, usize>,
}

impl SpellIndex {
    pub fn len(&self) -> usize {
        self.entries.len()
    }

    /// Looks up ids, skipping the unknown ones.
    pub fn resolve(&self, ids: &[u32]) -> HashMap<u32, SpellInfo> {
        let mut out = HashMap::with_capacity(ids.len());
        for id in ids {
            if let Some(&i) = self.by_id.get(id) {
                out.insert(*id, self.entries[i].detail.to_info());
            }
        }
        out
    }

    /// The full read-only record for one spell (the "Info" tab).
    pub fn detail(&self, id: u32) -> Option<SpellDetail> {
        self.by_id.get(&id).map(|&i| self.entries[i].detail.clone())
    }

    /// Case-insensitive substring match on the name, optionally restricted to
    /// spells or auras (see `SpellKind`). A query that parses as a number puts
    /// that exact spell first (still subject to the `kind` filter), so typing
    /// a known id finds it even though ids are not substring-matched.
    pub fn search(&self, query: &str, limit: usize, kind: Option<SpellKind>) -> Vec<SpellInfo> {
        let matches_kind = |detail: &SpellDetail| match kind {
            None => true,
            Some(SpellKind::Spell) => !detail.is_aura,
            Some(SpellKind::Aura) => detail.is_aura,
        };

        let needle = query.trim().to_lowercase();
        let mut out: Vec<SpellInfo> = Vec::new();

        if let Some(&i) = needle.parse::<u32>().ok().and_then(|id| self.by_id.get(&id)) {
            if matches_kind(&self.entries[i].detail) {
                out.push(self.entries[i].detail.to_info());
            }
        }
        let exact_id = out.first().map(|s| s.id);

        for entry in &self.entries {
            if out.len() >= limit {
                break;
            }
            if Some(entry.detail.id) == exact_id {
                continue;
            }
            // An empty query lists the table from the top rather than nothing:
            // opening the picker should already show something browsable.
            if (needle.is_empty() || entry.name_lc.contains(&needle)) && matches_kind(&entry.detail) {
                out.push(entry.detail.to_info());
            }
        }
        out
    }
}

/// Builds the index. Every cross-reference DBC is parsed independently: a
/// broken or missing one costs only the data it carries (icons, cast time,
/// duration, range), never the spell names themselves.
pub fn build_index(
    spell_bytes: &[u8],
    icon_bytes: Option<&[u8]>,
    cast_time_bytes: Option<&[u8]>,
    duration_bytes: Option<&[u8]>,
    range_bytes: Option<&[u8]>,
) -> SpellIndex {
    let icons = icon_bytes.and_then(parse_spell_icons).unwrap_or_default();
    let cast_times = cast_time_bytes.map(parse_cast_times).unwrap_or_default();
    let durations = duration_bytes.map(parse_durations).unwrap_or_default();
    let ranges = range_bytes.map(parse_ranges).unwrap_or_default();

    let Some(spells) = parse_spells(spell_bytes, &icons, &cast_times, &durations, &ranges) else {
        log::warn!("spell_dbc: Spell.dbc could not be parsed, spell names unavailable");
        return SpellIndex::default();
    };

    let mut entries: Vec<IndexedSpell> = spells
        .into_iter()
        .map(|detail| {
            let name_lc = detail.name.to_lowercase();
            IndexedSpell { detail, name_lc }
        })
        .collect();
    entries.sort_by(|a, b| a.name_lc.cmp(&b.name_lc).then(a.detail.id.cmp(&b.detail.id)));

    let by_id = entries
        .iter()
        .enumerate()
        .map(|(i, entry)| (entry.detail.id, i))
        .collect();

    SpellIndex { entries, by_id }
}

/// `Spell.dbc` -> one `SpellDetail` per record. Only the fields this module
/// actually reads are parsed, so trailing fields added by a custom client are
/// simply ignored.
fn parse_spells(
    bytes: &[u8],
    icons: &HashMap<u32, String>,
    cast_times: &HashMap<u32, i32>,
    durations: &HashMap<u32, i32>,
    ranges: &HashMap<u32, (f32, f32)>,
) -> Option<Vec<SpellDetail>> {
    let (record_count, record_size, strings_start) = wdbc_header(bytes)?;
    // Custom clients append fields; anything shorter than the stock record has
    // shifted the name offsets and can only produce garbage.
    if record_size < SPELL_RECORD_SIZE {
        log::warn!(
            "spell_dbc: Spell.dbc record size {record_size} < expected {SPELL_RECORD_SIZE}, \
             skipping (client not 3.3.5a?)"
        );
        return None;
    }

    let i32_at = |off: usize| -> i32 { u32_at(bytes, off).unwrap_or(0) as i32 };
    let u32_at0 = |off: usize| -> u32 { u32_at(bytes, off).unwrap_or(0) };

    let mut out = Vec::with_capacity(record_count);
    for record in 0..record_count {
        let base = HEADER_SIZE + record * record_size;
        let Some(id) = u32_at(bytes, base) else { continue };
        let name = localized_string(bytes, strings_start, base + OFF_NAME).unwrap_or_default();
        let rank = localized_string(bytes, strings_start, base + OFF_RANK).unwrap_or_default();
        let icon = u32_at(bytes, base + OFF_SPELL_ICON_ID)
            .and_then(|icon_id| icons.get(&icon_id))
            .cloned()
            .unwrap_or_default();
        let class_set = u32_at0(base + OFF_SPELL_CLASS_SET);
        let attributes = u32_at0(base + OFF_ATTRIBUTES);

        let effect_aura: [u32; 3] = std::array::from_fn(|i| u32_at0(base + OFF_EFFECT_AURA[i]));
        let is_aura = effect_aura.iter().any(|&a| a != 0);
        let effects: [SpellEffectDetail; 3] = std::array::from_fn(|i| SpellEffectDetail {
            effect_type: u32_at0(base + OFF_EFFECT[i]),
            base_points: i32_at(base + OFF_EFFECT_BASE_POINTS[i]),
            aura_type: effect_aura[i],
            implicit_target_a: u32_at0(base + OFF_IMPLICIT_TARGET_A[i]),
        });

        let casting_time_index = u32_at0(base + OFF_CASTING_TIME_INDEX);
        let cast_time_ms = (casting_time_index != 0)
            .then(|| cast_times.get(&casting_time_index).map(|&ms| ms.max(0) as u32))
            .flatten();
        let duration_index = u32_at0(base + OFF_DURATION_INDEX);
        let duration_ms = (duration_index != 0)
            .then(|| durations.get(&duration_index).copied())
            .flatten();
        let range_index = u32_at0(base + OFF_RANGE_INDEX);
        let range = (range_index != 0).then(|| ranges.get(&range_index).copied()).flatten();

        out.push(SpellDetail {
            id,
            name,
            rank,
            icon,
            school_mask: u32_at0(base + OFF_SCHOOL_MASK),
            dispel_type: u32_at0(base + OFF_DISPEL_TYPE),
            mechanic: u32_at0(base + OFF_MECHANIC),
            class_set,
            is_aura,
            is_passive: attributes & ATTR0_PASSIVE != 0,
            power_type: i32_at(base + OFF_POWER_TYPE),
            mana_cost: u32_at0(base + OFF_MANA_COST),
            mana_cost_per_level: u32_at0(base + OFF_MANA_COST_PER_LEVEL),
            recovery_time_ms: u32_at0(base + OFF_RECOVERY_TIME),
            category_recovery_time_ms: u32_at0(base + OFF_CATEGORY_RECOVERY_TIME),
            category: u32_at0(base + OFF_CATEGORY),
            proc_chance: u32_at0(base + OFF_PROC_CHANCE),
            proc_charges: u32_at0(base + OFF_PROC_CHARGES),
            spell_level: u32_at0(base + OFF_SPELL_LEVEL),
            base_level: u32_at0(base + OFF_BASE_LEVEL),
            max_level: u32_at0(base + OFF_MAX_LEVEL),
            casting_time_index,
            cast_time_ms,
            duration_index,
            duration_ms,
            range_index,
            range_min: range.map(|(min, _)| min),
            range_max: range.map(|(_, max)| max),
            effects,
        });
    }
    Some(out)
}

/// `SpellIcon.dbc` -> icon id to full BLP path. Rows with no texture are
/// dropped so callers can treat an absent entry as "no icon".
fn parse_spell_icons(bytes: &[u8]) -> Option<HashMap<u32, String>> {
    let (record_count, record_size, strings_start) = wdbc_header(bytes)?;
    if record_size < ICON_RECORD_SIZE {
        return None;
    }

    let mut out = HashMap::with_capacity(record_count);
    for record in 0..record_count {
        let base = HEADER_SIZE + record * record_size;
        let Some(id) = u32_at(bytes, base) else { continue };
        let texture = string_at(bytes, strings_start, base + OFF_ICON_TEXTURE).unwrap_or_default();
        if texture.is_empty() {
            continue;
        }
        // The DBC stores the path without an extension; the file is a BLP.
        out.insert(id, format!("{texture}.blp"));
    }
    Some(out)
}

/// `SpellCastTime.dbc` -> id to base cast time in milliseconds.
fn parse_cast_times(bytes: &[u8]) -> HashMap<u32, i32> {
    parse_simple_ref_dbc(bytes, CAST_TIME_RECORD_SIZE, OFF_CAST_TIME_BASE)
}

/// `SpellDuration.dbc` -> id to base duration in milliseconds.
fn parse_durations(bytes: &[u8]) -> HashMap<u32, i32> {
    parse_simple_ref_dbc(bytes, DURATION_RECORD_SIZE, OFF_DURATION_BASE)
}

/// Shared reader for the two small `id -> single int32` cross-reference DBCs.
fn parse_simple_ref_dbc(bytes: &[u8], record_size_min: usize, value_off: usize) -> HashMap<u32, i32> {
    let mut out = HashMap::new();
    let Some((record_count, record_size, _)) = wdbc_header(bytes) else { return out };
    if record_size < record_size_min {
        return out;
    }
    for record in 0..record_count {
        let base = HEADER_SIZE + record * record_size;
        let (Some(id), Some(value)) = (u32_at(bytes, base), u32_at(bytes, base + value_off)) else {
            continue;
        };
        out.insert(id, value as i32);
    }
    out
}

/// `SpellRange.dbc` -> id to (min, max) hostile range in yards.
fn parse_ranges(bytes: &[u8]) -> HashMap<u32, (f32, f32)> {
    let mut out = HashMap::new();
    let Some((record_count, record_size, _)) = wdbc_header(bytes) else { return out };
    if record_size < RANGE_RECORD_SIZE {
        return out;
    }
    let f32_at = |offset: usize| -> Option<f32> {
        Some(f32::from_le_bytes(bytes.get(offset..offset + 4)?.try_into().ok()?))
    };
    for record in 0..record_count {
        let base = HEADER_SIZE + record * record_size;
        let (Some(id), Some(min), Some(max)) = (
            u32_at(bytes, base),
            f32_at(base + OFF_RANGE_MIN_HOSTILE),
            f32_at(base + OFF_RANGE_MAX_HOSTILE),
        ) else {
            continue;
        };
        out.insert(id, (min, max));
    }
    out
}

/// Validates the WDBC header and returns (record count, record size, offset of
/// the string block).
fn wdbc_header(bytes: &[u8]) -> Option<(usize, usize, usize)> {
    if bytes.get(..4)? != b"WDBC" {
        return None;
    }
    let record_count = u32_at(bytes, 4)? as usize;
    let record_size = u32_at(bytes, 12)? as usize;
    let strings_start = HEADER_SIZE + record_count * record_size;
    if record_size == 0 || bytes.len() < strings_start {
        return None;
    }
    Some((record_count, record_size, strings_start))
}

fn u32_at(bytes: &[u8], offset: usize) -> Option<u32> {
    Some(u32::from_le_bytes(bytes.get(offset..offset + 4)?.try_into().ok()?))
}

/// Reads the string a string-block offset field points at.
fn string_at(bytes: &[u8], strings_start: usize, offset_field: usize) -> Option<String> {
    let tail = bytes.get(strings_start + u32_at(bytes, offset_field)? as usize..)?;
    let end = tail.iter().position(|&b| b == 0).unwrap_or(tail.len());
    Some(String::from_utf8_lossy(&tail[..end]).into_owned())
}

/// Reads a localized `_lang` field: the first non-empty of its 16 locale slots.
/// A frFR client fills slot 2 and a enUS one slot 0, so picking by position
/// would blank out every non-English install.
fn localized_string(bytes: &[u8], strings_start: usize, base: usize) -> Option<String> {
    (0..LOCALE_SLOTS)
        .filter_map(|slot| string_at(bytes, strings_start, base + slot * 4))
        .find(|s| !s.is_empty())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Assembles a WDBC file from fixed-size records and a string block.
    fn wdbc(record_size: usize, records: &[Vec<u8>], strings: &[u8]) -> Vec<u8> {
        let mut out = Vec::new();
        out.extend_from_slice(b"WDBC");
        out.extend_from_slice(&(records.len() as u32).to_le_bytes());
        out.extend_from_slice(&((record_size / 4) as u32).to_le_bytes());
        out.extend_from_slice(&(record_size as u32).to_le_bytes());
        out.extend_from_slice(&(strings.len() as u32).to_le_bytes());
        for record in records {
            assert_eq!(record.len(), record_size);
            out.extend_from_slice(record);
        }
        out.extend_from_slice(strings);
        out
    }

    /// A DBC string block always opens with a NUL, so offset 0 reads as "" —
    /// which is exactly what the unused locale slots point at.
    #[derive(Default)]
    struct Strings(Vec<u8>);

    impl Strings {
        fn new() -> Self {
            Self(vec![0])
        }

        fn push(&mut self, value: &str) -> u32 {
            let offset = self.0.len() as u32;
            self.0.extend_from_slice(value.as_bytes());
            self.0.push(0);
            offset
        }
    }

    fn put(record: &mut [u8], offset: usize, value: u32) {
        record[offset..offset + 4].copy_from_slice(&value.to_le_bytes());
    }

    fn put_i32(record: &mut [u8], offset: usize, value: i32) {
        put(record, offset, value as u32);
    }

    fn put_f32(record: &mut [u8], offset: usize, value: f32) {
        record[offset..offset + 4].copy_from_slice(&value.to_le_bytes());
    }

    /// Two spells: an English one filling locale slot 0, and a French one
    /// filling slot 2 — a frFR client leaves slot 0 empty, and reading it
    /// blindly is the mistake this guards against. Plus a third, same-named
    /// "Charge" pair — one Warrior-family direct effect, one generic-family
    /// aura — covering the class_set/is_aura fields, and a fourth spell
    /// ("Frostbolt"-adjacent id 200) covering every other detail field:
    /// school, dispel, mechanic, passive, costs, cooldown, level, proc,
    /// cast time / duration / range resolved through their cross-ref DBCs,
    /// and one full effect slot.
    fn sample_index() -> SpellIndex {
        let mut strings = Strings::new();
        let fireball = strings.push("Fireball");
        let rank_one = strings.push("Rank 1");
        let frostbolt_fr = strings.push("Éclair de givre");
        let charge = strings.push("Charge");
        let detailed = strings.push("Detailed Spell");

        let mut fire = vec![0u8; SPELL_RECORD_SIZE];
        put(&mut fire, 0, 133);
        put(&mut fire, OFF_SPELL_ICON_ID, 26);
        put(&mut fire, OFF_NAME, fireball);
        put(&mut fire, OFF_RANK, rank_one);

        let mut frost = vec![0u8; SPELL_RECORD_SIZE];
        put(&mut frost, 0, 116);
        put(&mut frost, OFF_NAME + 2 * 4, frostbolt_fr);

        // Warrior "Charge": direct effect, no aura, SpellClassSet = 4 (Warrior).
        let mut warrior_charge = vec![0u8; SPELL_RECORD_SIZE];
        put(&mut warrior_charge, 0, 100);
        put(&mut warrior_charge, OFF_NAME, charge);
        put(&mut warrior_charge, OFF_SPELL_CLASS_SET, 4);

        // A generic NPC "Charge": same name, family 0, and it roots the
        // target — an aura effect (SPELL_AURA_MOD_ROOT = 26), so EffectAura[0]
        // is non-zero.
        let mut npc_charge = vec![0u8; SPELL_RECORD_SIZE];
        put(&mut npc_charge, 0, 101);
        put(&mut npc_charge, OFF_NAME, charge);
        put(&mut npc_charge, OFF_EFFECT_AURA[0], 26);

        // The detail-coverage spell: id 200, every field this module reads.
        let mut detail = vec![0u8; SPELL_RECORD_SIZE];
        put(&mut detail, 0, 200);
        put(&mut detail, OFF_NAME, detailed);
        put(&mut detail, OFF_SCHOOL_MASK, 4); // SchoolMask: Fire (1 << 2)
        put(&mut detail, OFF_DISPEL_TYPE, 1); // DISPEL_MAGIC
        put(&mut detail, OFF_MECHANIC, 12); // MECHANIC_STUN
        put(&mut detail, OFF_ATTRIBUTES, ATTR0_PASSIVE);
        put(&mut detail, OFF_POWER_TYPE, 0); // POWER_MANA
        put(&mut detail, OFF_MANA_COST, 50);
        put(&mut detail, OFF_MANA_COST_PER_LEVEL, 1);
        put(&mut detail, OFF_RECOVERY_TIME, 8_000);
        put(&mut detail, OFF_CATEGORY_RECOVERY_TIME, 1_500);
        put(&mut detail, OFF_CATEGORY, 133);
        put(&mut detail, OFF_PROC_CHANCE, 10);
        put(&mut detail, OFF_PROC_CHARGES, 5);
        put(&mut detail, OFF_SPELL_LEVEL, 20);
        put(&mut detail, OFF_BASE_LEVEL, 20);
        put(&mut detail, OFF_MAX_LEVEL, 60);
        put(&mut detail, OFF_CASTING_TIME_INDEX, 5);
        put(&mut detail, OFF_DURATION_INDEX, 7);
        put(&mut detail, OFF_RANGE_INDEX, 3);
        put(&mut detail, OFF_EFFECT[0], 2); // SPELL_EFFECT_SCHOOL_DAMAGE
        put_i32(&mut detail, OFF_EFFECT_BASE_POINTS[0], -49);
        put(&mut detail, OFF_IMPLICIT_TARGET_A[0], 6);

        let spells = wdbc(
            SPELL_RECORD_SIZE,
            &[fire, frost, warrior_charge, npc_charge, detail],
            &strings.0,
        );

        let mut icon_strings = Strings::new();
        let texture = icon_strings.push("Interface\\Icons\\Spell_Fire_FlameBolt");
        let mut icon = vec![0u8; ICON_RECORD_SIZE];
        put(&mut icon, 0, 26);
        put(&mut icon, OFF_ICON_TEXTURE, texture);
        let icons = wdbc(ICON_RECORD_SIZE, &[icon], &icon_strings.0);

        let mut cast_time = vec![0u8; CAST_TIME_RECORD_SIZE];
        put(&mut cast_time, 0, 5);
        put_i32(&mut cast_time, OFF_CAST_TIME_BASE, 2_500);
        let cast_times = wdbc(CAST_TIME_RECORD_SIZE, &[cast_time], &[0]);

        let mut duration = vec![0u8; DURATION_RECORD_SIZE];
        put(&mut duration, 0, 7);
        put_i32(&mut duration, OFF_DURATION_BASE, 15_000);
        let durations = wdbc(DURATION_RECORD_SIZE, &[duration], &[0]);

        let mut range = vec![0u8; RANGE_RECORD_SIZE];
        put(&mut range, 0, 3);
        put_f32(&mut range, OFF_RANGE_MIN_HOSTILE, 0.0);
        put_f32(&mut range, OFF_RANGE_MAX_HOSTILE, 30.0);
        let ranges = wdbc(RANGE_RECORD_SIZE, &[range], &[0]);

        build_index(&spells, Some(&icons), Some(&cast_times), Some(&durations), Some(&ranges))
    }

    #[test]
    fn reads_name_rank_and_icon_at_the_expected_offsets() {
        let resolved = sample_index().resolve(&[133]);
        let spell = &resolved[&133];
        assert_eq!(spell.name, "Fireball");
        assert_eq!(spell.rank, "Rank 1");
        // The DBC stores the path without an extension.
        assert_eq!(spell.icon, "Interface\\Icons\\Spell_Fire_FlameBolt.blp");
    }

    #[test]
    fn falls_back_to_whichever_locale_slot_is_filled() {
        let resolved = sample_index().resolve(&[116]);
        assert_eq!(resolved[&116].name, "Éclair de givre");
        // No rank and no icon id: both stay empty rather than reading garbage.
        assert_eq!(resolved[&116].rank, "");
        assert_eq!(resolved[&116].icon, "");
    }

    #[test]
    fn search_matches_names_case_insensitively_and_ids_exactly() {
        let index = sample_index();
        assert_eq!(index.search("FIRE", 10, None).len(), 1);
        assert_eq!(index.search("fire", 10, None)[0].id, 133);
        // A numeric query surfaces that exact spell first…
        assert_eq!(index.search("116", 10, None)[0].id, 116);
        // …and an empty query lists everything, so the picker opens browsable.
        assert_eq!(index.search("", 10, None).len(), 5);
        assert!(index.search("nothing matches this", 10, None).is_empty());
    }

    #[test]
    fn unknown_ids_are_omitted_rather_than_faked() {
        assert!(sample_index().resolve(&[999_999]).is_empty());
    }

    #[test]
    fn reads_class_set_and_flags_aura_effects() {
        let resolved = sample_index().resolve(&[100, 101]);
        // Warrior "Charge": a direct effect, no aura, its own family.
        assert_eq!(resolved[&100].class_set, 4);
        assert!(!resolved[&100].is_aura);
        // The NPC "Charge": generic family, and an aura effect makes it one —
        // same name as the Warrior spell, but a different id entirely, which
        // is exactly the false-grouping risk `class_set` exists to catch.
        assert_eq!(resolved[&101].class_set, 0);
        assert!(resolved[&101].is_aura);
    }

    #[test]
    fn search_filters_by_kind() {
        let index = sample_index();
        let spells = index.search("charge", 10, Some(SpellKind::Spell));
        assert_eq!(spells.len(), 1);
        assert_eq!(spells[0].id, 100);

        let auras = index.search("charge", 10, Some(SpellKind::Aura));
        assert_eq!(auras.len(), 1);
        assert_eq!(auras[0].id, 101);

        // No filter: both "Charge" spells come back.
        assert_eq!(index.search("charge", 10, None).len(), 2);
    }

    #[test]
    fn detail_reads_every_field_at_the_expected_offset() {
        let d = sample_index().detail(200).expect("spell 200 should exist");
        assert_eq!(d.name, "Detailed Spell");
        assert_eq!(d.school_mask, 4);
        assert_eq!(d.dispel_type, 1);
        assert_eq!(d.mechanic, 12);
        assert!(d.is_passive);
        assert_eq!(d.power_type, 0);
        assert_eq!(d.mana_cost, 50);
        assert_eq!(d.mana_cost_per_level, 1);
        assert_eq!(d.recovery_time_ms, 8_000);
        assert_eq!(d.category_recovery_time_ms, 1_500);
        assert_eq!(d.category, 133);
        assert_eq!(d.proc_chance, 10);
        assert_eq!(d.proc_charges, 5);
        assert_eq!(d.spell_level, 20);
        assert_eq!(d.base_level, 20);
        assert_eq!(d.max_level, 60);
        assert_eq!(d.effects[0].effect_type, 2);
        assert_eq!(d.effects[0].base_points, -49);
        assert_eq!(d.effects[0].implicit_target_a, 6);
        // Unset effect slots stay zeroed, not garbage.
        assert_eq!(d.effects[1].effect_type, 0);
        assert_eq!(d.effects[2].effect_type, 0);
    }

    #[test]
    fn resolves_cast_time_duration_and_range_through_their_own_dbcs() {
        let d = sample_index().detail(200).unwrap();
        assert_eq!(d.casting_time_index, 5);
        assert_eq!(d.cast_time_ms, Some(2_500));
        assert_eq!(d.duration_index, 7);
        assert_eq!(d.duration_ms, Some(15_000));
        assert_eq!(d.range_index, 3);
        assert_eq!(d.range_min, Some(0.0));
        assert_eq!(d.range_max, Some(30.0));

        // Index 0 (instant / no duration / melee) never looks anything up,
        // and an index the cross-ref DBC doesn't have resolves to None
        // rather than a wrong value.
        let fireball = sample_index().detail(133).unwrap();
        assert_eq!(fireball.casting_time_index, 0);
        assert_eq!(fireball.cast_time_ms, None);
    }

    #[test]
    fn refuses_a_record_layout_it_cannot_read() {
        // A client whose records are shorter than 3.3.5a's has different name
        // offsets; producing garbage names would be worse than producing none.
        let short = wdbc(64, &[vec![0u8; 64]], &[0]);
        assert_eq!(build_index(&short, None, None, None, None).len(), 0);
        assert_eq!(build_index(b"not a dbc at all", None, None, None, None).len(), 0);
    }
}

/// Searches the client's spells by name, or by exact id when the query is a
/// number, optionally restricted to spells or auras. Errors while no client
/// is loaded.
#[tauri::command]
pub async fn client_spell_search(
    app: tauri::AppHandle,
    search: String,
    limit: Option<usize>,
    kind: Option<SpellKind>,
) -> Result<Vec<SpellInfo>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<MinimapState>();
        Ok(state.spell_index()?.search(&search, limit.unwrap_or(200), kind))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Resolves spell ids to their client name/rank/icon, the spell twin of
/// `minimap_creature_models`. The DBC is parsed once and cached, so repeat
/// calls are map lookups. Unknown ids are omitted from the result.
#[tauri::command]
pub async fn client_spell_names(
    app: tauri::AppHandle,
    ids: Vec<u32>,
) -> Result<HashMap<u32, SpellInfo>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<MinimapState>();
        Ok(state.spell_index()?.resolve(&ids))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// The full read-only "Info" tab record for one spell. `None` if the id isn't
/// in the client's `Spell.dbc`.
#[tauri::command]
pub async fn client_spell_detail(
    app: tauri::AppHandle,
    entry: u32,
) -> Result<Option<SpellDetail>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<MinimapState>();
        Ok(state.spell_index()?.detail(entry))
    })
    .await
    .map_err(|e| e.to_string())?
}

use std::collections::{BTreeMap, HashMap};

use serde::{Deserialize, Serialize};

use crate::wmo::to_m2_path;

/// Creature display resolution: from a display id to what the renderer needs
/// to draw that creature the way the 3.3.5 client does.
///
/// Ordinary creatures are one M2 plus up to three monster skins. Humanoid NPCs
/// are built on the player character models instead (HumanMale.m2 and
/// friends), and CreatureDisplayInfoExtra dresses them: a pre-baked body
/// texture, a hairstyle and facial hair, and eleven worn items. Those items
/// show in three ways, all resolved here:
/// - painted into the baked body texture (shirt, chest, legs…), which the
///   bake already covers;
/// - as geometry variants of the body model — geosets — such as boots, glove
///   cuffs, a tabard, a robe skirt, a cape, and the hair and ears a helm
///   hides;
/// - as separate models hung on the body's attachment points: the helm and
///   the two shoulder pads.
///
/// Field layouts are 3.3.5a (build 12340). Every table but the first two is
/// optional: a missing one only leaves its part of the look out.

/// M2 texture components (M2Texture.type) a creature display fills in.
pub const COMPONENT_BODY: u32 = 1;
pub const COMPONENT_CAPE: u32 = 2;
pub const COMPONENT_HAIR: u32 = 6;
pub const COMPONENT_SKIN_EXTRA: u32 = 8;
pub const COMPONENT_MONSTER_1: u32 = 11;

/// M2 attachment ids the worn items hang from.
const ATTACH_SHOULDER_RIGHT: u32 = 5;
const ATTACH_SHOULDER_LEFT: u32 = 6;
const ATTACH_HELM: u32 = 11;

/// CreatureDisplayInfoExtra item slots (NPCItemDisplay order).
const SLOT_HELM: usize = 0;
const SLOT_SHOULDER: usize = 1;
const SLOT_SHIRT: usize = 2;
const SLOT_CHEST: usize = 3;
const SLOT_BELT: usize = 4;
const SLOT_LEGS: usize = 5;
const SLOT_BOOTS: usize = 6;
const SLOT_GLOVES: usize = 8;
const SLOT_TABARD: usize = 9;
const SLOT_CAPE: usize = 10;
const ITEM_SLOTS: usize = 11;

/// CharSections.BaseSection values used here.
const SECTION_SKIN: u32 = 0;
const SECTION_HAIR: u32 = 3;

/// Geoset groups 1-18 get a variant each; group 0 (the hairstyles) is
/// handled on its own, since geoset 0 is the body itself.
const GEOSET_GROUPS: usize = 19;
/// The group-0 geoset closing the top of the head when no hair is drawn —
/// bald, or hidden under a helm. Hairstyles are 2 and up (CharHairGeosets).
const BALD_CAP_GEOSET: u32 = 1;

/// The client asset needed to render one creature display.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CreatureModelInfo {
    /// `.m2` model path (served over the `mpq://` scheme).
    pub model: String,
    /// CreatureDisplayInfo × CreatureModelData scale; `creature_template.scale`
    /// is applied on top by the client.
    pub scale: f32,
    /// BLPs for the M2's runtime texture slots, keyed by texture component:
    /// the M2 names these slots only by kind (body, cape, hair, monster skin…),
    /// leaving the image to the display. Slots left out stay black.
    pub textures: BTreeMap<u32, String>,
    /// How a humanoid NPC is dressed; `None` for ordinary creatures.
    pub character: Option<CharacterAppearance>,
}

/// The CreatureDisplayInfoExtra look, resolved against the item and character
/// tables.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CharacterAppearance {
    /// Geoset ids to draw on top of the body (geoset 0, always drawn); every
    /// other geoset of the model stays hidden.
    pub geosets: Vec<u32>,
    /// Item models to hang on the body's attachment points.
    pub attachments: Vec<ItemAttachment>,
}

/// One worn item drawn as its own model (helm, shoulder pad).
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ItemAttachment {
    /// M2 attachment id on the body model.
    pub point: u32,
    /// `.m2` path of the item model.
    pub model: String,
    /// BLP for the item model's object-skin slot ('' when the item has none).
    pub texture: String,
}

/// An M2 attachment point: where on the skeleton an attached model hangs.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AttachmentPoint {
    pub id: u32,
    /// Index into the model's bones.
    pub bone: u16,
    /// Offset from the bone, in bind-pose model space.
    pub position: [f32; 3],
}

/// The client DBCs a creature display is composed from.
pub struct CreatureDbcs<'a> {
    pub display_info: &'a [u8],
    pub model_data: &'a [u8],
    pub display_info_extra: Option<&'a [u8]>,
    pub item_display_info: Option<&'a [u8]>,
    pub helmet_geoset_vis: Option<&'a [u8]>,
    pub hair_geosets: Option<&'a [u8]>,
    pub facial_hair_styles: Option<&'a [u8]>,
    pub char_sections: Option<&'a [u8]>,
    pub chr_races: Option<&'a [u8]>,
}

/// Every creature display id -> renderable model.
pub fn build_creature_models(dbcs: &CreatureDbcs) -> HashMap<u32, CreatureModelInfo> {
    let displays = parse_display_info(dbcs.display_info);
    let models = parse_model_data(dbcs.model_data);
    let extras = dbcs.display_info_extra.map(parse_extra).unwrap_or_default();
    let tables = CharacterTables::parse(dbcs);

    let mut out = HashMap::with_capacity(displays.len());
    for (display_id, display) in displays {
        let Some((path, model_scale)) = models.get(&display.model_data_id) else {
            continue;
        };
        if path.is_empty() {
            continue;
        }
        let mut textures = BTreeMap::new();
        // TextureVariation entries are bare file names next to the M2, for
        // the monster-skin slots 1-3 in order.
        let dir = &path[..path.rfind(['\\', '/']).map_or(0, |i| i + 1)];
        for (i, variation) in display.variations.iter().enumerate() {
            if !variation.is_empty() {
                textures.insert(COMPONENT_MONSTER_1 + i as u32, format!("{dir}{variation}.blp"));
            }
        }
        let character = extras
            .get(&display.extended_id)
            .map(|extra| tables.dress(extra, &mut textures));
        out.insert(
            display_id,
            CreatureModelInfo {
                model: path.clone(),
                scale: display.scale * model_scale,
                textures,
                character,
            },
        );
    }
    out
}

/// Attachment points of a WotLK (version 264) M2 file. Empty for anything
/// else: older headers put the table elsewhere, and 3.3.5 ships only 264.
pub fn parse_m2_attachments(bytes: &[u8]) -> Vec<AttachmentPoint> {
    const HEADER_ATTACHMENTS: usize = 240;
    const RECORD_SIZE: usize = 40;
    let u32_at = |o: usize| -> Option<u32> {
        Some(u32::from_le_bytes(bytes.get(o..o + 4)?.try_into().ok()?))
    };
    let f32_at = |o: usize| u32_at(o).map(f32::from_bits);
    if bytes.get(..4) != Some(b"MD20") || u32_at(4).map_or(true, |v| v < 264) {
        return Vec::new();
    }
    let (Some(count), Some(offset)) = (u32_at(HEADER_ATTACHMENTS), u32_at(HEADER_ATTACHMENTS + 4))
    else {
        return Vec::new();
    };
    (0..count as usize)
        .map_while(|i| {
            let base = offset as usize + i * RECORD_SIZE;
            let id = u32_at(base)?;
            let bone = u16::from_le_bytes(bytes.get(base + 4..base + 6)?.try_into().ok()?);
            let position = [f32_at(base + 8)?, f32_at(base + 12)?, f32_at(base + 16)?];
            Some(AttachmentPoint { id, bone, position })
        })
        .collect()
}

// ---------------------------------------------------------------------------
// Composition

/// The character/item tables a humanoid NPC's look is resolved against.
#[derive(Default)]
struct CharacterTables {
    items: HashMap<u32, ItemDisplay>,
    /// HelmetGeosetVisData id -> race bitmasks hiding hair, facial hair 1-3
    /// and ears, in that order.
    helmet_vis: HashMap<u32, [u32; 5]>,
    /// (race, sex, hair style) -> hairstyle geoset (0 = bald).
    hair_geosets: HashMap<(u32, u32, u32), u32>,
    /// (race, sex, facial hair style) -> variants of geoset groups 1, 3, 2
    /// (the DBC's own column order).
    facial_hair: HashMap<(u32, u32, u32), [u32; 3]>,
    /// (race, sex, section, variation, color) -> TextureName[0..3].
    sections: HashMap<(u32, u32, u32, u32, u32), [String; 3]>,
    /// Race id -> ClientPrefix ("Hu", "Or"…), which names helm models.
    race_prefix: HashMap<u32, String>,
}

impl CharacterTables {
    fn parse(dbcs: &CreatureDbcs) -> Self {
        Self {
            items: dbcs.item_display_info.map(parse_item_display_info).unwrap_or_default(),
            helmet_vis: dbcs.helmet_geoset_vis.map(parse_helmet_vis).unwrap_or_default(),
            hair_geosets: dbcs.hair_geosets.map(parse_hair_geosets).unwrap_or_default(),
            facial_hair: dbcs.facial_hair_styles.map(parse_facial_hair).unwrap_or_default(),
            sections: dbcs.char_sections.map(parse_char_sections).unwrap_or_default(),
            race_prefix: dbcs.chr_races.map(parse_race_prefixes).unwrap_or_default(),
        }
    }

    fn section(&self, extra: &Extra, section: u32, variation: u32, color: u32) -> Option<&[String; 3]> {
        self.sections.get(&(extra.race, extra.sex, section, variation, color))
    }

    /// Resolves one CreatureDisplayInfoExtra record: fills the body, hair,
    /// fur and cape texture slots and returns the geosets and item models.
    fn dress(&self, extra: &Extra, textures: &mut BTreeMap<u32, String>) -> CharacterAppearance {
        let item = |slot: usize| match extra.items[slot] {
            0 => None,
            id => self.items.get(&id),
        };
        let skin = self.section(extra, SECTION_SKIN, 0, extra.skin);

        // Textures. The bake is the whole body composited once by Blizzard —
        // skin, face, underwear and every armor piece painted on — so it
        // stands in for all of them; the bare skin is only a fallback for the
        // handful of records without one.
        let body = if extra.bake.is_empty() {
            skin.map(|s| s[0].clone()).unwrap_or_default()
        } else {
            format!("textures\\BakedNpcTextures\\{}", extra.bake)
        };
        insert_texture(textures, COMPONENT_BODY, body);
        insert_texture(textures, COMPONENT_SKIN_EXTRA, skin.map(|s| s[1].clone()).unwrap_or_default());
        let hair = self.section(extra, SECTION_HAIR, extra.hair_style, extra.hair_color);
        insert_texture(textures, COMPONENT_HAIR, hair.map(|s| s[0].clone()).unwrap_or_default());
        if let Some(cape) = item(SLOT_CAPE).filter(|c| !c.textures[0].is_empty()) {
            let path = format!("Item\\ObjectComponents\\Cape\\{}.blp", cape.textures[0]);
            textures.insert(COMPONENT_CAPE, path);
        }

        // Geosets: every group starts on its 01 variant — the bare look —
        // and ears are shown. A variant of 0 draws none of the group.
        let mut variant = [1u32; GEOSET_GROUPS];
        variant[7] = 2;
        // No CharHairGeosets row (a race the table doesn't know): keep the
        // model's first group-0 variant rather than guess a hairstyle.
        let mut hair_geoset = match self.hair_geosets.get(&(extra.race, extra.sex, extra.hair_style)) {
            Some(0) | None => BALD_CAP_GEOSET,
            Some(&geoset) => geoset,
        };
        if let Some(&[g1, g3, g2]) = self.facial_hair.get(&(extra.race, extra.sex, extra.facial_hair)) {
            variant[1] = g1;
            variant[2] = g2;
            variant[3] = g3;
        }

        // Items select variant `1 + GeosetGroup[i]` of their groups. A zero
        // leaves the group to whatever else is worn, so the order below is the
        // precedence: legs before chest, so a robe's skirt wins over trousers.
        let mut wear = |group: usize, value: u32| {
            if value > 0 {
                variant[group] = 1 + value;
            }
        };
        if let Some(shirt) = item(SLOT_SHIRT) {
            wear(8, shirt.geosets[0]);
            wear(10, shirt.geosets[1]);
        }
        if let Some(legs) = item(SLOT_LEGS) {
            wear(11, legs.geosets[0]);
            wear(9, legs.geosets[1]);
            wear(13, legs.geosets[2]);
        }
        if let Some(chest) = item(SLOT_CHEST) {
            wear(8, chest.geosets[0]);
            wear(10, chest.geosets[1]);
            wear(13, chest.geosets[2]);
        }
        if let Some(boots) = item(SLOT_BOOTS) {
            wear(5, boots.geosets[0]);
        }
        if let Some(belt) = item(SLOT_BELT) {
            wear(18, belt.geosets[0]);
        }
        if let Some(tabard) = item(SLOT_TABARD) {
            wear(12, tabard.geosets[0]);
        }
        if let Some(cape) = item(SLOT_CAPE) {
            wear(15, cape.geosets[0]);
        }
        // Overlaps, as the community model viewers resolve them: glove cuffs
        // replace sleeve flares, and a robe skirt covers the kneepads.
        if let Some(gloves) = item(SLOT_GLOVES).filter(|g| g.geosets[0] > 0) {
            variant[4] = 1 + gloves.geosets[0];
            variant[8] = 0;
        }
        if variant[13] > 1 {
            variant[9] = 0;
        }

        let mut attachments = Vec::new();
        if let Some(helm) = item(SLOT_HELM) {
            // What the helm covers, per race: HelmetGeosetVis names a row of
            // race bitmasks (bit = race id) for the wearer's sex.
            let vis = helm.helmet_vis[extra.sex.min(1) as usize];
            if let Some(hide) = self.helmet_vis.get(&vis) {
                let hides = |mask: u32| mask & 1u32.checked_shl(extra.race).unwrap_or(0) != 0;
                if hides(hide[0]) {
                    hair_geoset = BALD_CAP_GEOSET;
                }
                for group in 1..=3 {
                    if hides(hide[group]) {
                        // Back to the bare variant; never adds geometry the
                        // style didn't have.
                        variant[group] = variant[group].min(1);
                    }
                }
                if hides(hide[4]) {
                    variant[7] = 1;
                }
            }
            // Helm models are made per race and sex: `<name>_HuM.m2`.
            if let Some(prefix) = self.race_prefix.get(&extra.race) {
                let gender = if extra.sex == 0 { 'M' } else { 'F' };
                push_item_model(
                    &mut attachments,
                    ATTACH_HELM,
                    "Head",
                    &helm.models[0],
                    &format!("_{prefix}{gender}"),
                    &helm.textures[0],
                );
            }
        }
        if let Some(shoulder) = item(SLOT_SHOULDER) {
            // Column 0 is the left pad, column 1 the right one.
            for (point, i) in [(ATTACH_SHOULDER_LEFT, 0), (ATTACH_SHOULDER_RIGHT, 1)] {
                push_item_model(
                    &mut attachments,
                    point,
                    "Shoulder",
                    &shoulder.models[i],
                    "",
                    &shoulder.textures[i],
                );
            }
        }

        let mut geosets = vec![hair_geoset];
        for (group, &v) in variant.iter().enumerate().skip(1) {
            if v > 0 {
                geosets.push(group as u32 * 100 + v);
            }
        }
        CharacterAppearance { geosets, attachments }
    }
}

fn insert_texture(textures: &mut BTreeMap<u32, String>, component: u32, path: String) {
    if !path.is_empty() {
        textures.insert(component, path);
    }
}

/// Adds an item model under `Item\ObjectComponents\<folder>\`, if it has one.
fn push_item_model(
    attachments: &mut Vec<ItemAttachment>,
    point: u32,
    folder: &str,
    model: &str,
    suffix: &str,
    texture: &str,
) {
    if model.is_empty() {
        return;
    }
    let dir = format!("Item\\ObjectComponents\\{folder}\\");
    attachments.push(ItemAttachment {
        point,
        model: to_m2_path(&format!("{dir}{}{suffix}.mdx", strip_model_extension(model))),
        texture: if texture.is_empty() { String::new() } else { format!("{dir}{texture}.blp") },
    });
}

/// `Helm_Plate_B_01.mdx` -> `Helm_Plate_B_01`.
fn strip_model_extension(name: &str) -> &str {
    match name.rfind('.') {
        Some(dot) if [".mdx", ".mdl", ".m2"].iter().any(|ext| name[dot..].eq_ignore_ascii_case(ext)) => {
            &name[..dot]
        }
        _ => name,
    }
}

// ---------------------------------------------------------------------------
// DBC tables

/// A WDBC file: fixed-size records of 4-byte fields, then a string block.
struct Dbc<'a> {
    bytes: &'a [u8],
    count: usize,
    size: usize,
    strings: usize,
}

impl<'a> Dbc<'a> {
    /// `None` unless it is a WDBC whose records hold at least `min_fields`.
    fn open(bytes: &'a [u8], min_fields: usize) -> Option<Self> {
        let word = |o: usize| -> Option<usize> {
            Some(u32::from_le_bytes(bytes.get(o..o + 4)?.try_into().ok()?) as usize)
        };
        if bytes.get(..4)? != b"WDBC" {
            return None;
        }
        let (count, fields, size) = (word(4)?, word(8)?, word(12)?);
        let strings = 20 + count * size;
        if fields < min_fields || size < min_fields * 4 || bytes.len() < strings {
            return None;
        }
        Some(Self { bytes, count, size, strings })
    }

    fn rows(&self) -> impl Iterator<Item = Row<'a>> + '_ {
        (0..self.count).map(move |i| Row {
            bytes: self.bytes,
            strings: self.strings,
            base: 20 + i * self.size,
        })
    }
}

#[derive(Clone, Copy)]
struct Row<'a> {
    bytes: &'a [u8],
    strings: usize,
    base: usize,
}

impl Row<'_> {
    fn u32(&self, field: usize) -> u32 {
        let o = self.base + field * 4;
        self.bytes
            .get(o..o + 4)
            .map_or(0, |b| u32::from_le_bytes(b.try_into().unwrap()))
    }

    fn f32(&self, field: usize) -> f32 {
        f32::from_bits(self.u32(field))
    }

    fn string(&self, field: usize) -> String {
        let Some(tail) = self.bytes.get(self.strings + self.u32(field) as usize..) else {
            return String::new();
        };
        let end = tail.iter().position(|&b| b == 0).unwrap_or(tail.len());
        String::from_utf8_lossy(&tail[..end]).into_owned()
    }
}

struct DisplayInfo {
    model_data_id: u32,
    extended_id: u32,
    scale: f32,
    variations: [String; 3],
}

/// CreatureDisplayInfo.dbc: 1 = CreatureModelData id, 3 =
/// ExtendedDisplayInfoID (into CreatureDisplayInfoExtra, 0 for ordinary
/// creatures), 4 = CreatureModelScale, 6-8 = TextureVariation (bare skin BLP
/// names, no path/extension).
fn parse_display_info(bytes: &[u8]) -> HashMap<u32, DisplayInfo> {
    let Some(dbc) = Dbc::open(bytes, 9) else {
        return HashMap::new();
    };
    dbc.rows()
        .map(|row| {
            let scale = Some(row.f32(4)).filter(|s| *s > 0.0).unwrap_or(1.0);
            let display = DisplayInfo {
                model_data_id: row.u32(1),
                extended_id: row.u32(3),
                scale,
                variations: [row.string(6), row.string(7), row.string(8)],
            };
            (row.u32(0), display)
        })
        .collect()
}

/// CreatureModelData.dbc: 2 = ModelName (a `.mdx` path, normalized to the
/// `.m2` the client loads), 4 = ModelScale.
fn parse_model_data(bytes: &[u8]) -> HashMap<u32, (String, f32)> {
    let Some(dbc) = Dbc::open(bytes, 5) else {
        return HashMap::new();
    };
    dbc.rows()
        .map(|row| {
            let raw = row.string(2);
            let path = if raw.is_empty() { String::new() } else { to_m2_path(&raw) };
            let scale = Some(row.f32(4)).filter(|s| *s > 0.0).unwrap_or(1.0);
            (row.u32(0), (path, scale))
        })
        .collect()
}

struct Extra {
    race: u32,
    sex: u32,
    skin: u32,
    hair_style: u32,
    hair_color: u32,
    facial_hair: u32,
    items: [u32; ITEM_SLOTS],
    bake: String,
}

/// CreatureDisplayInfoExtra.dbc: 1 = race, 2 = sex, 3 = skin, 4 = face,
/// 5 = hair style, 6 = hair color, 7 = facial hair, 8-18 = ItemDisplayInfo
/// ids (helm, shoulder, shirt, chest, belt, legs, boots, wrist, gloves,
/// tabard, cape), 19 = flags, 20 = BakeName (the pre-composited body skin,
/// under textures\BakedNpcTextures).
fn parse_extra(bytes: &[u8]) -> HashMap<u32, Extra> {
    let Some(dbc) = Dbc::open(bytes, 21) else {
        return HashMap::new();
    };
    dbc.rows()
        .map(|row| {
            let extra = Extra {
                race: row.u32(1),
                sex: row.u32(2),
                skin: row.u32(3),
                hair_style: row.u32(5),
                hair_color: row.u32(6),
                facial_hair: row.u32(7),
                items: std::array::from_fn(|i| row.u32(8 + i)),
                bake: row.string(20),
            };
            (row.u32(0), extra)
        })
        .collect()
}

struct ItemDisplay {
    models: [String; 2],
    textures: [String; 2],
    geosets: [u32; 3],
    /// HelmetGeosetVisData id per wearer sex (male, female).
    helmet_vis: [u32; 2],
}

/// ItemDisplayInfo.dbc: 1-2 = ModelName, 3-4 = ModelTexture, 7-9 =
/// GeosetGroup, 13-14 = HelmetGeosetVis (male, female).
fn parse_item_display_info(bytes: &[u8]) -> HashMap<u32, ItemDisplay> {
    let Some(dbc) = Dbc::open(bytes, 15) else {
        return HashMap::new();
    };
    dbc.rows()
        .map(|row| {
            let item = ItemDisplay {
                models: [row.string(1), row.string(2)],
                textures: [row.string(3), row.string(4)],
                geosets: [row.u32(7), row.u32(8), row.u32(9)],
                helmet_vis: [row.u32(13), row.u32(14)],
            };
            (row.u32(0), item)
        })
        .collect()
}

/// HelmetGeosetVisData.dbc: 1-5 = race bitmasks hiding the hair, facial hair
/// 1-3 and ears (the last two columns are not used by 3.3.5 models).
fn parse_helmet_vis(bytes: &[u8]) -> HashMap<u32, [u32; 5]> {
    let Some(dbc) = Dbc::open(bytes, 6) else {
        return HashMap::new();
    };
    dbc.rows()
        .map(|row| (row.u32(0), std::array::from_fn(|i| row.u32(1 + i))))
        .collect()
}

/// Keyed by a record's lookup columns rather than its id, where the client
/// scans the table and takes the first match: some keys repeat (the goblin
/// hairstyles do), and a later duplicate must not win.
fn first_by_key<K: std::hash::Hash + Eq, V>(entries: impl Iterator<Item = (K, V)>) -> HashMap<K, V> {
    let mut map = HashMap::new();
    for (key, value) in entries {
        map.entry(key).or_insert(value);
    }
    map
}

/// CharHairGeosets.dbc: 1 = race, 2 = sex, 3 = hair style, 4 = geoset.
fn parse_hair_geosets(bytes: &[u8]) -> HashMap<(u32, u32, u32), u32> {
    let Some(dbc) = Dbc::open(bytes, 5) else {
        return HashMap::new();
    };
    first_by_key(dbc.rows().map(|row| ((row.u32(1), row.u32(2), row.u32(3)), row.u32(4))))
}

/// CharacterFacialHairStyles.dbc (no id column): 0 = race, 1 = sex, 2 =
/// style, 3-5 = variants of geoset groups 1, 3 and 2.
fn parse_facial_hair(bytes: &[u8]) -> HashMap<(u32, u32, u32), [u32; 3]> {
    let Some(dbc) = Dbc::open(bytes, 6) else {
        return HashMap::new();
    };
    first_by_key(
        dbc.rows()
            .map(|row| ((row.u32(0), row.u32(1), row.u32(2)), [row.u32(3), row.u32(4), row.u32(5)])),
    )
}

/// CharSections.dbc: 1 = race, 2 = sex, 3 = BaseSection (0 skin, 3 hair…),
/// 4-6 = TextureName, 8 = variation, 9 = color. A skin row's color is the
/// skin id, a hair row's variation the hair style.
fn parse_char_sections(bytes: &[u8]) -> HashMap<(u32, u32, u32, u32, u32), [String; 3]> {
    let Some(dbc) = Dbc::open(bytes, 10) else {
        return HashMap::new();
    };
    first_by_key(dbc.rows().map(|row| {
        let key = (row.u32(1), row.u32(2), row.u32(3), row.u32(8), row.u32(9));
        (key, [row.string(4), row.string(5), row.string(6)])
    }))
}

/// ChrRaces.dbc: 6 = ClientPrefix.
fn parse_race_prefixes(bytes: &[u8]) -> HashMap<u32, String> {
    let Some(dbc) = Dbc::open(bytes, 7) else {
        return HashMap::new();
    };
    dbc.rows()
        .map(|row| (row.u32(0), row.string(6)))
        .filter(|(_, prefix)| !prefix.is_empty())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A string block under construction; offset 0 is the empty string.
    struct Strings(Vec<u8>);

    impl Strings {
        fn new() -> Self {
            Self(vec![0])
        }

        fn push(&mut self, s: &str) -> u32 {
            let offset = self.0.len() as u32;
            self.0.extend_from_slice(s.as_bytes());
            self.0.push(0);
            offset
        }
    }

    /// A WDBC file of `fields`-wide records, each given as its field values.
    fn wdbc(fields: usize, records: &[Vec<u32>], strings: &Strings) -> Vec<u8> {
        let mut out = b"WDBC".to_vec();
        for word in [records.len(), fields, fields * 4, strings.0.len()] {
            out.extend_from_slice(&(word as u32).to_le_bytes());
        }
        for record in records {
            assert_eq!(record.len(), fields);
            for value in record {
                out.extend_from_slice(&value.to_le_bytes());
            }
        }
        out.extend_from_slice(&strings.0);
        out
    }

    fn record(fields: usize, values: &[(usize, u32)]) -> Vec<u32> {
        let mut r = vec![0; fields];
        for &(i, v) in values {
            r[i] = v;
        }
        r
    }

    const HUMAN: u32 = 1;
    const TAUREN: u32 = 6;
    const HELM_VIS: u32 = 248;

    /// The Stormwind City Guard (display 3167) as the 3.3.5 client ships it,
    /// plus a hairy human and an ordinary creature.
    fn sample() -> HashMap<u32, CreatureModelInfo> {
        let mut s = Strings::new();
        let human_male = s.push("Character\\Human\\Male\\HumanMale.mdx");
        let wolf = s.push("Creature\\Wolf\\Wolf.mdx");
        let wolf_skin = s.push("WolfSkinGrey");
        let bake = s.push("753720ae579b4cf6a14b8c8e39b36b34.blp");
        let helm_model = s.push("Helm_Plate_B_01Stormwind.mdx");
        let helm_texture = s.push("Helm_Plate_B_01Stormwind");
        let l_shoulder = s.push("LShoulder_Plate_B_01.mdx");
        let r_shoulder = s.push("RShoulder_Plate_B_01.mdx");
        let shoulder_texture = s.push("Shoulder_Plate_B_01Stormwind");
        let cape_texture = s.push("Cape_Cloth_B_02Orange");
        let hair_texture = s.push("Character\\Human\\Hair04_02.blp");
        let prefix = s.push("Hu");

        let display_info = wdbc(
            16,
            &[
                record(16, &[(0, 3167), (1, 49), (3, 346), (4, 1.0f32.to_bits())]),
                record(16, &[(0, 3168), (1, 49), (3, 347), (4, 1.0f32.to_bits())]),
                record(16, &[(0, 11), (1, 50), (4, 2.0f32.to_bits()), (6, wolf_skin)]),
            ],
            &s,
        );
        let model_data = wdbc(
            5,
            &[
                record(5, &[(0, 49), (2, human_male), (4, 1.0f32.to_bits())]),
                record(5, &[(0, 50), (2, wolf), (4, 0.5f32.to_bits())]),
            ],
            &s,
        );
        let extra = wdbc(
            21,
            &[
                // Guard: bald, helm + shoulders + boots + gloves + tabard.
                record(
                    21,
                    &[
                        (0, 346), (1, HUMAN), (8, 14964), (9, 7541), (14, 7255),
                        (16, 7698), (17, 6255), (20, bake),
                    ],
                ),
                // Hair style 4, color 2, facial hair 3, a cape and a robe.
                record(
                    21,
                    &[
                        (0, 347), (1, HUMAN), (5, 4), (6, 2), (7, 3), (11, 900),
                        (18, 901), (20, bake),
                    ],
                ),
            ],
            &s,
        );
        let items = wdbc(
            25,
            &[
                record(25, &[(0, 14964), (1, helm_model), (3, helm_texture), (13, HELM_VIS)]),
                record(
                    25,
                    &[(0, 7541), (1, l_shoulder), (2, r_shoulder), (3, shoulder_texture), (4, shoulder_texture)],
                ),
                record(25, &[(0, 7255), (7, 1)]),
                record(25, &[(0, 7698), (7, 1)]),
                record(25, &[(0, 6255), (7, 1)]),
                // Robe: sleeves 2, skirt 1.
                record(25, &[(0, 900), (7, 2), (9, 1)]),
                record(25, &[(0, 901), (3, cape_texture), (7, 3)]),
            ],
            &s,
        );
        // Hides hair, facial hair and ears for every race but the tauren.
        let all_but_tauren = !(1u32 << TAUREN);
        let helmet_vis = wdbc(
            8,
            &[record(8, &[(0, HELM_VIS), (1, all_but_tauren), (2, all_but_tauren), (3, all_but_tauren), (4, all_but_tauren), (5, all_but_tauren)])],
            &s,
        );
        let hair_geosets = wdbc(
            6,
            &[
                record(6, &[(0, 21), (1, HUMAN), (3, 0), (4, 0), (5, 1)]),
                record(6, &[(0, 25), (1, HUMAN), (3, 4), (4, 5)]),
                // A repeated key (as the goblin rows have): the first one wins.
                record(6, &[(0, 26), (1, HUMAN), (3, 4), (4, 9)]),
            ],
            &s,
        );
        let facial_hair = wdbc(
            8,
            &[
                record(8, &[(0, HUMAN), (2, 0), (3, 1), (4, 1), (5, 1)]),
                record(8, &[(0, HUMAN), (2, 3), (3, 2), (4, 1), (5, 2)]),
            ],
            &s,
        );
        let sections = wdbc(
            10,
            &[record(10, &[(0, 1), (1, HUMAN), (3, SECTION_HAIR), (4, hair_texture), (8, 4), (9, 2)])],
            &s,
        );
        let races = wdbc(69, &[record(69, &[(0, HUMAN), (6, prefix)])], &s);

        build_creature_models(&CreatureDbcs {
            display_info: &display_info,
            model_data: &model_data,
            display_info_extra: Some(&extra),
            item_display_info: Some(&items),
            helmet_geoset_vis: Some(&helmet_vis),
            hair_geosets: Some(&hair_geosets),
            facial_hair_styles: Some(&facial_hair),
            char_sections: Some(&sections),
            chr_races: Some(&races),
        })
    }

    #[test]
    fn ordinary_creatures_get_their_monster_skins_by_slot() {
        let wolf = &sample()[&11];
        assert_eq!(wolf.model, "creature\\wolf\\wolf.m2");
        assert_eq!(wolf.scale, 1.0);
        assert_eq!(
            wolf.textures,
            BTreeMap::from([(COMPONENT_MONSTER_1, "creature\\wolf\\WolfSkinGrey.blp".to_string())])
        );
        assert_eq!(wolf.character, None);
    }

    #[test]
    fn dresses_the_stormwind_guard() {
        let guard = &sample()[&3167];
        assert_eq!(
            guard.textures,
            BTreeMap::from([(
                COMPONENT_BODY,
                "textures\\BakedNpcTextures\\753720ae579b4cf6a14b8c8e39b36b34.blp".to_string()
            )])
        );
        let look = guard.character.as_ref().unwrap();
        // Bald cap (the helm hides the hair anyway), clean-shaven, ears
        // hidden by the helm, gloves 402 (no sleeve flare with cuffs), boots
        // 502, tabard 1202, and the bare variant of every other group.
        assert_eq!(
            look.geosets,
            vec![1, 101, 201, 301, 402, 502, 601, 701, 901, 1001, 1101, 1202, 1301, 1401, 1501, 1601, 1701, 1801]
        );
        assert_eq!(
            look.attachments,
            vec![
                ItemAttachment {
                    point: ATTACH_HELM,
                    model: "item\\objectcomponents\\head\\helm_plate_b_01stormwind_hum.m2".into(),
                    texture: "Item\\ObjectComponents\\Head\\Helm_Plate_B_01Stormwind.blp".into(),
                },
                ItemAttachment {
                    point: ATTACH_SHOULDER_LEFT,
                    model: "item\\objectcomponents\\shoulder\\lshoulder_plate_b_01.m2".into(),
                    texture: "Item\\ObjectComponents\\Shoulder\\Shoulder_Plate_B_01Stormwind.blp".into(),
                },
                ItemAttachment {
                    point: ATTACH_SHOULDER_RIGHT,
                    model: "item\\objectcomponents\\shoulder\\rshoulder_plate_b_01.m2".into(),
                    texture: "Item\\ObjectComponents\\Shoulder\\Shoulder_Plate_B_01Stormwind.blp".into(),
                },
            ]
        );
    }

    #[test]
    fn shows_the_hairstyle_facial_hair_robe_and_cape_without_a_helm() {
        let npc = &sample()[&3168];
        assert_eq!(npc.textures[&COMPONENT_HAIR], "Character\\Human\\Hair04_02.blp");
        assert_eq!(
            npc.textures[&COMPONENT_CAPE],
            "Item\\ObjectComponents\\Cape\\Cape_Cloth_B_02Orange.blp"
        );
        let look = npc.character.as_ref().unwrap();
        // Hairstyle geoset 5 instead of the bald cap; facial hair columns
        // map to groups 1, 3, 2; ears shown; robe sleeves 803 and skirt 1302
        // (which drops the kneepads); cape 1504.
        assert_eq!(
            look.geosets,
            vec![5, 102, 202, 301, 401, 501, 601, 702, 803, 1001, 1101, 1201, 1302, 1401, 1504, 1601, 1701, 1801]
        );
        assert!(look.attachments.is_empty());
    }

    #[test]
    fn reads_wotlk_m2_attachment_points() {
        let mut m2 = vec![0u8; 248];
        m2[..4].copy_from_slice(b"MD20");
        m2[4..8].copy_from_slice(&264u32.to_le_bytes());
        m2[240..244].copy_from_slice(&1u32.to_le_bytes());
        m2[244..248].copy_from_slice(&248u32.to_le_bytes());
        let mut attachment = vec![0u8; 40];
        attachment[..4].copy_from_slice(&11u32.to_le_bytes());
        attachment[4..6].copy_from_slice(&115u16.to_le_bytes());
        for (i, v) in [0.1f32, -0.2, 1.9].iter().enumerate() {
            attachment[8 + i * 4..12 + i * 4].copy_from_slice(&v.to_le_bytes());
        }
        m2.extend(attachment);
        assert_eq!(
            parse_m2_attachments(&m2),
            vec![AttachmentPoint { id: 11, bone: 115, position: [0.1, -0.2, 1.9] }]
        );
        // Anything but a WotLK M2 yields nothing rather than garbage.
        m2[4..8].copy_from_slice(&263u32.to_le_bytes());
        assert!(parse_m2_attachments(&m2).is_empty());
        assert!(parse_m2_attachments(b"MD2").is_empty());
    }
}

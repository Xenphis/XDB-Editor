use std::collections::HashMap;
use std::io::Cursor;

use serde::{Deserialize, Serialize};
use wow_adt::{parse_adt, ParsedAdt};
use wow_wdt::{version::WowVersion, WdtReader};
use wow_wmo::{parse_wmo, ParsedWmo};

use crate::liquids::{category_code, liquid_category, LiquidLayer};

/// WMO (World Map Object) extraction for the 3D building/structure layer.
///
/// `@wowserhq/scene` renders terrain + M2 doodads but no WMO. WMOs are the
/// buildings, bridges, city shells and instance interiors. Placement data
/// comes from the ADT (MODF, per tile — outdoor world) and the WDT (MODF,
/// global — WMO-only maps like dungeons). Each placement references a WMO root
/// file (`.wmo`) plus its group files (`<base>_NNN.wmo`) holding the geometry.
///
/// This module parses placements and, on demand, a WMO's geometry (merged per
/// texture, in WMO-local space), its liquid surfaces and its interior doodad
/// sets (M2 refs + local transforms). The world transform (position/rotation) of a placement is
/// applied on the JS side, using @wowserhq/format's proven MODF/MDDF
/// convention, so terrain and WMOs share one coordinate frame.

/// One merged, textured mesh for a WMO (local space; grouped by texture +
/// lighting mode). `exterior` groups are lit by dynamic light on the JS side
/// (normal shading); interior groups keep their baked MOCV lighting.
#[derive(Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct WmoBatch {
    pub texture: String,
    /// SMOGroup_EXTERIOR (MOGP flag 0x8): outdoor surface, sun-lit in game.
    pub exterior: bool,
    pub positions: Vec<f32>,
    pub normals: Vec<f32>,
    pub uvs: Vec<f32>,
    /// Interior lighting to multiply the texture by (RGB, 0..1): the group's
    /// baked MOCV, fixed up and doubled the way the client does, white where a
    /// group has no MOCV. Empty for exterior batches — the scene's sun lights
    /// those.
    pub colors: Vec<f32>,
    pub indices: Vec<u32>,
    /// MOMT two-sided flag (0x04). Everything else is front-facing only: a
    /// wall drawn from both sides shades every one of its fragments twice, on
    /// a view that is fill-bound well before it is detail-bound.
    pub two_sided: bool,
    /// MOMT blend mode: 0 opaque, 1 alpha-key (cutout), 2 and up blended.
    /// Without it, windows, grilles and WMO foliage drew as opaque squares.
    pub blend_mode: u32,
}

/// An M2 placed inside a WMO (WMO-local transform).
#[derive(Serialize, Deserialize)]
pub struct WmoDoodad {
    pub m2: String,
    pub position: [f32; 3],
    /// Quaternion [x, y, z, w] as stored in MODD.
    pub rotation: [f32; 4],
    pub scale: f32,
}

#[derive(Serialize, Deserialize, Default)]
pub struct WmoDoodadSet {
    pub doodads: Vec<WmoDoodad>,
}

/// A fully-resolved WMO: geometry batches + interior doodad sets.
#[derive(Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct WmoModel {
    pub batches: Vec<WmoBatch>,
    pub doodad_sets: Vec<WmoDoodadSet>,
    /// The WMO's own liquid (MLIQ: city canals, fountains, instance pools),
    /// one merged surface per category, in WMO-local space like the batches.
    #[serde(default)]
    pub liquids: Vec<LiquidLayer>,
}

/// A WMO placed in the world (world transform resolved on the JS side).
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WmoPlacement {
    /// Root `.wmo` path (key for `minimap_wmo_model`).
    pub model: String,
    /// MODF position [X, Y, Z] in WoW coords.
    pub position: [f32; 3],
    /// MODF rotation [X, Y, Z] in degrees.
    pub rotation: [f32; 3],
    /// Which interior doodad set to render (plus set 0, always).
    pub doodad_set: u16,
}

/// WMO placements from an ADT tile's MODF (outdoor world buildings).
pub fn adt_wmo_placements(adt_bytes: &[u8]) -> Vec<WmoPlacement> {
    let Ok(ParsedAdt::Root(root)) = parse_adt(&mut Cursor::new(adt_bytes)) else {
        return Vec::new();
    };
    root.wmo_placements
        .iter()
        .filter_map(|p| {
            let model = root.wmos.get(p.name_id as usize)?.clone();
            Some(WmoPlacement {
                model,
                position: p.position,
                rotation: p.rotation,
                doodad_set: p.doodad_set,
            })
        })
        .collect()
}

/// Global WMO placements from a map's WDT MODF (WMO-only maps: dungeons…).
pub fn wdt_wmo_placements(wdt_bytes: &[u8]) -> Vec<WmoPlacement> {
    let mut reader = WdtReader::new(Cursor::new(wdt_bytes), WowVersion::WotLK);
    let Ok(wdt) = reader.read() else {
        return Vec::new();
    };
    let (Some(modf), Some(mwmo)) = (wdt.modf, wdt.mwmo) else {
        return Vec::new();
    };
    modf.entries
        .iter()
        .filter_map(|e| {
            let model = mwmo.filenames.get(e.id as usize)?.clone();
            Some(WmoPlacement {
                model,
                position: e.position,
                rotation: e.rotation,
                doodad_set: e.doodad_set,
            })
        })
        .collect()
}

/// Builds a WMO's geometry + doodad sets. `read` fetches an MPQ file by path
/// (the caller wires it to the client's patch chain). Group files are the root
/// name with `_000.wmo`, `_001.wmo`, … suffixes. `liquid_types` maps
/// LiquidType.dbc ids to their type code, for the groups' liquid.
pub fn build_model(
    root_path: &str,
    liquid_types: &HashMap<u16, u8>,
    mut read: impl FnMut(&str) -> Result<Vec<u8>, String>,
) -> Result<WmoModel, String> {
    let root_bytes = read(root_path)?;
    let ParsedWmo::Root(root) = parse_wmo(&mut Cursor::new(&root_bytes))
        .map_err(|e| format!("WMO root parse: {e}"))?
    else {
        return Err("expected a WMO root file".into());
    };

    // MOTX offset -> texture path (resolved via the root's offset->index map).
    let texture_of = |material_texture1: u32| -> String {
        root.texture_offset_index_map
            .get(&material_texture1)
            .and_then(|&i| root.textures.get(i as usize))
            .cloned()
            .unwrap_or_default()
    };

    // Merge every group's batches into one buffer per (texture, lighting mode,
    // render state). Two-sidedness and blend mode join the key because they are
    // per-material and cannot be expressed inside a merged draw — materials
    // sharing a texture usually share both, so this splits few batches.
    // The extension is stripped case-insensitively: MWMO paths are
    // often upper-case (`...WALL.WMO`), and a lower-case-only strip would
    // leave `.WMO` in the base, so `<base>_000.wmo` would never resolve.
    let mut buffers: HashMap<(String, bool, bool, u32), WmoBatch> = HashMap::new();
    // Liquid surfaces, merged across groups per category code.
    let mut liquids: HashMap<u8, LiquidLayer> = HashMap::new();
    let base = match root_path.get(root_path.len().saturating_sub(4)..) {
        Some(ext) if ext.eq_ignore_ascii_case(".wmo") => &root_path[..root_path.len() - 4],
        _ => root_path,
    };
    for group_index in 0..root.n_groups as usize {
        let group_path = format!("{base}_{group_index:03}.wmo");
        let Ok(group_bytes) = read(&group_path) else {
            continue; // a missing group shouldn't sink the whole model
        };
        let Ok(ParsedWmo::Group(group)) = parse_wmo(&mut Cursor::new(&group_bytes)) else {
            continue;
        };

        // wow-wmo reads no more of MLIQ than a header (and a misaligned one),
        // so the liquid comes straight from the group's bytes.
        if let Some(mliq) = group_mliq(&group_bytes) {
            append_group_liquid(
                mliq,
                root.flags,
                group.flags,
                group.group_liquid,
                liquid_types,
                &mut liquids,
            );
        }

        // Exterior (outdoor) groups get dynamic lighting; interior groups keep
        // their baked MOCV. The flag is constant for a whole group.
        let exterior = group.flags & 0x8 != 0;

        // Per-vertex interior lighting, only worth computing for the groups
        // that use it (exterior batches ship no colors at all).
        //
        // MOCV is *not* a "tint the texture by this" color: in the client's
        // lighting formula it is added to the ambient + sun term, and outdoor
        // MOCV is near-black precisely because the sun already lights those
        // surfaces (multiplying by it renders the building pitch black).
        // Interior groups are the unlit case, where that sum is the MOCV
        // alone, so there the baked color *is* the light the texture is
        // multiplied by — after the two adjustments the client makes:
        //
        //  - CMapObjGroup::FixColorVertexAlpha, run at load time unless MOHD
        //    sets flag_do_not_fix_vertex_color_alpha (0x8). Vertices below the
        //    first non-transparency batch are merely halved; the rest fold the
        //    MOCV alpha into the RGB.
        //  - the pixel shader's doubling of the light before it multiplies the
        //    texture, saturated here since the buffer is 0..1.
        let vertex_light: Vec<[f32; 3]> = if exterior || group.vertex_colors.is_empty() {
            Vec::new()
        } else {
            let fix_alpha = root.flags & 0x8 == 0;
            // MOBA batches are ordered trans, then int, then ext.
            let trans_end = match group.trans_batch_count.checked_sub(1) {
                Some(last) => group
                    .render_batches
                    .get(last as usize)
                    .map_or(0, |b| b.max_index as usize + 1),
                None => 0,
            };
            group
                .vertex_colors
                .iter()
                .enumerate()
                .map(|(i, c)| {
                    let light = |v: u8| -> f32 {
                        let fixed = match (fix_alpha, i >= trans_end) {
                            (false, _) => v as i32,
                            (true, true) => ((v as i32 + c.a as i32 * v as i32 / 64) / 2).min(255),
                            (true, false) => v as i32 / 2,
                        };
                        (fixed as f32 / 255.0 * 2.0).min(1.0)
                    };
                    [light(c.r), light(c.g), light(c.b)]
                })
                .collect()
        };

        // Vertex de-dup is per group file (indices are group-local), and per
        // destination buffer: one texture can now land in several buffers
        // within a group (different blend mode or facing), and a remap shared
        // between them would hand out indices into the wrong one.
        let mut remaps: HashMap<(String, bool, bool, u32), HashMap<u16, u32>> = HashMap::new();
        for batch in &group.render_batches {
            let Some(material) = root.materials.get(batch.material_id as usize) else {
                continue;
            };
            let texture = texture_of(material.texture_1);
            if texture.is_empty() {
                continue; // phase 1 renders textured surfaces only
            }
            // MOMT flag 0x04 (F_UNCULLED). `root.materials` are raw MomtEntry
            // records here, so the bit is tested by hand.
            let two_sided = material.flags & 0x04 != 0;
            let blend_mode = material.blend_mode;
            let key = (texture.clone(), exterior, two_sided, blend_mode);
            let buffer = buffers.entry(key.clone()).or_insert_with(|| WmoBatch {
                texture,
                exterior,
                two_sided,
                blend_mode,
                ..Default::default()
            });
            let remap = remaps.entry(key).or_default();

            let start = batch.start_index as usize;
            for k in 0..batch.count as usize {
                let Some(&vi) = group.vertex_indices.get(start + k) else {
                    break;
                };
                let new_index = *remap.entry(vi).or_insert_with(|| {
                    let idx = (buffer.positions.len() / 3) as u32;
                    let v = &group.vertex_positions[vi as usize];
                    buffer.positions.extend_from_slice(&[v.x, v.y, v.z]);
                    match group.vertex_normals.get(vi as usize) {
                        Some(n) => buffer.normals.extend_from_slice(&[n.x, n.y, n.z]),
                        None => buffer.normals.extend_from_slice(&[0.0, 0.0, 1.0]),
                    }
                    match group.texture_coords.get(vi as usize) {
                        Some(t) => buffer.uvs.extend_from_slice(&[t.u, t.v]),
                        None => buffer.uvs.extend_from_slice(&[0.0, 0.0]),
                    }
                    // Interior lighting; white where the group has no MOCV, so
                    // those keep their full texture. Nothing for exterior
                    // batches: the scene's sun lights them.
                    if !exterior {
                        match vertex_light.get(vi as usize) {
                            Some(l) => buffer.colors.extend_from_slice(l),
                            None => buffer.colors.extend_from_slice(&[1.0, 1.0, 1.0]),
                        }
                    }
                    idx
                });
                buffer.indices.push(new_index);
            }
        }
    }

    let mut batches: Vec<WmoBatch> =
        buffers.into_values().filter(|b| !b.indices.is_empty()).collect();
    batches.sort_by(|a, b| a.texture.cmp(&b.texture));

    // MODD doodad name offsets index the raw MODN block (root_parser exposes
    // doodad_names split but without the per-def offset, so resolve directly).
    let modn = find_chunk(&root_bytes, *b"NDOM").unwrap_or(&[]);
    let doodad_sets = root
        .doodad_sets
        .iter()
        .map(|set| {
            let start = set.start_index as usize;
            let count = set.count as usize;
            let doodads = root
                .doodad_defs
                .iter()
                .skip(start)
                .take(count)
                .filter_map(|def| {
                    // Name offset is the low 24 bits; the top 8 are flags.
                    let name = modn_string(modn, def.name_index_and_flags & 0x00FF_FFFF);
                    if name.is_empty() {
                        return None;
                    }
                    Some(WmoDoodad {
                        m2: to_m2_path(&name),
                        position: def.position,
                        rotation: def.orientation,
                        scale: def.scale,
                    })
                })
                .collect();
            WmoDoodadSet { doodads }
        })
        .collect();

    let mut liquids: Vec<LiquidLayer> =
        liquids.into_values().filter(|l| !l.indices.is_empty()).collect();
    liquids.sort_by(|a, b| a.category.cmp(&b.category));

    Ok(WmoModel { batches, doodad_sets, liquids })
}

/// Yards per MLIQ tile: a 128th of an ADT tile, the same cell as MH2O's, so
/// a WMO's water and the terrain's share one grid size.
const LIQUID_UNIT: f32 = 1600.0 / 3.0 / 128.0;
/// Bytes before MOGP's sub-chunks: the group header.
const MOGP_HEADER_SIZE: usize = 0x44;
/// MLIQ header: vertex counts, tile counts (2 x i32 each), corner (3 x f32),
/// material id (u16).
const MLIQ_HEADER_SIZE: usize = 30;
/// One MLIQ vertex: four bytes of flow (water) or UV (magma), then the height.
const MLIQ_VERTEX_SIZE: usize = 8;
/// MLIQ tile flag: the tile carries no liquid to draw.
const MLIQ_TILE_DONT_RENDER: u8 = 0x08;
/// MOHD flag: MOGP's groupLiquid is a LiquidType.dbc id, not a legacy type.
const MOHD_USE_LIQUID_TYPE_DBC_ID: u16 = 0x04;
/// MOGP flag: the group's plain "water" is sea water.
const MOGP_IS_NOT_WATER_BUT_OCEAN: u32 = 0x80000;

/// The MLIQ chunk of a group file. It is one of MOGP's sub-chunks, which
/// follow the group header, so it is looked for inside MOGP.
fn group_mliq(group_bytes: &[u8]) -> Option<&[u8]> {
    let mogp = find_chunk(group_bytes, *b"PGOM")?;
    find_chunk(mogp.get(MOGP_HEADER_SIZE..)?, *b"QILM")
}

/// A group's liquid as a LiquidType.dbc type code (0 water, 1 ocean,
/// 2 magma, 3 slime), resolved as the 3.3.5 client does.
///
/// Older WMOs store a legacy "basic" type (the low two bits) rather than a
/// LiquidType.dbc id, and the root's MOHD flags say which one a model uses.
/// "Green lava" (legacy 15) carries its type in the tiles instead, which is
/// what `tile_type` is for: the low bits of the first tile that is drawn.
fn group_liquid_type(
    root_flags: u16,
    group_flags: u32,
    group_liquid: u32,
    tile_type: u8,
    liquid_types: &HashMap<u16, u8>,
) -> u8 {
    let ocean = group_flags & MOGP_IS_NOT_WATER_BUT_OCEAN != 0;
    let basic = |legacy: u32| -> u8 {
        match legacy & 0x3 {
            0 if ocean => 1,
            code => code as u8,
        }
    };
    let dbc = |id: u32| -> u8 {
        u16::try_from(id).ok().and_then(|id| liquid_types.get(&id)).copied().unwrap_or(0)
    };
    if root_flags & MOHD_USE_LIQUID_TYPE_DBC_ID != 0 {
        // The first 20 ids are the basic types repeated (water, ocean, magma,
        // slime), which the client reads by position rather than from the DBC.
        if group_liquid < 21 {
            basic(group_liquid.saturating_sub(1))
        } else {
            dbc(group_liquid)
        }
    } else if group_liquid == 15 {
        basic(u32::from(tile_type))
    } else if group_liquid < 20 {
        basic(group_liquid)
    } else {
        dbc(group_liquid + 1)
    }
}

/// Appends one group's MLIQ surface to the buffer of its liquid category.
///
/// MLIQ is a height grid: the header, then one vertex per grid point, row by
/// row with X running fastest, then one flag byte per tile in the same order.
/// Vertex (i, j) sits at `corner + (i, j) * LIQUID_UNIT` at its own height, in
/// WMO-local space. Returns `None`, adding nothing, for a malformed chunk or a
/// grid with no tile to draw.
fn append_group_liquid(
    mliq: &[u8],
    root_flags: u16,
    group_flags: u32,
    group_liquid: u32,
    liquid_types: &HashMap<u16, u8>,
    buffers: &mut HashMap<u8, LiquidLayer>,
) -> Option<()> {
    let i32_at = |o: usize| -> Option<i32> {
        Some(i32::from_le_bytes(mliq.get(o..o + 4)?.try_into().ok()?))
    };
    let f32_at = |o: usize| -> Option<f32> {
        Some(f32::from_le_bytes(mliq.get(o..o + 4)?.try_into().ok()?))
    };
    let count = |o: usize| i32_at(o).and_then(|v| usize::try_from(v).ok());
    let (x_verts, y_verts) = (count(0)?, count(4)?);
    let (x_tiles, y_tiles) = (count(8)?, count(12)?);
    let (corner_x, corner_y, corner_z) = (f32_at(16)?, f32_at(20)?, f32_at(24)?);
    if x_tiles == 0 || y_tiles == 0 || x_verts != x_tiles + 1 || y_verts != y_tiles + 1 {
        return None;
    }
    // Checking that the tiles are all there proves the vertices before them are.
    let tiles_start = MLIQ_HEADER_SIZE + x_verts * y_verts * MLIQ_VERTEX_SIZE;
    let tiles = mliq.get(tiles_start..tiles_start + x_tiles * y_tiles)?;
    let drawn = |flags: u8| flags & MLIQ_TILE_DONT_RENDER == 0;
    let tile_type = tiles.iter().copied().find(|&flags| drawn(flags))? & 0x0F;

    let type_code = group_liquid_type(root_flags, group_flags, group_liquid, tile_type, liquid_types);
    let category = liquid_category(type_code);
    let layer = buffers.entry(category_code(category)).or_insert_with(|| LiquidLayer {
        category: category.to_string(),
        ..Default::default()
    });

    // The whole grid goes in, drawn tiles or not: tiles share their corners,
    // and indexing into one grid is simpler than compacting it.
    let base = (layer.positions.len() / 3) as u32;
    for j in 0..y_verts {
        for i in 0..x_verts {
            let height = f32_at(MLIQ_HEADER_SIZE + (j * x_verts + i) * MLIQ_VERTEX_SIZE + 4)
                .filter(|h| h.is_finite())
                .unwrap_or(corner_z);
            layer.positions.extend_from_slice(&[
                corner_x + i as f32 * LIQUID_UNIT,
                corner_y + j as f32 * LIQUID_UNIT,
                height,
            ]);
        }
    }
    let vertex = |i: usize, j: usize| base + (j * x_verts + i) as u32;
    for j in 0..y_tiles {
        for i in 0..x_tiles {
            if !drawn(tiles[j * x_tiles + i]) {
                continue;
            }
            layer.indices.extend_from_slice(&[
                vertex(i, j),
                vertex(i + 1, j),
                vertex(i + 1, j + 1),
                vertex(i, j),
                vertex(i + 1, j + 1),
                vertex(i, j + 1),
            ]);
        }
    }
    Some(())
}

/// MODN is a block of null-terminated paths; `offset` is a byte offset into it.
fn modn_string(modn: &[u8], offset: u32) -> String {
    let start = offset as usize;
    if start >= modn.len() {
        return String::new();
    }
    let end = modn[start..]
        .iter()
        .position(|&b| b == 0)
        .map(|p| start + p)
        .unwrap_or(modn.len());
    String::from_utf8_lossy(&modn[start..end]).into_owned()
}

/// MODN paths use the old `.mdx`/`.mdl` extension; the client loads `.m2`.
/// Shared with minimap.rs, which resolves creature models from CreatureModelData.dbc.
pub(crate) fn to_m2_path(path: &str) -> String {
    let lower = path.to_ascii_lowercase();
    if let Some(stem) = lower.strip_suffix(".mdx").or_else(|| lower.strip_suffix(".mdl")) {
        format!("{stem}.m2")
    } else {
        path.to_string()
    }
}

/// Sequentially walks the IFF chunks and returns the data slice of the first
/// chunk whose (little-endian, reversed) magic matches. WMO/ADT store magics
/// reversed, e.g. MODN is `NDOM` on disk.
pub(crate) fn find_chunk(bytes: &[u8], magic: [u8; 4]) -> Option<&[u8]> {
    let mut pos = 0usize;
    while pos + 8 <= bytes.len() {
        let size = u32::from_le_bytes(bytes[pos + 4..pos + 8].try_into().ok()?) as usize;
        let data_start = pos + 8;
        let data_end = data_start.checked_add(size)?;
        if data_end > bytes.len() {
            break;
        }
        if bytes[pos..pos + 4] == magic {
            return Some(&bytes[data_start..data_end]);
        }
        pos = data_end;
    }
    None
}

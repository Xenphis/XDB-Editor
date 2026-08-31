use std::collections::HashMap;
use std::io::Cursor;

use serde::{Deserialize, Serialize};
use wow_adt::{parse_adt, ParsedAdt};
use wow_wdt::{version::WowVersion, WdtReader};
use wow_wmo::{parse_wmo, ParsedWmo};

/// WMO (World Map Object) extraction for the 3D building/structure layer.
///
/// `@wowserhq/scene` renders terrain + M2 doodads but no WMO. WMOs are the
/// buildings, bridges, city shells and instance interiors. Placement data
/// comes from the ADT (MODF, per tile — outdoor world) and the WDT (MODF,
/// global — WMO-only maps like dungeons). Each placement references a WMO root
/// file (`.wmo`) plus its group files (`<base>_NNN.wmo`) holding the geometry.
///
/// This module parses placements and, on demand, a WMO's geometry (merged per
/// texture, in WMO-local space) and interior doodad sets (M2 refs + local
/// transforms). The world transform (position/rotation) of a placement is
/// applied on the JS side, using @wowserhq/format's proven MODF/MDDF
/// convention, so terrain and WMOs share one coordinate frame.

/// One merged, textured mesh for a WMO (local space; grouped by texture +
/// lighting mode). `exterior` groups are lit by dynamic light on the JS side
/// (normal shading); interior groups keep their baked MOCV lighting.
#[derive(Serialize, Deserialize, Default)]
pub struct WmoBatch {
    pub texture: String,
    /// SMOGroup_EXTERIOR (MOGP flag 0x8): outdoor surface, sun-lit in game.
    pub exterior: bool,
    pub positions: Vec<f32>,
    pub normals: Vec<f32>,
    pub uvs: Vec<f32>,
    /// Baked MOCV vertex colors (RGB, 0..1), white where a group has none.
    pub colors: Vec<f32>,
    pub indices: Vec<u32>,
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
/// name with `_000.wmo`, `_001.wmo`, … suffixes.
pub fn build_model(
    root_path: &str,
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

    // Merge every group's batches into one buffer per (texture, lighting
    // mode). The extension is stripped case-insensitively: MWMO paths are
    // often upper-case (`...WALL.WMO`), and a lower-case-only strip would
    // leave `.WMO` in the base, so `<base>_000.wmo` would never resolve.
    let mut buffers: HashMap<(String, bool), WmoBatch> = HashMap::new();
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

        // Exterior (outdoor) groups get dynamic lighting; interior groups keep
        // their baked MOCV. The flag is constant for a whole group.
        let exterior = group.flags & 0x8 != 0;

        // Vertex de-dup is per group file (indices are group-local).
        let mut remaps: HashMap<String, HashMap<u16, u32>> = HashMap::new();
        for batch in &group.render_batches {
            let Some(material) = root.materials.get(batch.material_id as usize) else {
                continue;
            };
            let texture = texture_of(material.texture_1);
            if texture.is_empty() {
                continue; // phase 1 renders textured surfaces only
            }
            let buffer = buffers.entry((texture.clone(), exterior)).or_insert_with(|| WmoBatch {
                texture: texture.clone(),
                exterior,
                ..Default::default()
            });
            let remap = remaps.entry(texture).or_default();

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
                    // MOCV baked lighting (BGRA bytes); white where absent so
                    // groups without vertex colors keep their full texture.
                    match group.vertex_colors.get(vi as usize) {
                        Some(c) => buffer.colors.extend_from_slice(&[
                            c.r as f32 / 255.0,
                            c.g as f32 / 255.0,
                            c.b as f32 / 255.0,
                        ]),
                        None => buffer.colors.extend_from_slice(&[1.0, 1.0, 1.0]),
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

    Ok(WmoModel { batches, doodad_sets })
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
fn find_chunk(bytes: &[u8], magic: [u8; 4]) -> Option<&[u8]> {
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

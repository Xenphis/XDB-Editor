use std::collections::HashMap;
use std::io::Cursor;

use serde::{Deserialize, Serialize};
use wow_adt::{parse_adt, Mh2oInstance, ParsedAdt};

use crate::wmo::find_chunk;

/// ADT liquid extraction for the 3D water layer.
///
/// WotLK stores water per-ADT in the MH2O chunk: for each of the 256 MCNK
/// cells, zero or more liquid layers, each covering a sub-rectangle of the
/// MCNK's 8×8 liquid grid with per-vertex heights (or a flat level). ADTs that
/// were never re-exported for WotLK (Zul'Gurub, Zul'Aman) have no MH2O and
/// keep the pre-WotLK form instead: an MCLQ sub-chunk in each MCNK, which the
/// 3.3.5 client still reads wherever MH2O leaves a cell dry. This turns both
/// into world-space triangle meshes grouped by liquid category so the scene
/// (three space == WoW space: X north, Y west, Z up) can render them alongside
/// @wowserhq/scene's terrain.

/// Yards per ADT tile; a tile is 16 MCNKs, each 8 liquid cells.
const TILE: f32 = 1600.0 / 3.0;
/// Yards per liquid cell (tile / 16 MCNK / 8 cells = tile / 128).
const UNIT: f32 = TILE / 128.0;

/// Bytes of one MCLQ liquid layer: its height range (8), the 9×9 vertices of
/// 8 bytes each, the 8×8 tile bytes, then flow data (84) the view ignores.
const MCLQ_LAYER: usize = 8 + 81 * 8 + 64 + 84;
/// The MCNK flags that each announce one MCLQ layer, in the order the layers
/// are stored, with the category each draws as.
const MCLQ_KINDS: [(u32, &str); 4] =
    [(0x04, "water"), (0x08, "ocean"), (0x10, "magma"), (0x20, "slime")];
/// Set in the tile byte of a dry MCLQ cell (0x0F, the usual "no liquid").
const MCLQ_TILE_DRY: u8 = 0x08;

/// One merged mesh for all liquid of a given category in a tile.
#[derive(Serialize, Deserialize, Default)]
pub struct LiquidLayer {
    pub category: String,
    /// Flat XYZ triplets in world (== three) space.
    pub positions: Vec<f32>,
    pub indices: Vec<u32>,
    /// How deep the liquid is under each vertex, 0..1 (MH2O's and MCLQ's
    /// depth byte over 255), one per position. The client fades a surface out
    /// where it is shallow, which is what hides the liquid a cell carries over
    /// dry ground at its edges. Empty when the source has no depth (WMO MLIQ),
    /// which reads as deep everywhere.
    #[serde(default)]
    pub depths: Vec<f32>,
}

#[derive(Serialize, Deserialize, Default)]
pub struct LiquidMesh {
    pub layers: Vec<LiquidLayer>,
}

/// Builds the world-space liquid meshes for tile (`tile_x`, `tile_y`).
/// `adt_bytes` is the raw `world/maps/<map>/<map>_<x>_<y>.adt`; `liquid_types`
/// maps LiquidType.dbc ids to a category (see [`liquid_category`]).
pub fn build_tile_liquids(
    adt_bytes: &[u8],
    tile_x: u32,
    tile_y: u32,
    liquid_types: &HashMap<u16, u8>,
) -> Result<LiquidMesh, String> {
    let parsed = parse_adt(&mut Cursor::new(adt_bytes)).map_err(|e| format!("ADT parse: {e}"))?;
    let ParsedAdt::Root(root) = parsed else {
        return Ok(LiquidMesh::default());
    };

    // World coords of the tile's local (0,0) corner (north-west: max X and Y).
    // Matches the 2D minimap mapping (TrinityCore convention): col == tile_x
    // drives world Y (west), row == tile_y drives world X (north).
    let origin = ((32.0 - tile_y as f32) * TILE, (32.0 - tile_x as f32) * TILE);

    // One vertex/index buffer per category, keyed by category code.
    let mut buffers: HashMap<u8, LiquidLayer> = HashMap::new();
    // MCNKs (row * 16 + col) that MH2O gives liquid to: their MCLQ, if any, is
    // what MH2O replaced, and would draw the same water twice.
    let mut from_mh2o = [false; 256];

    if let Some(water) = &root.water_data {
        // The raw chunk, for the vertex data (see `instance_vertices`).
        let mh2o = find_chunk(adt_bytes, *b"O2HM").unwrap_or(&[]);
        for (entry_idx, entry) in water.entries.iter().enumerate() {
            // MCNK grid position for this entry (fall back to row-major index).
            let (mcnk_col, mcnk_row) = root
                .mcnk_chunks
                .get(entry_idx)
                .map(|c| (c.header.index_x, c.header.index_y))
                .unwrap_or(((entry_idx % 16) as u32, (entry_idx / 16) as u32));
            if !entry.instances.is_empty() && mcnk_col < 16 && mcnk_row < 16 {
                from_mh2o[(mcnk_row * 16 + mcnk_col) as usize] = true;
            }

            for (i, instance) in entry.instances.iter().enumerate() {
                let exists = entry.exists_bitmaps.get(i).copied().flatten();
                let (heights, depths) = instance_vertices(mh2o, instance);
                append_instance(
                    instance,
                    mcnk_col,
                    mcnk_row,
                    exists,
                    &heights,
                    &depths,
                    origin,
                    liquid_types,
                    &mut buffers,
                );
            }
        }
    }

    for mcnk in mcnk_chunks(adt_bytes) {
        append_mclq(mcnk, &from_mh2o, origin, &mut buffers);
    }

    let mut layers: Vec<LiquidLayer> =
        buffers.into_values().filter(|l| !l.indices.is_empty()).collect();
    layers.sort_by(|a, b| a.category.cmp(&b.category));
    Ok(LiquidMesh { layers })
}

/// Heights and depths (0..1) of an MH2O instance's vertices, row by row with
/// X fastest, `None` where its vertex format carries no such value.
///
/// Read from the raw chunk: wow-adt (still as of 0.7.0) mis-parses the vertex
/// data, reading height and depth as one interleaved record where WotLK stores
/// the heightmap and the depthmap as two separate arrays. The layout follows
/// the vertex format (LVF): 0 heights then depths, 1 heights then UVs, 2
/// depths only, 3 heights, UVs, then depths — heights 4 bytes, UVs 4, depths 1.
fn instance_vertices(
    mh2o: &[u8],
    instance: &Mh2oInstance,
) -> (Vec<Option<f32>>, Vec<Option<f32>>) {
    let count = (instance.width as usize + 1) * (instance.height as usize + 1);
    let base = instance.offset_vertex_data as usize;
    let (heights_at, depths_at) = match (base, instance.liquid_object_or_lvf) {
        (0, _) => (None, None),
        (_, 0) => (Some(0), Some(count * 4)),
        (_, 1) => (Some(0), None),
        (_, 2) => (None, Some(0)),
        (_, 3) => (Some(0), Some(count * 8)),
        _ => (None, None),
    };
    let heights = (0..count)
        .map(|k| {
            let at = base + heights_at? + k * 4;
            Some(f32::from_le_bytes(mh2o.get(at..at + 4)?.try_into().ok()?))
        })
        .collect();
    let depths = (0..count)
        .map(|k| Some(f32::from(*mh2o.get(base + depths_at? + k)?) / 255.0))
        .collect();
    (heights, depths)
}

#[allow(clippy::too_many_arguments)]
fn append_instance(
    instance: &Mh2oInstance,
    mcnk_col: u32,
    mcnk_row: u32,
    exists: Option<u64>,
    heights: &[Option<f32>],
    depths: &[Option<f32>],
    origin: (f32, f32),
    liquid_types: &HashMap<u16, u8>,
    buffers: &mut HashMap<u8, LiquidLayer>,
) {
    let width = instance.width as usize; // cells along X (world Y)
    let height = instance.height as usize; // cells along Y (world X)
    if width == 0 || height == 0 {
        return;
    }
    // The instance header bounds the surface: every vertex height lies in
    // [min_height_level, max_height_level]. Clamping to it is a guard against
    // a corrupt record punching a spike through the terrain; flat instances
    // (min == max, the common case) have no heightmap at all and sit at it.
    let lo = instance.min_height_level;
    let hi = instance.max_height_level.max(lo);
    // Vertex (i, j) of the instance's own (width + 1) x (height + 1) grid.
    let vertex = |i: usize, j: usize| j * (width + 1) + i;
    let corner_z = |i: usize, j: usize| -> f32 {
        match heights.get(vertex(i, j)).copied().flatten() {
            Some(h) if h.is_finite() => h.clamp(lo, hi),
            _ => lo,
        }
    };
    // No depthmap reads as deep: the surface shows at full opacity.
    let corner_depth = |i: usize, j: usize| depths.get(vertex(i, j)).copied().flatten().unwrap_or(1.0);

    let category = liquid_category(*liquid_types.get(&instance.liquid_type).unwrap_or(&0));
    append_cells(
        layer_for(buffers, category),
        origin,
        (mcnk_col * 8 + instance.x_offset as u32, mcnk_row * 8 + instance.y_offset as u32),
        (width, height),
        |ci, cj| cell_present(exists, ci, cj, width),
        |i, j| (corner_z(i, j), corner_depth(i, j)),
    );
}

/// The ADT's top-level MCNK chunks in file order, raw, each starting at its
/// own 8-byte chunk header.
fn mcnk_chunks(adt: &[u8]) -> impl Iterator<Item = &[u8]> {
    let mut pos = 0usize;
    std::iter::from_fn(move || {
        while pos + 8 <= adt.len() {
            let start = pos;
            let size = u32::from_le_bytes(adt[pos + 4..pos + 8].try_into().ok()?) as usize;
            pos = start.checked_add(8 + size).filter(|&end| end <= adt.len())?;
            if adt[start..start + 4] == *b"KNCM" {
                return Some(&adt[start..pos]);
            }
        }
        None
    })
}

/// Appends the MCLQ liquid of one raw MCNK chunk, unless MH2O covers it.
///
/// Read from the raw bytes: wow-adt sizes the sub-chunk by its own size field,
/// which the files leave at 0, and so finds no liquid in any of them. The MCNK
/// header has the real extent: `sizeMCLQ` (0x64), from `ofsMCLQ` (0x60), which
/// counts from the MCNK's chunk header and spans the MCLQ's own 8-byte header
/// (so 8 is no liquid) then one `MCLQ_LAYER` per `MCLQ_KINDS` flag set.
fn append_mclq(
    mcnk: &[u8],
    from_mh2o: &[bool; 256],
    origin: (f32, f32),
    buffers: &mut HashMap<u8, LiquidLayer>,
) {
    // MCNK header fields sit past the 8-byte chunk header.
    let field = |offset: usize| -> Option<u32> {
        Some(u32::from_le_bytes(mcnk.get(8 + offset..12 + offset)?.try_into().ok()?))
    };
    let (Some(flags), Some(col), Some(row), Some(ofs), Some(size)) =
        (field(0x00), field(0x04), field(0x08), field(0x60), field(0x64))
    else {
        return;
    };
    if col >= 16 || row >= 16 || from_mh2o[(row * 16 + col) as usize] || size <= 8 {
        return;
    }
    let (ofs, size) = (ofs as usize, size as usize);
    let Some(data) = ofs.checked_add(size).and_then(|end| mcnk.get(ofs + 8..end)) else {
        return;
    };
    let kinds = MCLQ_KINDS.iter().filter(|(flag, _)| flags & flag != 0);
    for (&(_, category), raw) in kinds.zip(data.chunks_exact(MCLQ_LAYER)) {
        append_mclq_layer(raw, category, (col, row), origin, layer_for(buffers, category));
    }
}

/// Appends one MCLQ layer covering MCNK (`col`, `row`): 9×9 vertices, row by
/// row with X fastest, then a tile byte per cell.
fn append_mclq_layer(
    raw: &[u8],
    category: &str,
    (col, row): (u32, u32),
    origin: (f32, f32),
    layer: &mut LiquidLayer,
) {
    // `raw` is exactly one MCLQ_LAYER, so every read below is in bounds.
    let f32_at = |at: usize| f32::from_le_bytes([raw[at], raw[at + 1], raw[at + 2], raw[at + 3]]);
    // As for MH2O, the layer's range bounds its vertex heights.
    let (lo, hi) = (f32_at(0), f32_at(4));
    if !lo.is_finite() || !hi.is_finite() {
        return;
    }
    let hi = hi.max(lo);
    let vertex = |i: usize, j: usize| 8 + (j * 9 + i) * 8;
    let tiles = &raw[8 + 81 * 8..8 + 81 * 8 + 64];
    // Water and ocean vertices lead with their depth byte; magma and slime
    // ones with texture coordinates instead, and read as deep.
    let has_depth = matches!(category, "water" | "ocean");
    append_cells(
        layer,
        origin,
        (col * 8, row * 8),
        (8, 8),
        |ci, cj| tiles[cj * 8 + ci] & MCLQ_TILE_DRY == 0,
        |i, j| {
            let at = vertex(i, j);
            // FLT_MAX marks a vertex only dry cells touch.
            let z = match f32_at(at + 4) {
                z if z.is_finite() && z != f32::MAX => z.clamp(lo, hi),
                _ => lo,
            };
            let depth = if has_depth { f32::from(raw[at]) / 255.0 } else { 1.0 };
            (z, depth)
        },
    );
}

/// The merged buffer of `category`, created on first use.
fn layer_for<'a>(buffers: &'a mut HashMap<u8, LiquidLayer>, category: &str) -> &'a mut LiquidLayer {
    buffers.entry(category_code(category)).or_insert_with(|| LiquidLayer {
        category: category.to_string(),
        ..Default::default()
    })
}

/// Emits one quad (two triangles) per present cell of a `width` × `height`
/// liquid grid whose first vertex is vertex `(gx0, gy0)` of the tile's 129×129
/// liquid lattice. `corner(i, j)` gives the height and depth of the grid's own
/// vertex (i, j). Cells don't share vertices (simpler, and tiles are small).
fn append_cells(
    layer: &mut LiquidLayer,
    (tile_world_x0, tile_world_y0): (f32, f32),
    (gx0, gy0): (u32, u32),
    (width, height): (usize, usize),
    present: impl Fn(usize, usize) -> bool,
    corner: impl Fn(usize, usize) -> (f32, f32),
) {
    for cj in 0..height {
        for ci in 0..width {
            if !present(ci, cj) {
                continue;
            }

            let base = (layer.positions.len() / 3) as u32;
            for (di, dj) in [(0, 0), (1, 0), (1, 1), (0, 1)] {
                let (i, j) = (ci + di, cj + dj);
                let gx = gx0 + i as u32; // world Y axis
                let gy = gy0 + j as u32; // world X axis
                let world_y = tile_world_y0 - gx as f32 * UNIT;
                let world_x = tile_world_x0 - gy as f32 * UNIT;
                let (z, depth) = corner(i, j);
                layer.positions.extend_from_slice(&[world_x, world_y, z]);
                layer.depths.push(depth);
            }
            // Two CCW triangles for the quad: (0,1,2) (0,2,3).
            layer.indices.extend_from_slice(&[base, base + 1, base + 2, base, base + 2, base + 3]);
        }
    }
}

/// Whether cell (ci, cj) of the instance carries liquid. The exists bitmap is
/// `width*height` bits, row-major (x fastest), packed little-endian; absent
/// means every cell renders.
fn cell_present(exists: Option<u64>, ci: usize, cj: usize, width: usize) -> bool {
    match exists {
        Some(bits) => {
            let bit = cj * width + ci;
            bit >= 64 || bits & (1u64 << bit) != 0
        }
        None => true,
    }
}

/// Maps a LiquidType.dbc "type" (0 water, 1 ocean, 2 magma, 3 slime) to a
/// stable category label for the frontend's materials.
pub(crate) fn liquid_category(type_code: u8) -> &'static str {
    match type_code {
        1 => "ocean",
        2 => "magma",
        3 => "slime",
        _ => "water",
    }
}

pub(crate) fn category_code(category: &str) -> u8 {
    match category {
        "ocean" => 1,
        "magma" => 2,
        "slime" => 3,
        _ => 0,
    }
}

/// Reads LiquidType.dbc, mapping each liquid-type id to its type code (field
/// index 3, stable across 3.3.5 layouts: id@0, name@4, flags@8, type@12).
pub fn parse_liquid_types(bytes: &[u8]) -> HashMap<u16, u8> {
    let mut out = HashMap::new();
    let u32_at = |offset: usize| -> Option<u32> {
        Some(u32::from_le_bytes(bytes.get(offset..offset + 4)?.try_into().ok()?))
    };
    if bytes.get(..4) != Some(b"WDBC") {
        return out;
    }
    let (Some(count), Some(size)) = (u32_at(4), u32_at(12)) else {
        return out;
    };
    let (count, size) = (count as usize, size as usize);
    if size < 16 {
        return out;
    }
    for record in 0..count {
        let base = 20 + record * size;
        if let (Some(id), Some(type_code)) = (u32_at(base), u32_at(base + 12)) {
            out.insert(id as u16, type_code as u8);
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A raw MCNK (`col`, `row`) carrying one MCLQ river layer at `level`,
    /// wet only in cell (1, 0), whose vertex (1, 0) is 102/255 deep. Every
    /// other vertex is FLT_MAX, as the files mark the ones only dry cells use.
    fn mcnk_with_river(col: u32, row: u32, level: f32) -> Vec<u8> {
        let mut layer = vec![0u8; MCLQ_LAYER];
        layer[0..4].copy_from_slice(&level.to_le_bytes());
        layer[4..8].copy_from_slice(&level.to_le_bytes());
        for k in 0..81 {
            let at = 8 + k * 8;
            layer[at + 4..at + 8].copy_from_slice(&f32::MAX.to_le_bytes());
        }
        for (i, j) in [(1, 0), (2, 0), (1, 1), (2, 1)] {
            let at = 8 + (j * 9 + i) * 8;
            layer[at + 4..at + 8].copy_from_slice(&level.to_le_bytes());
        }
        layer[8 + 8] = 102;
        let tiles = 8 + 81 * 8;
        layer[tiles..tiles + 64].fill(0x0F);
        layer[tiles + 1] = 0x44;

        let mut header = vec![0u8; 128];
        let mcnk_len = 8 + 128 + 8 + MCLQ_LAYER;
        header[0x00..0x04].copy_from_slice(&0x04u32.to_le_bytes());
        header[0x04..0x08].copy_from_slice(&col.to_le_bytes());
        header[0x08..0x0C].copy_from_slice(&row.to_le_bytes());
        header[0x60..0x64].copy_from_slice(&(8u32 + 128).to_le_bytes());
        header[0x64..0x68].copy_from_slice(&(8 + MCLQ_LAYER as u32).to_le_bytes());

        let mut mcnk = b"KNCM".to_vec();
        mcnk.extend_from_slice(&((mcnk_len - 8) as u32).to_le_bytes());
        mcnk.extend_from_slice(&header);
        // The MCLQ sub-chunk, its size field left at 0 as in the files.
        mcnk.extend_from_slice(b"QLCM");
        mcnk.extend_from_slice(&0u32.to_le_bytes());
        mcnk.extend_from_slice(&layer);
        mcnk
    }

    #[test]
    fn mclq_emits_its_wet_cells_only() {
        let mut adt = b"REVM".to_vec();
        adt.extend_from_slice(&4u32.to_le_bytes());
        adt.extend_from_slice(&18u32.to_le_bytes());
        adt.extend(mcnk_with_river(5, 4, 10.5));

        let origin = (TILE, 2.0 * TILE);
        let mut buffers = HashMap::new();
        for mcnk in mcnk_chunks(&adt) {
            append_mclq(mcnk, &[false; 256], origin, &mut buffers);
        }

        let water = &buffers[&category_code("water")];
        assert_eq!(water.indices.len(), 6, "one quad");
        // Corner (0, 0) of cell (1, 0) is lattice vertex (5 * 8 + 1, 4 * 8).
        assert_eq!(water.positions[0], TILE - 32.0 * UNIT);
        assert_eq!(water.positions[1], 2.0 * TILE - 41.0 * UNIT);
        assert!(water.positions.chunks(3).all(|p| p[2] == 10.5));
        assert_eq!(water.depths[0], 0.4);
        assert_eq!(water.depths[1], 0.0);
    }

    #[test]
    fn mclq_yields_to_mh2o() {
        let mcnk = mcnk_with_river(5, 4, 10.5);
        let mut covered = [false; 256];
        covered[4 * 16 + 5] = true;
        let mut buffers = HashMap::new();
        append_mclq(&mcnk, &covered, (0.0, 0.0), &mut buffers);
        assert!(buffers.is_empty());
    }
}

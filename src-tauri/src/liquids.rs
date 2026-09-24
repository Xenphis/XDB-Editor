use std::collections::HashMap;
use std::io::Cursor;

use serde::{Deserialize, Serialize};
use wow_adt::{parse_adt, Mh2oInstance, ParsedAdt};

use crate::wmo::find_chunk;

/// ADT liquid (MH2O) extraction for the 3D water layer.
///
/// WotLK stores water per-ADT in the MH2O chunk: for each of the 256 MCNK
/// cells, zero or more liquid layers, each covering a sub-rectangle of the
/// MCNK's 8×8 liquid grid with per-vertex heights (or a flat level). This
/// turns that into world-space triangle meshes grouped by liquid category so
/// the scene (three space == WoW space: X north, Y west, Z up) can render them
/// alongside @wowserhq/scene's terrain.

/// Yards per ADT tile; a tile is 16 MCNKs, each 8 liquid cells.
const TILE: f32 = 1600.0 / 3.0;
/// Yards per liquid cell (tile / 16 MCNK / 8 cells = tile / 128).
const UNIT: f32 = TILE / 128.0;

/// One merged mesh for all liquid of a given category in a tile.
#[derive(Serialize, Deserialize, Default)]
pub struct LiquidLayer {
    pub category: String,
    /// Flat XYZ triplets in world (== three) space.
    pub positions: Vec<f32>,
    pub indices: Vec<u32>,
    /// How deep the liquid is under each vertex, 0..1 (MH2O's depth byte over
    /// 255), one per position. The client fades a surface out where it is
    /// shallow, which is what hides the liquid an MH2O cell carries over dry
    /// ground at its edges. Empty when the source has no depth (WMO MLIQ),
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
    let Some(water) = &root.water_data else {
        return Ok(LiquidMesh::default());
    };
    // The raw chunk, for the vertex data (see `instance_vertices`).
    let mh2o = find_chunk(adt_bytes, *b"O2HM").unwrap_or(&[]);

    // World coords of the tile's local (0,0) corner (north-west: max X and Y).
    // Matches the 2D minimap mapping (TrinityCore convention): col == tile_x
    // drives world Y (west), row == tile_y drives world X (north).
    let tile_world_x0 = (32.0 - tile_y as f32) * TILE;
    let tile_world_y0 = (32.0 - tile_x as f32) * TILE;

    // One vertex/index buffer per category, keyed by category code.
    let mut buffers: HashMap<u8, LiquidLayer> = HashMap::new();

    for (entry_idx, entry) in water.entries.iter().enumerate() {
        // MCNK grid position for this entry (fall back to row-major index).
        let (mcnk_col, mcnk_row) = root
            .mcnk_chunks
            .get(entry_idx)
            .map(|c| (c.header.index_x, c.header.index_y))
            .unwrap_or(((entry_idx % 16) as u32, (entry_idx / 16) as u32));

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
                tile_world_x0,
                tile_world_y0,
                liquid_types,
                &mut buffers,
            );
        }
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
    tile_world_x0: f32,
    tile_world_y0: f32,
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
    let layer = buffers.entry(category_code(category)).or_insert_with(|| LiquidLayer {
        category: category.to_string(),
        ..Default::default()
    });

    // Emit one quad (two triangles) per present cell; cells don't share
    // vertices (simpler, and tiles are small). Cell (ci, cj) uses corners
    // (ci..ci+1, cj..cj+1) of the instance's local vertex grid.
    for cj in 0..height {
        for ci in 0..width {
            if !cell_present(exists, ci, cj, width) {
                continue;
            }

            let base = (layer.positions.len() / 3) as u32;
            for (di, dj) in [(0, 0), (1, 0), (1, 1), (0, 1)] {
                let i = ci + di;
                let j = cj + dj;
                let gx = mcnk_col * 8 + instance.x_offset as u32 + i as u32; // world Y axis
                let gy = mcnk_row * 8 + instance.y_offset as u32 + j as u32; // world X axis
                let world_y = tile_world_y0 - gx as f32 * UNIT;
                let world_x = tile_world_x0 - gy as f32 * UNIT;
                layer.positions.extend_from_slice(&[world_x, world_y, corner_z(i, j)]);
                layer.depths.push(corner_depth(i, j));
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

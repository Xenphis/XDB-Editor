use std::collections::hash_map::DefaultHasher;
use std::collections::{HashMap, VecDeque};
use std::hash::{Hash, Hasher};
use std::io::Cursor;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Condvar, Mutex, MutexGuard};
use std::time::{Duration, UNIX_EPOCH};

use image::imageops::FilterType;
use serde::{Deserialize, Serialize};
use tauri::http::header::{ACCESS_CONTROL_ALLOW_ORIGIN, CACHE_CONTROL, CONTENT_TYPE};
use tauri::http::{Request, Response};
use tauri::Manager;
use wow_mpq::PatchChain;

use crate::liquids::{build_tile_liquids, LiquidMesh};
use crate::spell_dbc::{build_index, SpellIndex};
use crate::wmo::{adt_wmo_placements, build_model, to_m2_path, wdt_wmo_placements, WmoModel, WmoPlacement};

/// Minimap tile pipeline for the map editor.
///
/// The 3.3.5 client stores one 256×256 minimap texture per ADT cell (64×64
/// grid, 533.33333 yd per cell), as content-hashed BLPs under
/// `textures\minimap\` with `md5translate.trs` mapping plain names
/// (`Azeroth\map30_48.blp`) to hashes. This module opens the client MPQs as a
/// patch chain, indexes that mapping, and serves a slippy tile pyramid over
/// the `minimap://` scheme: zoom 8 is 1 leaflet tile = 1 ADT cell, lower
/// zooms are composed from their four children. Everything is cached as PNG
/// on disk (app cache dir), including misses (empty files), because most of
/// the 64×64 grid is ocean without minimaps.
///
/// Opening the MPQ chain can't persist across launches (it's in-memory), so
/// to keep startup snappy the map list is cached on disk keyed by a signature
/// of the client's archives: an unchanged client returns its list instantly
/// while the chain is (re)opened on a background thread; tile/asset requests
/// that arrive before it's ready simply wait.

/// Native zoom: leaflet tile (x, y) == ADT cell (x, y).
const TILE_ZOOM: u32 = 8;
/// Lowest zoom served (16×16 ADT cells per tile).
const MIN_ZOOM: u32 = 4;
const TILE_SIZE: u32 = 256;

/// Bump when anything cached under the signature changes shape or meaning for
/// identical archives — rendered tiles (e.g. the wow-blp 0.7 palettized-BLP
/// R↔B fix) as well as the extracted WMO models (e.g. the MOCV vertex-lighting
/// fix, the MLIQ liquids) — so the stale entries are dropped and rebuilt.
const PIPELINE_VERSION: u32 = 4;

/// Cap of the in-memory MPQ read cache (raw, still-compressed-on-disk assets
/// decompressed once and reused across 3D re-opens within a session).
const READ_CACHE_BYTES: usize = 128 * 1024 * 1024;
/// How long a tile/asset request waits for a background chain open.
const OPEN_WAIT: Duration = Duration::from_secs(30);

pub struct MinimapState {
    inner: Mutex<StateInner>,
    /// Signalled when a background open finishes (success or failure).
    ready: Condvar,
}

#[derive(Default)]
struct StateInner {
    data: Option<MinimapData>,
    /// A background chain open is in progress; requests should wait, not 503.
    opening: bool,
}

impl MinimapState {
    pub fn new() -> Self {
        Self { inner: Mutex::new(StateInner::default()), ready: Condvar::new() }
    }

    /// Runs `f` against the loaded client, holding the state lock only for its
    /// duration.
    ///
    /// One lock guards the whole client (the patch chain isn't shareable), so
    /// everything that touches it — every terrain/texture/model asset the 3D
    /// scene streams, every minimap tile, every ADT parse — contends on it.
    /// Callers must therefore keep `f` down to the part that genuinely needs
    /// the chain: pull the bytes out here, then decode them after this
    /// returns. Parsing an ADT or encoding a PNG while holding the lock stalls
    /// terrain streaming for as long as it takes, which is what the 3D view
    /// showed as holes in the ground when flying into a city.
    fn with_data<T>(&self, f: impl FnOnce(&mut MinimapData) -> T) -> Result<T, String> {
        let mut inner = wait_for_data(self).ok_or_else(|| "client not loaded".to_string())?;
        let data = inner.data.as_mut().expect("wait_for_data returned without data");
        Ok(f(data))
    }

    /// Waits out any in-progress background open and returns the client's disk
    /// cache root. Every command calls this first, so it doubles as the single
    /// "is a client loaded?" gate: past it, a failed asset read means the file
    /// is absent, not that the client is missing.
    fn wait_ready(&self) -> Result<PathBuf, String> {
        self.with_data(|data| data.cache_dir.clone())
    }

    /// Reads one file from the patch chain, memoized. Takes and releases the
    /// lock on its own, so a caller reading several files (a WMO root plus its
    /// groups) parses each one with the lock free.
    fn read_asset(&self, path: &str) -> Result<Arc<Vec<u8>>, String> {
        self.with_data(|data| data.read_cached(path))?
    }

    /// The lazily-parsed DBC tables, each shared out by handle so callers work
    /// on them with the lock released (and without deep-copying the table, as
    /// the liquid path used to do once per tile).
    fn liquid_types(&self) -> Result<Arc<HashMap<u16, u8>>, String> {
        self.with_data(|data| data.liquid_types())
    }

    fn creature_models(&self) -> Result<Arc<HashMap<u32, CreatureModelInfo>>, String> {
        self.with_data(|data| data.creature_models())
    }

    fn gameobject_models(&self) -> Result<Arc<HashMap<u32, GameObjectModelInfo>>, String> {
        self.with_data(|data| data.gameobject_models())
    }

    fn zone_bounds(&self) -> Result<Arc<HashMap<u32, ZoneWorldBounds>>, String> {
        self.with_data(|data| data.zone_bounds())
    }

    /// Spell.dbc name/icon index, built on first use (see `spell_dbc.rs`).
    ///
    /// Unlike the small DBCs above this one is NOT parsed inside `with_data`.
    /// Spell.dbc is ~46 MB and takes hundreds of ms to walk, and the lock this
    /// would hold is the same one every terrain/texture request queues on — the
    /// 3D view would stall for the whole parse. So the bytes are pulled out
    /// under the lock, the lock is released, and the parse happens outside,
    /// exactly like `render_native_tile` does with minimap BLPs.
    ///
    /// Two racing first callers can both parse; the loser's work is dropped.
    /// That is cheaper than holding a lock across the parse to prevent it.
    pub(crate) fn spell_index(&self) -> Result<Arc<SpellIndex>, String> {
        if let Some(index) = self.with_data(|data| data.spell_index.clone())? {
            return Ok(index);
        }
        // Read through the chain directly rather than `read_cached`: 46 MB of
        // DBC would evict most of the 128 MB read cache, which exists for the
        // assets the 3D scene actually re-reads. This one is parsed once and
        // then lives on as the index.
        let spells = self.with_data(|data| {
            data.chain
                .read_file("DBFilesClient\\Spell.dbc")
                .map_err(|e| format!("Spell.dbc: {e}"))
        })??;
        // The three cross-reference DBCs (icon, cast time, duration, range)
        // are each a few hundred KB at most, so reading them alongside Spell.dbc
        // costs nothing extra worth splitting into their own lock round-trips.
        let icons =
            self.with_data(|data| data.chain.read_file("DBFilesClient\\SpellIcon.dbc").ok())?;
        let cast_times =
            self.with_data(|data| data.chain.read_file("DBFilesClient\\SpellCastTimes.dbc").ok())?;
        let durations =
            self.with_data(|data| data.chain.read_file("DBFilesClient\\SpellDuration.dbc").ok())?;
        let ranges =
            self.with_data(|data| data.chain.read_file("DBFilesClient\\SpellRange.dbc").ok())?;

        // Lock released for the expensive half.
        let index = Arc::new(build_index(
            &spells,
            icons.as_deref(),
            cast_times.as_deref(),
            durations.as_deref(),
            ranges.as_deref(),
        ));
        log::info!("spell_dbc: indexed {} spells", index.len());
        self.with_data(|data| data.spell_index = Some(Arc::clone(&index)))?;
        Ok(index)
    }
}

pub struct MinimapData {
    chain: PatchChain,
    /// Key: lowercased map directory name from md5translate.trs.
    maps: HashMap<String, MapEntry>,
    cache_dir: PathBuf,
    read_cache: ReadCache,
    /// LiquidType.dbc id -> type code, parsed lazily on first liquid request.
    liquid_types: Option<Arc<HashMap<u16, u8>>>,
    /// CreatureDisplayInfo/ModelData.dbc: display id -> M2 model + scale, built
    /// lazily on the first creature-spawn request (empty if the DBCs are gone).
    creature_models: Option<Arc<HashMap<u32, CreatureModelInfo>>>,
    /// GameObjectDisplayInfo.dbc: display id -> model path, built lazily on the
    /// first gameobject-model request (empty if the DBC is gone).
    gameobject_models: Option<Arc<HashMap<u32, GameObjectModelInfo>>>,
    /// WorldMapArea.dbc: AreaTable zone id -> world bounds, parsed lazily on
    /// the first zone-bounds request (empty if the DBC is gone).
    zone_bounds: Option<Arc<HashMap<u32, ZoneWorldBounds>>>,
    /// Spell.dbc (+ SpellIcon.dbc): searchable spell name/icon index, built
    /// lazily on the first spell lookup (empty if the DBCs are gone). Built by
    /// `MinimapState::spell_index`, which parses outside the state lock.
    spell_index: Option<Arc<SpellIndex>>,
}

/// World-space rectangle of a zone's UI map (WorldMapArea.dbc), used to scope
/// per-zone queries on tables that only store raw positions (game_tele).
#[derive(Serialize, Clone, Copy)]
#[serde(rename_all = "camelCase")]
pub struct ZoneWorldBounds {
    pub min_x: f32,
    pub max_x: f32,
    pub min_y: f32,
    pub max_y: f32,
}

/// The client asset needed to render one creature display: the `.m2` model path
/// (over the `mpq://` scheme) and the combined DBC display/model scale.
#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CreatureModelInfo {
    pub model: String,
    pub scale: f32,
    /// Skin BLPs the M2's component-slot textures need to render at all — the
    /// M2 names them only by component slot, leaving the renderer to supply the
    /// actual images. For ordinary creatures these are the monster skins 1-3
    /// from CreatureDisplayInfo's TextureVariation fields (empties dropped). For
    /// humanoid NPCs built on character models (Defias, guards…) there is no
    /// TextureVariation; their body is a single pre-baked composite named in
    /// CreatureDisplayInfoExtra, and that one bake stands in for the slot(s).
    pub textures: Vec<String>,
}

/// The client asset needed to render one gameobject display: the model path
/// (over the `mpq://` scheme) and whether it's a WMO rather than an M2.
///
/// Unlike creatures, gameobjects are split across two very different formats:
/// most props are `.m2` doodads, but the large ones (ships, elevators, doors of
/// city gates…) are WMOs and need the WMO pipeline (`minimap_wmo_model`)
/// instead of the model manager. There is no scale field: unlike
/// CreatureDisplayInfo, GameObjectDisplayInfo stores none — the client renders
/// gameobject models at their authored size, scaled only by
/// `gameobject_template.size`.
#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GameObjectModelInfo {
    pub model: String,
    pub is_wmo: bool,
}

impl MinimapData {
    /// Reads a raw file from the chain, memoizing the decompressed bytes.
    fn read_cached(&mut self, path: &str) -> Result<Arc<Vec<u8>>, String> {
        self.read_cache.get_or_read(&mut self.chain, path)
    }

    /// LiquidType categories, parsed from the DBC on first use (empty if the
    /// DBC is missing — the builder then defaults everything to water).
    ///
    /// Handed out behind an `Arc` so the caller can drop the state lock and
    /// still hold the table while it builds a mesh.
    fn liquid_types(&mut self) -> Arc<HashMap<u16, u8>> {
        if self.liquid_types.is_none() {
            let types = match self.chain.read_file("DBFilesClient\\LiquidType.dbc") {
                Ok(bytes) => crate::liquids::parse_liquid_types(&bytes),
                Err(e) => {
                    log::warn!("minimap: LiquidType.dbc unavailable, liquids uncategorized: {e}");
                    HashMap::new()
                }
            };
            self.liquid_types = Some(Arc::new(types));
        }
        self.liquid_types.clone().unwrap()
    }

    /// Creature display id -> renderable model, built once by composing
    /// CreatureDisplayInfo.dbc and CreatureModelData.dbc. Empty if either DBC
    /// is missing (creatures then simply don't render).
    fn creature_models(&mut self) -> Arc<HashMap<u32, CreatureModelInfo>> {
        if self.creature_models.is_none() {
            let display = self.chain.read_file("DBFilesClient\\CreatureDisplayInfo.dbc");
            let model = self.chain.read_file("DBFilesClient\\CreatureModelData.dbc");
            // Optional: humanoid NPCs on character models carry no
            // TextureVariation and instead name a pre-baked skin here. Missing
            // DBC just means those NPCs keep rendering untextured.
            let extra = self
                .chain
                .read_file("DBFilesClient\\CreatureDisplayInfoExtra.dbc")
                .ok();
            let resolved = match (display, model) {
                (Ok(d), Ok(m)) => build_creature_models(&d, &m, extra.as_deref()),
                _ => {
                    log::warn!("minimap: CreatureDisplayInfo/ModelData.dbc unavailable, creatures unresolved");
                    HashMap::new()
                }
            };
            self.creature_models = Some(Arc::new(resolved));
        }
        self.creature_models.clone().unwrap()
    }

    /// Gameobject display id -> renderable model, parsed once from
    /// GameObjectDisplayInfo.dbc. Empty if the DBC is missing (gameobjects then
    /// simply don't render).
    fn gameobject_models(&mut self) -> Arc<HashMap<u32, GameObjectModelInfo>> {
        if self.gameobject_models.is_none() {
            let resolved = match self.chain.read_file("DBFilesClient\\GameObjectDisplayInfo.dbc") {
                Ok(bytes) => parse_gameobject_display_info(&bytes).unwrap_or_default(),
                Err(e) => {
                    log::warn!("minimap: GameObjectDisplayInfo.dbc unavailable, gameobjects unresolved: {e}");
                    HashMap::new()
                }
            };
            self.gameobject_models = Some(Arc::new(resolved));
        }
        self.gameobject_models.clone().unwrap()
    }

    /// AreaTable zone id -> world bounds, parsed from WorldMapArea.dbc on
    /// first use (empty if the DBC is missing — zone scoping then no-ops).
    fn zone_bounds(&mut self) -> Arc<HashMap<u32, ZoneWorldBounds>> {
        if self.zone_bounds.is_none() {
            let bounds = match self.chain.read_file("DBFilesClient\\WorldMapArea.dbc") {
                Ok(bytes) => parse_world_map_area(&bytes).unwrap_or_default(),
                Err(e) => {
                    log::warn!("minimap: WorldMapArea.dbc unavailable, zones unscoped: {e}");
                    HashMap::new()
                }
            };
            self.zone_bounds = Some(Arc::new(bounds));
        }
        self.zone_bounds.clone().unwrap()
    }
}

struct MapEntry {
    /// Directory name with original casing, used as display name.
    name: String,
    /// Map.dbc id, when the directory matched a record (drives lighting in 3D).
    map_id: Option<u32>,
    /// ADT cell (x, y) -> full MPQ path of the hashed BLP.
    tiles: HashMap<(u32, u32), String>,
}

/// FIFO, byte-bounded cache of raw MPQ reads. FIFO (not true LRU) is enough:
/// the 3D scene fetches each asset a bounded number of times per session, and
/// the point is to skip re-decompressing them from big patch archives after a
/// component remount (2D↔3D toggle, map switch and back).
#[derive(Default)]
struct ReadCache {
    entries: HashMap<String, Arc<Vec<u8>>>,
    order: VecDeque<String>,
    bytes: usize,
}

impl ReadCache {
    fn get_or_read(
        &mut self,
        chain: &mut PatchChain,
        path: &str,
    ) -> Result<Arc<Vec<u8>>, String> {
        let key = path.to_ascii_lowercase();
        if let Some(hit) = self.entries.get(&key) {
            return Ok(hit.clone());
        }
        let bytes = chain.read_file(path).map_err(|e| e.to_string())?;
        let arc = Arc::new(bytes);
        self.bytes += arc.len();
        self.order.push_back(key.clone());
        self.entries.insert(key, arc.clone());
        while self.bytes > READ_CACHE_BYTES && self.order.len() > 1 {
            if let Some(old) = self.order.pop_front() {
                if let Some(evicted) = self.entries.remove(&old) {
                    self.bytes -= evicted.len();
                }
            }
        }
        Ok(arc)
    }
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MapInfo {
    pub id: String,
    pub name: String,
    pub map_id: Option<u32>,
    pub tile_count: usize,
    pub min_x: u32,
    pub max_x: u32,
    pub min_y: u32,
    pub max_y: u32,
}

/// On-disk map-list cache, invalidated when the archive signature changes.
#[derive(Serialize, Deserialize)]
struct CachedIndex {
    signature: String,
    maps: Vec<MapInfo>,
}

/// Indexes the client's minimaps. `client_path` is the WoW root or its `Data`
/// folder. Returns the available maps, sorted by name.
///
/// Fast path: when a cached index matches the client's current archives, it's
/// returned at once and the chain is opened on a background thread. Otherwise
/// the chain is opened synchronously, the index built and cached.
#[tauri::command]
pub async fn minimap_load_client(
    app: tauri::AppHandle,
    client_path: String,
) -> Result<Vec<MapInfo>, String> {
    let base_cache = app
        .path()
        .app_cache_dir()
        .map_err(|e| format!("cache dir unavailable: {e}"))?
        .join("minimap-tiles");
    let index_path = base_cache.join("index.json");

    // Cheap: no archive is opened to compute the signature.
    let data_dir = resolve_data_dir(&client_path)?;
    let archives = discover_archives(&data_dir)?;
    let signature = archives_signature(&archives);
    // Tiles live under the signature so patched data never serves stale tiles.
    let cache_dir = base_cache.join(&signature);

    if let Some(maps) = read_cached_index(&index_path, &signature) {
        begin_background_open(app.clone(), archives, cache_dir);
        return Ok(maps);
    }

    let build_cache_dir = cache_dir.clone();
    let data = tauri::async_runtime::spawn_blocking(move || build_data(archives, build_cache_dir))
        .await
        .map_err(|e| e.to_string())??;

    let infos = map_infos(&data);
    write_cached_index(&index_path, &signature, &infos);
    prune_old_caches(&base_cache, &signature);

    let state = app.state::<MinimapState>();
    let mut inner = state.inner.lock().unwrap();
    inner.data = Some(data);
    inner.opening = false;
    state.ready.notify_all();
    Ok(infos)
}

/// Extracts the 3D water meshes for one ADT tile, in world coordinates.
/// `map` is the map directory (e.g. "Azeroth"); `x`/`y` are the ADT tile
/// (col/row), same numbering as the minimap tiles. Result is cached on disk.
#[tauri::command]
pub async fn minimap_adt_liquids(
    app: tauri::AppHandle,
    map: String,
    x: u32,
    y: u32,
) -> Result<LiquidMesh, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<MinimapState>();
        let cache_dir = state.wait_ready()?;

        let cache_path = cache_dir
            .join("liquids")
            .join(map.to_ascii_lowercase())
            .join(format!("{x}_{y}.json"));
        if let Ok(bytes) = std::fs::read(&cache_path) {
            if let Ok(mesh) = serde_json::from_slice::<LiquidMesh>(&bytes) {
                return Ok(mesh);
            }
        }

        // Same path the 3D scene streams, so this hits the shared read cache.
        let adt_path = format!("world\\maps\\{map}\\{map}_{x}_{y}.adt");
        let adt_bytes = match state.read_asset(&adt_path) {
            Ok(bytes) => bytes,
            // A missing ADT (ocean-only tile edge) is "no liquid", not an error.
            Err(_) => return Ok(LiquidMesh::default()),
        };
        let types = state.liquid_types()?;

        // Lock released: an ADT is megabytes, and its MH2O walk used to block
        // every other asset request for its whole duration.
        let mesh = build_tile_liquids(&adt_bytes, x, y, &types)?;

        write_json_cache(&cache_path, &mesh);
        Ok(mesh)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// WMO placements for one ADT tile (outdoor buildings). Result cached on disk.
#[tauri::command]
pub async fn minimap_adt_wmo_placements(
    app: tauri::AppHandle,
    map: String,
    x: u32,
    y: u32,
) -> Result<Vec<WmoPlacement>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<MinimapState>();
        let cache_dir = state.wait_ready()?;

        let cache_path = cache_dir
            .join("wmo/placements")
            .join(map.to_ascii_lowercase())
            .join(format!("{x}_{y}.json"));
        if let Ok(bytes) = std::fs::read(&cache_path) {
            if let Ok(p) = serde_json::from_slice::<Vec<WmoPlacement>>(&bytes) {
                return Ok(p);
            }
        }

        let adt_path = format!("world\\maps\\{map}\\{map}_{x}_{y}.adt");
        // Bytes out under the lock, MODF walk with it released.
        let placements = match state.read_asset(&adt_path) {
            Ok(bytes) => adt_wmo_placements(&bytes),
            Err(_) => Vec::new(), // missing ADT (ocean edge) = no buildings
        };
        write_json_cache(&cache_path, &placements);
        Ok(placements)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Global WMO placements from the map's WDT (WMO-only maps: dungeons…).
#[tauri::command]
pub async fn minimap_global_wmo_placements(
    app: tauri::AppHandle,
    map: String,
) -> Result<Vec<WmoPlacement>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<MinimapState>();
        state.wait_ready()?;

        let wdt_path = format!("world\\maps\\{map}\\{map}.wdt");
        let placements = match state.read_asset(&wdt_path) {
            Ok(bytes) => wdt_wmo_placements(&bytes),
            Err(_) => Vec::new(),
        };
        Ok(placements)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// A WMO's geometry + interior doodad sets (WMO-local space). Cached on disk;
/// referenced by many placements/tiles, so keyed on the WMO path only.
#[tauri::command]
pub async fn minimap_wmo_model(
    app: tauri::AppHandle,
    filename: String,
) -> Result<WmoModel, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<MinimapState>();
        let cache_dir = state.wait_ready()?;

        let flat = filename.to_ascii_lowercase().replace(['\\', '/'], "_");
        let cache_path = cache_dir.join("wmo/models").join(format!("{flat}.json"));
        if let Ok(bytes) = std::fs::read(&cache_path) {
            if let Ok(model) = serde_json::from_slice::<WmoModel>(&bytes) {
                return Ok(model);
            }
        }

        // A city WMO is a root plus dozens of group files, and merging their
        // batches is the longest job in this module. Each read grabs the lock
        // by itself and drops it again, so the merging in between runs free
        // instead of freezing the terrain stream for the whole build.
        let types = state.liquid_types()?;
        let model = build_model(&filename, &types, |path| {
            state.read_asset(path).map(|bytes| bytes.as_ref().clone())
        })?;
        write_json_cache(&cache_path, &model);
        Ok(model)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Resolves creature display ids to their M2 model + scale. The client sends the
/// distinct display ids around the camera; the DBC pair is parsed once and
/// cached, so repeat calls (tile after tile) are just map lookups. Unknown ids
/// are omitted from the result.
#[tauri::command]
pub async fn minimap_creature_models(
    app: tauri::AppHandle,
    display_ids: Vec<u32>,
) -> Result<HashMap<u32, CreatureModelInfo>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<MinimapState>();
        let models = state.creature_models()?;
        let mut out = HashMap::with_capacity(display_ids.len());
        for id in display_ids {
            if let Some(info) = models.get(&id) {
                out.insert(id, info.clone());
            }
        }
        Ok(out)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Resolves gameobject display ids to their client model, the gameobject twin
/// of `minimap_creature_models`. The DBC is parsed once and cached, so repeat
/// calls are map lookups. Unknown ids are omitted from the result.
#[tauri::command]
pub async fn minimap_gameobject_models(
    app: tauri::AppHandle,
    display_ids: Vec<u32>,
) -> Result<HashMap<u32, GameObjectModelInfo>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<MinimapState>();
        let models = state.gameobject_models()?;
        let mut out = HashMap::with_capacity(display_ids.len());
        for id in display_ids {
            if let Some(info) = models.get(&id) {
                out.insert(id, info.clone());
            }
        }
        Ok(out)
    })
    .await
    .map_err(|e| e.to_string())?
}

fn write_json_cache<T: serde::Serialize>(cache_path: &std::path::Path, value: &T) {
    if let Some(parent) = cache_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_vec(value) {
        let _ = std::fs::write(cache_path, json);
    }
}

/// Opens the chain on a background thread, publishing it into the shared state
/// when done. Requests wait via `wait_for_data` until then.
fn begin_background_open(app: tauri::AppHandle, archives: Vec<(PathBuf, i32)>, cache_dir: PathBuf) {
    {
        let state = app.state::<MinimapState>();
        let mut inner = state.inner.lock().unwrap();
        inner.data = None;
        inner.opening = true;
    }
    std::thread::spawn(move || {
        let result = build_data(archives, cache_dir);
        let state = app.state::<MinimapState>();
        let mut inner = state.inner.lock().unwrap();
        match result {
            Ok(data) => inner.data = Some(data),
            Err(e) => log::error!("minimap: background client open failed: {e}"),
        }
        inner.opening = false;
        state.ready.notify_all();
    });
}

/// Locks the state and returns a guard once the chain is available, waiting
/// out any in-progress background open. `None` means no client is loaded (or
/// the open failed / timed out).
fn wait_for_data(state: &MinimapState) -> Option<MutexGuard<'_, StateInner>> {
    let mut inner = state.inner.lock().unwrap();
    loop {
        if inner.data.is_some() {
            return Some(inner);
        }
        if !inner.opening {
            return None;
        }
        let (guard, timeout) = state.ready.wait_timeout(inner, OPEN_WAIT).unwrap();
        inner = guard;
        if timeout.timed_out() && inner.data.is_none() {
            return None;
        }
    }
}

fn map_infos(data: &MinimapData) -> Vec<MapInfo> {
    let mut infos: Vec<MapInfo> = data
        .maps
        .iter()
        .filter(|(_, entry)| !entry.tiles.is_empty())
        .map(|(id, entry)| {
            let xs = entry.tiles.keys().map(|&(x, _)| x);
            let ys = entry.tiles.keys().map(|&(_, y)| y);
            MapInfo {
                id: id.clone(),
                name: entry.name.clone(),
                map_id: entry.map_id,
                tile_count: entry.tiles.len(),
                min_x: xs.clone().min().unwrap_or(0),
                max_x: xs.max().unwrap_or(0),
                min_y: ys.clone().min().unwrap_or(0),
                max_y: ys.max().unwrap_or(0),
            }
        })
        .collect();
    infos.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    infos
}

fn build_data(archives: Vec<(PathBuf, i32)>, cache_dir: PathBuf) -> Result<MinimapData, String> {
    let mut chain = open_chain(archives)?;

    let trs = chain
        .read_file("textures\\minimap\\md5translate.trs")
        .map_err(|e| format!("md5translate.trs not found in the client MPQs: {e}"))?;
    let trs = String::from_utf8_lossy(&trs);

    // Directory (lowercased) -> (id, Directory) from Map.dbc; ids drive the
    // 3D view's per-map lighting, exact casing gives nicer display names.
    let dbc_index = match chain.read_file("DBFilesClient\\Map.dbc") {
        Ok(bytes) => parse_map_dbc(&bytes).unwrap_or_default(),
        Err(e) => {
            log::warn!("minimap: Map.dbc unavailable, map ids unknown: {e}");
            HashMap::new()
        }
    };

    let mut maps: HashMap<String, MapEntry> = HashMap::new();
    for line in trs.lines() {
        let Some((plain, hashed)) = line.trim_end_matches('\r').split_once('\t') else {
            continue; // "dir: X" section headers and blank lines
        };
        let Some((dir_path, file)) = plain.rsplit_once('\\') else {
            continue;
        };
        // WMO minimaps ("WMO\...") have nested paths and non-mapX_Y names;
        // parse_tile_name filters them out along with noLiquid variants.
        let Some(cell) = parse_tile_name(&file.to_ascii_lowercase()) else {
            continue;
        };
        let map_dir = dir_path.rsplit('\\').next().unwrap_or(dir_path);
        let key = map_dir.to_ascii_lowercase();
        let entry = maps.entry(key).or_insert_with_key(|key| {
            let dbc = dbc_index.get(key);
            MapEntry {
                name: dbc.map(|(_, dir)| dir.clone()).unwrap_or_else(|| map_dir.to_string()),
                map_id: dbc.map(|&(id, _)| id),
                tiles: HashMap::new(),
            }
        });
        entry
            .tiles
            .insert(cell, format!("textures\\minimap\\{}", hashed.trim()));
    }

    if maps.is_empty() {
        return Err("md5translate.trs contained no map tiles".into());
    }

    Ok(MinimapData {
        chain,
        maps,
        cache_dir,
        read_cache: ReadCache::default(),
        liquid_types: None,
        creature_models: None,
        gameobject_models: None,
        zone_bounds: None,
        spell_index: None,
    })
}

/// Minimal WDBC reader for Map.dbc: field 0 is the map id, field 1 the
/// Directory string. Returns lowercased-directory -> (id, Directory).
/// WorldMapArea.dbc (3.3.5, build 12340): field 2 = AreaTable id (0 on the
/// whole-continent overview rows), fields 4-7 = locLeft/locRight/locTop/
/// locBottom in world yards (left/right run along Y, top/bottom along X).
/// Normalized to min/max so callers never deal with the sign conventions.
fn parse_world_map_area(bytes: &[u8]) -> Option<HashMap<u32, ZoneWorldBounds>> {
    let u32_at = |offset: usize| -> Option<u32> {
        Some(u32::from_le_bytes(bytes.get(offset..offset + 4)?.try_into().ok()?))
    };
    let f32_at = |offset: usize| -> Option<f32> {
        Some(f32::from_le_bytes(bytes.get(offset..offset + 4)?.try_into().ok()?))
    };
    if bytes.get(..4)? != b"WDBC" {
        return None;
    }
    let record_count = u32_at(4)? as usize;
    let record_size = u32_at(12)? as usize;
    if record_size < 32 {
        return None;
    }

    let mut out = HashMap::new();
    for record in 0..record_count {
        let base = 20 + record * record_size;
        let area_id = u32_at(base + 8)?;
        if area_id == 0 {
            continue;
        }
        let loc_left = f32_at(base + 16)?;
        let loc_right = f32_at(base + 20)?;
        let loc_top = f32_at(base + 24)?;
        let loc_bottom = f32_at(base + 28)?;
        out.insert(
            area_id,
            ZoneWorldBounds {
                min_x: loc_top.min(loc_bottom),
                max_x: loc_top.max(loc_bottom),
                min_y: loc_left.min(loc_right),
                max_y: loc_left.max(loc_right),
            },
        );
    }
    Some(out)
}

/// World bounds of one zone (WorldMapArea.dbc); None when the zone has no
/// world map entry. Errors while no client is loaded.
#[tauri::command]
pub async fn minimap_zone_bounds(
    app: tauri::AppHandle,
    zone_id: u32,
) -> Result<Option<ZoneWorldBounds>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<MinimapState>();
        Ok(state.zone_bounds()?.get(&zone_id).copied())
    })
    .await
    .map_err(|e| e.to_string())?
}

fn parse_map_dbc(bytes: &[u8]) -> Option<HashMap<String, (u32, String)>> {
    let u32_at = |offset: usize| -> Option<u32> {
        Some(u32::from_le_bytes(bytes.get(offset..offset + 4)?.try_into().ok()?))
    };
    if bytes.get(..4)? != b"WDBC" {
        return None;
    }
    let record_count = u32_at(4)? as usize;
    let record_size = u32_at(12)? as usize;
    let strings_start = 20 + record_count * record_size;
    if record_size < 8 || bytes.len() < strings_start {
        return None;
    }

    let mut index = HashMap::new();
    for record in 0..record_count {
        let base = 20 + record * record_size;
        let id = u32_at(base)?;
        let dir_offset = strings_start + u32_at(base + 4)? as usize;
        let dir_bytes = bytes.get(dir_offset..)?;
        let end = dir_bytes.iter().position(|&b| b == 0)?;
        let dir = String::from_utf8_lossy(&dir_bytes[..end]).into_owned();
        if !dir.is_empty() {
            index.insert(dir.to_ascii_lowercase(), (id, dir));
        }
    }
    Some(index)
}

/// Composes the two creature DBCs into display id -> renderable model. Field
/// layout is 3.3.5a (build 12340): CreatureDisplayInfo field 1 = ModelID and
/// field 4 = CreatureModelScale; CreatureModelData field 2 = ModelName string
/// and field 4 = ModelScale. The two scales multiply; `creature_template.scale`
/// is applied on the client.
fn build_creature_models(
    display_bytes: &[u8],
    model_bytes: &[u8],
    extra_bytes: Option<&[u8]>,
) -> HashMap<u32, CreatureModelInfo> {
    let displays = parse_creature_display_info(display_bytes).unwrap_or_default();
    let models = parse_creature_model_data(model_bytes).unwrap_or_default();
    let bakes = extra_bytes
        .and_then(parse_creature_display_info_extra)
        .unwrap_or_default();
    let mut out = HashMap::with_capacity(displays.len());
    for (display_id, (model_data_id, extended_id, display_scale, variations)) in displays {
        if let Some((path, model_scale)) = models.get(&model_data_id) {
            if path.is_empty() {
                continue;
            }
            // Humanoid NPCs on character models (HumanMale.mdx and friends)
            // carry no TextureVariation; their fully-composited body skin is a
            // single baked BLP named in CreatureDisplayInfoExtra, living under
            // textures\BakedNpcTextures. Without it the M2's COMPONENT_SKIN slot
            // samples an empty (black) texture and the NPC is a black
            // silhouette. Prefer the bake; fall back to the monster skins.
            let textures = match bakes.get(&extended_id).filter(|b| !b.is_empty()) {
                Some(bake) => vec![format!("textures\\BakedNpcTextures\\{bake}")],
                None => {
                    // TextureVariation entries are bare file names next to the M2.
                    let dir = &path[..path.rfind(['\\', '/']).map_or(0, |i| i + 1)];
                    variations
                        .iter()
                        .filter(|v| !v.is_empty())
                        .map(|v| format!("{dir}{v}.blp"))
                        .collect()
                }
            };
            out.insert(
                display_id,
                CreatureModelInfo {
                    model: path.clone(),
                    scale: display_scale * model_scale,
                    textures,
                },
            );
        }
    }
    out
}

/// CreatureDisplayInfo.dbc: field 0 = id, field 1 = CreatureModelData id,
/// field 3 = ExtendedDisplayInfoID (into CreatureDisplayInfoExtra, 0 for
/// ordinary creatures), field 4 = CreatureModelScale, fields 6-8 =
/// TextureVariation (bare skin BLP names, no path/extension). Returns
/// id -> (model-data id, extended-display id, scale, variations). Only fixed
/// field offsets are read, so trailing fields don't matter.
fn parse_creature_display_info(
    bytes: &[u8],
) -> Option<HashMap<u32, (u32, u32, f32, [String; 3])>> {
    let u32_at = |offset: usize| -> Option<u32> {
        Some(u32::from_le_bytes(bytes.get(offset..offset + 4)?.try_into().ok()?))
    };
    let f32_at = |offset: usize| -> Option<f32> {
        Some(f32::from_le_bytes(bytes.get(offset..offset + 4)?.try_into().ok()?))
    };
    if bytes.get(..4)? != b"WDBC" {
        return None;
    }
    let record_count = u32_at(4)? as usize;
    let record_size = u32_at(12)? as usize;
    let strings_start = 20 + record_count * record_size;
    if record_size < 20 || bytes.len() < strings_start {
        return None;
    }
    let string_at = |offset: usize| -> Option<String> {
        let tail = bytes.get(strings_start + u32_at(offset)? as usize..)?;
        let end = tail.iter().position(|&b| b == 0).unwrap_or(tail.len());
        Some(String::from_utf8_lossy(&tail[..end]).into_owned())
    };
    let mut index = HashMap::with_capacity(record_count);
    for record in 0..record_count {
        let base = 20 + record * record_size;
        let id = u32_at(base)?;
        let model_data_id = u32_at(base + 4)?;
        let extended_id = u32_at(base + 12)?;
        let scale = f32_at(base + 16).filter(|s| *s > 0.0).unwrap_or(1.0);
        let mut variations: [String; 3] = Default::default();
        if record_size >= 36 {
            for (i, variation) in variations.iter_mut().enumerate() {
                *variation = string_at(base + 24 + i * 4).unwrap_or_default();
            }
        }
        index.insert(id, (model_data_id, extended_id, scale, variations));
    }
    Some(index)
}

/// CreatureDisplayInfoExtra.dbc: field 0 = id, last field = BakeName (a
/// string-block offset to the pre-composited NPC skin file name, e.g.
/// "<md5>.blp", living under textures\BakedNpcTextures). This is what dresses
/// humanoid NPCs built on character models; only the id and the trailing
/// BakeName are read, so the exact count of item/geoset fields in between is
/// irrelevant. Returns extended-display id -> bake file name (empties dropped).
fn parse_creature_display_info_extra(bytes: &[u8]) -> Option<HashMap<u32, String>> {
    let u32_at = |offset: usize| -> Option<u32> {
        Some(u32::from_le_bytes(bytes.get(offset..offset + 4)?.try_into().ok()?))
    };
    if bytes.get(..4)? != b"WDBC" {
        return None;
    }
    let record_count = u32_at(4)? as usize;
    let record_size = u32_at(12)? as usize;
    let strings_start = 20 + record_count * record_size;
    // Need at least the id plus the trailing BakeName string offset.
    if record_size < 8 || bytes.len() < strings_start {
        return None;
    }
    let string_at = |offset: usize| -> Option<String> {
        let tail = bytes.get(strings_start + u32_at(offset)? as usize..)?;
        let end = tail.iter().position(|&b| b == 0).unwrap_or(tail.len());
        Some(String::from_utf8_lossy(&tail[..end]).into_owned())
    };
    let mut index = HashMap::with_capacity(record_count);
    for record in 0..record_count {
        let base = 20 + record * record_size;
        let id = u32_at(base)?;
        let bake = string_at(base + record_size - 4).unwrap_or_default();
        if !bake.is_empty() {
            index.insert(id, bake);
        }
    }
    Some(index)
}

/// CreatureModelData.dbc: field 0 = id, field 2 = ModelName (string-block
/// offset, a `.mdx` path), field 4 = ModelScale. Returns id -> (m2 path, scale).
fn parse_creature_model_data(bytes: &[u8]) -> Option<HashMap<u32, (String, f32)>> {
    let u32_at = |offset: usize| -> Option<u32> {
        Some(u32::from_le_bytes(bytes.get(offset..offset + 4)?.try_into().ok()?))
    };
    let f32_at = |offset: usize| -> Option<f32> {
        Some(f32::from_le_bytes(bytes.get(offset..offset + 4)?.try_into().ok()?))
    };
    if bytes.get(..4)? != b"WDBC" {
        return None;
    }
    let record_count = u32_at(4)? as usize;
    let record_size = u32_at(12)? as usize;
    let strings_start = 20 + record_count * record_size;
    if record_size < 20 || bytes.len() < strings_start {
        return None;
    }
    let mut index = HashMap::with_capacity(record_count);
    for record in 0..record_count {
        let base = 20 + record * record_size;
        let id = u32_at(base)?;
        let name_offset = strings_start + u32_at(base + 8)? as usize;
        let name_bytes = bytes.get(name_offset..)?;
        let end = name_bytes.iter().position(|&b| b == 0).unwrap_or(name_bytes.len());
        let raw = String::from_utf8_lossy(&name_bytes[..end]).into_owned();
        let path = if raw.is_empty() { String::new() } else { to_m2_path(&raw) };
        let scale = f32_at(base + 16).filter(|s| *s > 0.0).unwrap_or(1.0);
        index.insert(id, (path, scale));
    }
    Some(index)
}

/// GameObjectDisplayInfo.dbc: field 0 = id, field 1 = ModelName (string-block
/// offset). Everything after it (10 sound ids, the geo box, the transport flag)
/// is irrelevant here, so only those two fixed offsets are read.
///
/// The stored name is either a doodad (`.mdx`, normalized to the `.m2` the
/// client actually loads) or a WMO root (`.wmo`) — chests and signposts are
/// M2s, ships and city gates are WMOs — so each entry carries which pipeline
/// renders it. Nameless rows (a handful of placeholder displays) are dropped.
fn parse_gameobject_display_info(bytes: &[u8]) -> Option<HashMap<u32, GameObjectModelInfo>> {
    let u32_at = |offset: usize| -> Option<u32> {
        Some(u32::from_le_bytes(bytes.get(offset..offset + 4)?.try_into().ok()?))
    };
    if bytes.get(..4)? != b"WDBC" {
        return None;
    }
    let record_count = u32_at(4)? as usize;
    let record_size = u32_at(12)? as usize;
    let strings_start = 20 + record_count * record_size;
    // Need at least the id plus the ModelName string offset.
    if record_size < 8 || bytes.len() < strings_start {
        return None;
    }
    let mut index = HashMap::with_capacity(record_count);
    for record in 0..record_count {
        let base = 20 + record * record_size;
        let id = u32_at(base)?;
        let name_offset = strings_start + u32_at(base + 4)? as usize;
        let name_bytes = bytes.get(name_offset..)?;
        let end = name_bytes.iter().position(|&b| b == 0).unwrap_or(name_bytes.len());
        let raw = String::from_utf8_lossy(&name_bytes[..end]).into_owned();
        if raw.is_empty() {
            continue;
        }
        let is_wmo = raw.to_ascii_lowercase().ends_with(".wmo");
        let model = if is_wmo { raw } else { to_m2_path(&raw) };
        index.insert(id, GameObjectModelInfo { model, is_wmo });
    }
    Some(index)
}

/// `mapX_Y.blp` -> (X, Y). Expects a lowercased name; anything else (noLiquid
/// variants, WMO minimaps) yields None.
fn parse_tile_name(file: &str) -> Option<(u32, u32)> {
    let rest = file.strip_suffix(".blp")?.strip_prefix("map")?;
    let (x, y) = rest.split_once('_')?;
    Some((x.parse().ok()?, y.parse().ok()?))
}

/// Resolves the client's `Data` folder from a WoW root or the folder itself.
fn resolve_data_dir(client_path: &str) -> Result<PathBuf, String> {
    let root = Path::new(client_path);
    if root.join("Data").is_dir() {
        Ok(root.join("Data"))
    } else if root.is_dir() {
        Ok(root.to_path_buf())
    } else {
        Err(format!("directory not found: {client_path}"))
    }
}

/// Lists the 3.3.5 archives with their patch priority (later = higher):
/// base < locale base < patch.MPQ < patch-N < locale patches. Sorted by
/// priority so `open_chain` layers them correctly.
fn discover_archives(data_dir: &Path) -> Result<Vec<(PathBuf, i32)>, String> {
    let mut archives: Vec<(PathBuf, i32)> = Vec::new();

    let entries = std::fs::read_dir(data_dir).map_err(|e| format!("{}: {e}", data_dir.display()))?;
    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_ascii_lowercase();
        if path.is_file() && name.ends_with(".mpq") {
            if let Some(priority) = base_archive_priority(&name) {
                archives.push((path, priority));
            }
        } else if path.is_dir() {
            // Locale folder (enUS, frFR…): minimaps aren't localized, but
            // custom patches sometimes ship there.
            for sub in std::fs::read_dir(&path).into_iter().flatten().flatten() {
                let sub_path = sub.path();
                let sub_name = sub.file_name().to_string_lossy().to_ascii_lowercase();
                if sub_path.is_file() && sub_name.ends_with(".mpq") {
                    archives.push((sub_path, locale_archive_priority(&sub_name)));
                }
            }
        }
    }

    if archives.is_empty() {
        return Err(format!("no MPQ archive found in {}", data_dir.display()));
    }
    archives.sort_by_key(|&(_, priority)| priority);
    Ok(archives)
}

/// Opens the archives as a patch chain, in parallel. Falls back to a tolerant
/// sequential open if the parallel path errors, so one bad archive on a custom
/// server doesn't sink the whole client.
fn open_chain(archives: Vec<(PathBuf, i32)>) -> Result<PatchChain, String> {
    let mut chain = PatchChain::new();
    if chain.add_archives_parallel(archives.clone()).is_err() {
        chain = PatchChain::new();
        for (path, priority) in &archives {
            if let Err(e) = chain.add_archive(path, *priority) {
                log::warn!("minimap: skipping archive {}: {e}", path.display());
            }
        }
    }
    if chain.archive_count() == 0 {
        return Err("no MPQ archive could be opened".into());
    }
    Ok(chain)
}

/// A cheap fingerprint of the client's archives (path + size + mtime) so the
/// on-disk index/tile caches invalidate when the data changes.
fn archives_signature(archives: &[(PathBuf, i32)]) -> String {
    let mut hasher = DefaultHasher::new();
    PIPELINE_VERSION.hash(&mut hasher);
    for (path, _) in archives {
        path.to_string_lossy().hash(&mut hasher);
        if let Ok(meta) = std::fs::metadata(path) {
            meta.len().hash(&mut hasher);
            if let Ok(modified) = meta.modified() {
                if let Ok(dur) = modified.duration_since(UNIX_EPOCH) {
                    dur.as_secs().hash(&mut hasher);
                }
            }
        }
    }
    format!("{:016x}", hasher.finish())
}

fn read_cached_index(index_path: &Path, signature: &str) -> Option<Vec<MapInfo>> {
    let bytes = std::fs::read(index_path).ok()?;
    let cached: CachedIndex = serde_json::from_slice(&bytes).ok()?;
    (cached.signature == signature).then_some(cached.maps)
}

fn write_cached_index(index_path: &Path, signature: &str, maps: &[MapInfo]) {
    if let Some(parent) = index_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let cached = CachedIndex { signature: signature.to_string(), maps: maps.to_vec() };
    if let Ok(json) = serde_json::to_vec(&cached) {
        let _ = std::fs::write(index_path, json);
    }
}

/// Removes tile caches from previous signatures (superseded client data).
fn prune_old_caches(base_cache: &Path, signature: &str) {
    let Ok(entries) = std::fs::read_dir(base_cache) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() && entry.file_name().to_string_lossy() != signature {
            let _ = std::fs::remove_dir_all(&path);
        }
    }
}

fn base_archive_priority(name: &str) -> Option<i32> {
    const BASE: &[&str] = &["common.mpq", "common-2.mpq", "expansion.mpq", "lichking.mpq"];
    if let Some(i) = BASE.iter().position(|n| *n == name) {
        return Some(i as i32);
    }
    if name == "patch.mpq" {
        return Some(100);
    }
    if let Some(rest) = name.strip_prefix("patch-").and_then(|r| r.strip_suffix(".mpq")) {
        return Some(match rest.parse::<i32>() {
            Ok(n) => 100 + n,
            // Custom letter patches (patch-a.mpq…) override numbered ones.
            Err(_) => 150 + rest.bytes().next().unwrap_or(0) as i32,
        });
    }
    None
}

fn locale_archive_priority(name: &str) -> i32 {
    if name.starts_with("patch-") {
        // patch-enus-2.mpq -> 202, patch-enus.mpq -> 200
        let n = name
            .trim_end_matches(".mpq")
            .rsplit('-')
            .next()
            .and_then(|s| s.parse::<i32>().ok())
            .unwrap_or(0);
        200 + n
    } else {
        50 // locale-enus.mpq, speech-enus.mpq…
    }
}

/// `minimap://localhost/{map}/{z}/{x}/{y}.png` scheme handler.
pub fn handle_request(app: &tauri::AppHandle, request: Request<Vec<u8>>) -> Response<Vec<u8>> {
    let path = request.uri().path().trim_matches('/').to_string();
    let segments: Vec<&str> = path.split('/').collect();

    let parsed = match segments.as_slice() {
        [map, z, x, y] => {
            let tile = (
                z.parse::<u32>(),
                x.parse::<u32>(),
                y.trim_end_matches(".png").parse::<u32>(),
            );
            match tile {
                (Ok(z), Ok(x), Ok(y)) => Some((map.to_string(), z, x, y)),
                _ => None,
            }
        }
        _ => None,
    };
    let Some((map, z, x, y)) = parsed else {
        return status_response(400);
    };
    if !(MIN_ZOOM..=TILE_ZOOM).contains(&z) || x >= (1 << z) || y >= (1 << z) {
        return status_response(400);
    }

    let state = app.state::<MinimapState>();
    let Ok(cache_dir) = state.wait_ready() else {
        return status_response(503); // no client loaded yet
    };

    match render_tile(&state, &cache_dir, &map.to_ascii_lowercase(), z, x, y) {
        Ok(Some(png)) => Response::builder()
            .status(200)
            .header(CONTENT_TYPE, "image/png")
            .header(ACCESS_CONTROL_ALLOW_ORIGIN, "*")
            .header(CACHE_CONTROL, "public, max-age=86400")
            .body(png)
            .unwrap_or_else(|_| status_response(500)),
        Ok(None) => status_response(404),
        Err(e) => {
            log::warn!("minimap: tile {map}/{z}/{x}/{y} failed: {e}");
            status_response(500)
        }
    }
}

/// `mpq://localhost/<mpq path>` scheme handler: serves any file from the
/// loaded patch chain as raw bytes. The 3D view (@wowserhq/scene) streams its
/// assets (WDT/ADT terrain, BLP textures, M2 doodads, DBC, sounds) this way,
/// using forward-slash lowercase paths — MPQ lookups are case-insensitive.
pub fn handle_file_request(app: &tauri::AppHandle, request: Request<Vec<u8>>) -> Response<Vec<u8>> {
    let path = request.uri().path().trim_matches('/');
    let decoded = percent_decode(path);
    let mpq_path = decoded.replace('/', "\\");
    if mpq_path.is_empty() || mpq_path.contains("..") {
        return status_response(400);
    }

    let state = app.state::<MinimapState>();
    if state.wait_ready().is_err() {
        return status_response(503); // no client loaded yet
    }

    match state.read_asset(&mpq_path) {
        Ok(bytes) => Response::builder()
            .status(200)
            .header(CONTENT_TYPE, "application/octet-stream")
            .header(ACCESS_CONTROL_ALLOW_ORIGIN, "*")
            .header(CACHE_CONTROL, "public, max-age=86400")
            .body(bytes.as_ref().clone())
            .unwrap_or_else(|_| status_response(500)),
        Err(_) => status_response(404),
    }
}

/// `blp://localhost/<mpq path>` scheme handler: serves any BLP from the loaded
/// patch chain re-encoded as PNG, since the webview cannot put a BLP in an
/// `<img>`. Spell icons (`Interface\Icons\*.blp`) are the first consumer, but
/// it is deliberately generic — item icons will want the same thing.
///
/// Unlike Spell.dbc, icons do go through the read cache: they are a few KB
/// each and the same handful is re-read every time a picker re-renders.
pub fn handle_blp_request(app: &tauri::AppHandle, request: Request<Vec<u8>>) -> Response<Vec<u8>> {
    let path = request.uri().path().trim_matches('/');
    let decoded = percent_decode(path);
    let mpq_path = decoded.replace('/', "\\");
    if mpq_path.is_empty() || mpq_path.contains("..") {
        return status_response(400);
    }

    let state = app.state::<MinimapState>();
    if state.wait_ready().is_err() {
        return status_response(503); // no client loaded yet
    }

    match decode_blp(&state, &mpq_path) {
        Ok(png) => Response::builder()
            .status(200)
            .header(CONTENT_TYPE, "image/png")
            .header(ACCESS_CONTROL_ALLOW_ORIGIN, "*")
            .header(CACHE_CONTROL, "public, max-age=86400")
            .body(png)
            .unwrap_or_else(|_| status_response(500)),
        Err(e) => {
            log::debug!("blp: {mpq_path} unavailable: {e}");
            status_response(404)
        }
    }
}

/// Reads one BLP from the chain and re-encodes it as PNG.
fn decode_blp(state: &MinimapState, mpq_path: &str) -> Result<Vec<u8>, String> {
    let bytes = state.read_asset(mpq_path)?;
    let blp = wow_blp::parser::parse_blp(bytes.as_slice()).map_err(|e| format!("{e:?}"))?;
    let image = wow_blp::convert::blp_to_image(&blp, 0).map_err(|e| format!("{e:?}"))?;
    encode_png(&image.to_rgba8())
}

/// Decodes %XX escapes (asset paths may contain spaces).
fn percent_decode(input: &str) -> String {
    let bytes = input.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let Ok(byte) = u8::from_str_radix(&input[i + 1..i + 3], 16) {
                out.push(byte);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

fn status_response(status: u16) -> Response<Vec<u8>> {
    Response::builder()
        .status(status)
        .header(ACCESS_CONTROL_ALLOW_ORIGIN, "*")
        .body(Vec::new())
        .unwrap()
}

/// Returns the tile's PNG bytes, None when no minimap covers this cell.
/// Both outcomes are cached on disk (misses as empty files).
fn render_tile(
    state: &MinimapState,
    cache_dir: &Path,
    map_key: &str,
    z: u32,
    x: u32,
    y: u32,
) -> Result<Option<Vec<u8>>, String> {
    let cache_path = cache_dir.join(map_key).join(z.to_string()).join(format!("{x}_{y}.png"));
    if let Ok(bytes) = std::fs::read(&cache_path) {
        return Ok(if bytes.is_empty() { None } else { Some(bytes) });
    }

    let png = if z == TILE_ZOOM {
        render_native_tile(state, map_key, x, y)?
    } else {
        render_composed_tile(state, cache_dir, map_key, z, x, y)?
    };

    if let Some(parent) = cache_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let _ = std::fs::write(&cache_path, png.as_deref().unwrap_or_default());
    Ok(png)
}

/// Zoom 8: decode the cell's minimap BLP as-is.
fn render_native_tile(
    state: &MinimapState,
    map_key: &str,
    x: u32,
    y: u32,
) -> Result<Option<Vec<u8>>, String> {
    let Some(blp_path) =
        state.with_data(|data| data.maps.get(map_key).and_then(|m| m.tiles.get(&(x, y))).cloned())?
    else {
        return Ok(None);
    };
    // Minimap BLPs deliberately bypass the read cache: each is decoded once
    // and then kept as a PNG on disk, so caching the source bytes would only
    // evict assets the 3D scene actually re-reads.
    let blp_bytes = state
        .with_data(|data| data.chain.read_file(&blp_path).map_err(|e| format!("{blp_path}: {e}")))??;
    // Lock released. Decoding and re-encoding a 256×256 BLP is the expensive
    // half, and used to run with every other asset request queued behind it.
    let blp = wow_blp::parser::parse_blp(&blp_bytes).map_err(|e| format!("{blp_path}: {e:?}"))?;
    let image = wow_blp::convert::blp_to_image(&blp, 0).map_err(|e| format!("{blp_path}: {e:?}"))?;
    let mut rgba = image.to_rgba8();
    if rgba.width() != TILE_SIZE || rgba.height() != TILE_SIZE {
        rgba = image::imageops::resize(&rgba, TILE_SIZE, TILE_SIZE, FilterType::Triangle);
    }
    Ok(Some(encode_png(&rgba)?))
}

/// Zoom < 8: compose the four children of the next zoom level and downscale.
fn render_composed_tile(
    state: &MinimapState,
    cache_dir: &Path,
    map_key: &str,
    z: u32,
    x: u32,
    y: u32,
) -> Result<Option<Vec<u8>>, String> {
    let mut canvas: Option<image::RgbaImage> = None;
    for dy in 0..2u32 {
        for dx in 0..2u32 {
            let child = render_tile(state, cache_dir, map_key, z + 1, x * 2 + dx, y * 2 + dy)?;
            let Some(child) = child else {
                continue;
            };
            let child = image::load_from_memory(&child)
                .map_err(|e| format!("cached tile decode: {e}"))?
                .to_rgba8();
            let canvas = canvas
                .get_or_insert_with(|| image::RgbaImage::new(TILE_SIZE * 2, TILE_SIZE * 2));
            image::imageops::overlay(
                canvas,
                &child,
                (dx * TILE_SIZE) as i64,
                (dy * TILE_SIZE) as i64,
            );
        }
    }
    let Some(canvas) = canvas else {
        return Ok(None);
    };
    let resized = image::imageops::resize(&canvas, TILE_SIZE, TILE_SIZE, FilterType::Triangle);
    Ok(Some(encode_png(&resized)?))
}

fn encode_png(image: &image::RgbaImage) -> Result<Vec<u8>, String> {
    let mut buf = Vec::new();
    image
        .write_to(&mut Cursor::new(&mut buf), image::ImageFormat::Png)
        .map_err(|e| format!("png encode: {e}"))?;
    Ok(buf)
}

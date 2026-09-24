import { invoke } from '@tauri-apps/api/core'
import type { LatLng } from 'leaflet'
import { MPQ_ASSET_BASE_URL } from '@core/wow/assetHost'
import type { AttachmentPoint } from '@core/wow/creatureDisplay'
import type {
  CreatureModelInfo,
  CreatureSpawnMarker,
  GameObjectModelInfo,
  GameTele,
  LiquidMesh,
  MinimapMapInfo,
  WmoModel,
  WmoPlacement,
  WorldPosition,
} from './types'

/**
 * Map-editor tile service. The Rust side (minimap.rs) indexes the client MPQs
 * and serves a slippy pyramid over the `minimap://` custom scheme; Leaflet in
 * CRS.Simple consumes it directly with latLng = (-adtRow, adtCol):
 * at the native zoom (8) one 256px tile is exactly one ADT cell.
 */

/** Size of one ADT cell in world yards. */
export const TILE_YARDS = 1600 / 3
/** The world is a 64×64 ADT grid centered on the origin. */
export const ADT_GRID_CENTER = 32
/** Zoom where 1 leaflet tile == 1 ADT cell (must match minimap.rs). */
export const NATIVE_ZOOM = 8
/** Lowest zoom pre-composed by the backend (must match minimap.rs). */
export const MIN_ZOOM = 4

/** Custom-scheme URL format differs on Windows vs. macOS/Linux. */
const TILE_HOST = navigator.userAgent.includes('Windows')
  ? 'http://minimap.localhost/'
  : 'minimap://localhost/'

export function tileUrlTemplate(mapId: string): string {
  return `${TILE_HOST}${encodeURIComponent(mapId)}/{z}/{x}/{y}.png`
}

/** Raw client files served from the MPQ patch chain (3D asset streaming). */
export { MPQ_ASSET_BASE_URL }

/** Indexes the client's minimaps; returns the maps that have tiles. */
export function loadClient(clientPath: string): Promise<MinimapMapInfo[]> {
  return invoke<MinimapMapInfo[]>('minimap_load_client', { clientPath })
}

/** In-flight/settled `loadClient` call, keyed by the path it was made for. */
let clientLoad: { path: string; promise: Promise<MinimapMapInfo[]> } | null = null

/**
 * Opens the client's MPQ chain once per path and shares that call.
 *
 * Opening the chain is what makes *every* client-backed feature work — minimap
 * tiles, the 3D view, and the model preview — but it costs seconds and holds a
 * process-wide lock on the Rust side, so it must not happen once per caller.
 * The map editor and the model preview both go through here, so whichever
 * needs the client first pays for it and the other one just waits.
 *
 * A failed open is forgotten so the next caller retries; a changed path starts
 * a new open (the backend replaces the loaded chain).
 */
export function ensureClientLoaded(clientPath: string): Promise<MinimapMapInfo[]> {
  const path = clientPath.trim()
  if (!path) return Promise.reject(new Error('no client path configured'))
  if (clientLoad?.path === path) return clientLoad.promise

  const promise = loadClient(path)
  const pending = { path, promise }
  clientLoad = pending
  promise.catch(() => {
    if (clientLoad === pending) clientLoad = null
  })
  return promise
}

/** World-space liquid meshes for one ADT tile (col `x`, row `y`). */
export function loadAdtLiquids(map: string, x: number, y: number): Promise<LiquidMesh> {
  return invoke<LiquidMesh>('minimap_adt_liquids', { map, x, y })
}

/** WMO placements for one ADT tile (outdoor buildings). */
export function loadAdtWmoPlacements(map: string, x: number, y: number): Promise<WmoPlacement[]> {
  return invoke<WmoPlacement[]>('minimap_adt_wmo_placements', { map, x, y })
}

/** Global WMO placements from the map's WDT (WMO-only maps: dungeons…). */
export function loadGlobalWmoPlacements(map: string): Promise<WmoPlacement[]> {
  return invoke<WmoPlacement[]>('minimap_global_wmo_placements', { map })
}

/** A WMO's geometry + interior doodad sets (WMO-local space), by root path. */
export function loadWmoModel(filename: string): Promise<WmoModel> {
  return invoke<WmoModel>('minimap_wmo_model', { filename })
}

/** Bounding box in world yards. */
export interface WorldBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

/**
 * Creature spawns (DB) within a world-space box on one map. The 3D view calls
 * this per ADT tile around the camera, so big continents stream in bounded
 * chunks instead of loading every spawn. `limit` caps a pathologically dense box.
 * `phaseMask` keeps only the spawns visible in that phase (bitmask test); null
 * returns every phase.
 */
export function loadCreatureSpawnsInBounds(
  map: number,
  bounds: WorldBounds,
  phaseMask: number | null = null,
  limit = 4000,
): Promise<CreatureSpawnMarker[]> {
  return invoke<CreatureSpawnMarker[]>('get_creature_spawns_in_bounds', {
    map,
    minX: bounds.minX,
    maxX: bounds.maxX,
    minY: bounds.minY,
    maxY: bounds.maxY,
    phaseMask,
    limit,
  })
}

/** Teleports on one map, for the zone tables panel. `game_tele` has no zone
 * column: pass the zone's world bounds to scope the list spatially. */
export function loadGameTelesByMap(
  map: number,
  search?: string,
  limit = 500,
  bounds?: WorldBounds | null,
): Promise<GameTele[]> {
  return invoke<GameTele[]>('get_game_teles_by_map', {
    map,
    search,
    limit,
    minX: bounds?.minX,
    maxX: bounds?.maxX,
    minY: bounds?.minY,
    maxY: bounds?.maxY,
  })
}

/** Smallest unused `game_tele.id`, to seed a new teleport. */
export function nextGameTeleId(): Promise<number> {
  return invoke<number>('get_next_game_tele_id')
}

/** Inserts or updates one teleport (INSERT … ON DUPLICATE KEY UPDATE). */
export function saveGameTele(data: GameTele): Promise<void> {
  return invoke('save_game_tele', { data })
}

export function deleteGameTele(id: number): Promise<void> {
  return invoke('delete_game_tele', { id })
}

/** World rectangle of a zone's UI map (WorldMapArea.dbc from the client);
 * null when the zone has no world map entry. Rejects while no client loaded. */
export function loadZoneWorldBounds(zoneId: number): Promise<WorldBounds | null> {
  return invoke<WorldBounds | null>('minimap_zone_bounds', { zoneId })
}

/** Creature spawns on one map, searchable. Zone scoping is spatial (the DB's
 * `creature.zoneId` is 0 on stock rows): pass the zone's world bounds. */
export function loadCreatureSpawnsByMap(
  map: number,
  search?: string,
  limit = 500,
  bounds?: WorldBounds | null,
): Promise<CreatureSpawnMarker[]> {
  return invoke<CreatureSpawnMarker[]>('get_creature_spawns_by_map', {
    map,
    search,
    limit,
    minX: bounds?.minX,
    maxX: bounds?.maxX,
    minY: bounds?.minY,
    maxY: bounds?.maxY,
  })
}

/**
 * Resolves creature display ids to their M2 model, scale, skins and — for
 * humanoid NPCs — how they are dressed (from client DBCs).
 */
export function resolveCreatureModels(
  displayIds: number[],
): Promise<Record<number, CreatureModelInfo>> {
  return invoke<Record<number, CreatureModelInfo>>('minimap_creature_models', { displayIds })
}

/** The attachment points (helm, shoulders, hands…) of one client M2. */
export function loadModelAttachments(path: string): Promise<AttachmentPoint[]> {
  return invoke<AttachmentPoint[]>('minimap_model_attachments', { path })
}

/** Resolves gameobject display ids to their client model (from client DBCs). */
export function resolveGameObjectModels(
  displayIds: number[],
): Promise<Record<number, GameObjectModelInfo>> {
  return invoke<Record<number, GameObjectModelInfo>>('minimap_gameobject_models', { displayIds })
}

/** ADT tile (col, row) containing a world position. */
export function worldToTile(world: WorldPosition): { col: number; row: number } {
  return {
    col: Math.floor(ADT_GRID_CENTER - world.y / TILE_YARDS),
    row: Math.floor(ADT_GRID_CENTER - world.x / TILE_YARDS),
  }
}

/** World-space bounding box of one ADT cell — the inverse of `worldToTile`. */
export function tileWorldBounds(col: number, row: number): WorldBounds {
  return {
    minX: (ADT_GRID_CENTER - (row + 1)) * TILE_YARDS,
    maxX: (ADT_GRID_CENTER - row) * TILE_YARDS,
    minY: (ADT_GRID_CENTER - (col + 1)) * TILE_YARDS,
    maxY: (ADT_GRID_CENTER - col) * TILE_YARDS,
  }
}

/**
 * World → leaflet coordinates. ADT cell indices grow east (col, from world
 * -Y) and south (row, from world -X); leaflet lat grows north, hence -row.
 */
export function worldToLatLng(world: WorldPosition): [number, number] {
  const col = ADT_GRID_CENTER - world.y / TILE_YARDS
  const row = ADT_GRID_CENTER - world.x / TILE_YARDS
  return [-row, col]
}

export function latLngToWorld(latlng: Pick<LatLng, 'lat' | 'lng'>): WorldPosition {
  return {
    x: (ADT_GRID_CENTER - -latlng.lat) * TILE_YARDS,
    y: (ADT_GRID_CENTER - latlng.lng) * TILE_YARDS,
  }
}

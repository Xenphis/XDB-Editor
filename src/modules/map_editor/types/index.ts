import type { CharacterAppearance, ComponentTextures } from '@core/wow/creatureDisplay'

/** One entry per map directory found in the client's md5translate.trs. */
export interface MinimapMapInfo {
  /** Lowercased map directory name; used in tile URLs. */
  id: string
  /** Directory name with original casing (Azeroth, Kalimdor, PVPZone01…). */
  name: string
  /** Map.dbc id when the directory matched a record (drives 3D lighting). */
  mapId: number | null
  tileCount: number
  /** ADT cell bounds actually covered by minimaps (0..63). */
  minX: number
  maxX: number
  minY: number
  maxY: number
}

/** World-space position (X grows north, Y grows west), in yards. */
export interface WorldPosition {
  x: number
  y: number
}

/** A spot picked on the map; z is null when the view has no height (2D). */
export interface PickedPosition extends WorldPosition {
  z: number | null
}

/**
 * How much the 3D view asks of the GPU. Persisted per user: what a machine can
 * hold at 60 FPS is a property of the machine, not of the data being edited.
 */
export type RenderQuality = 'low' | 'medium' | 'high'

/** A world position with optional height, used to focus/fly the views. */
export interface FocusPosition extends WorldPosition {
  z?: number | null
}

/** A curated zone of the world (static list, edited in code: data/zones.ts).
 * Display names are localized in the module i18n files under
 * `mapEditor.zones.names.<id>`. */
export interface ZoneDefinition {
  /** Stable slug: persisted as the selected zone, keys the i18n name. */
  id: string
  /** DB map id (Map.dbc / creature.map / game_tele.map). */
  map: number
  /** Camera / view start position. */
  origin: { x: number; y: number; z: number }
  /** AreaTable zone id — keys the WorldMapArea lookup that scopes the zone
   * tables (teleports, spawns) to the zone's world rectangle. */
  zoneId?: number
}

/** Liquid geometry for one category (water/ocean/magma/slime) in a tile. */
export interface LiquidLayer {
  category: string
  /** Flat XYZ triplets in world (== three) space. */
  positions: number[]
  indices: number[]
  /**
   * Liquid depth under each vertex, 0..1, one per position. Empty when the
   * source has none (WMO liquid), which reads as deep everywhere.
   */
  depths: number[]
}

export interface LiquidMesh {
  layers: LiquidLayer[]
}

/** One textured, WMO-local mesh (grouped by texture + lighting mode). */
export interface WmoBatch {
  texture: string
  /** Outdoor surface: lit dynamically. Interior batches keep baked MOCV. */
  exterior: boolean
  positions: number[]
  normals: number[]
  uvs: number[]
  /** Baked MOCV vertex colors (RGB, 0..1); white where a group has none. */
  colors: number[]
  indices: number[]
  /** MOMT two-sided flag (0x04); everything else is front-facing only. */
  twoSided: boolean
  /** MOMT blend mode: 0 opaque, 1 alpha-key (cutout), 2 and up blended. */
  blendMode: number
}

/** An M2 placed inside a WMO, in WMO-local space. */
export interface WmoDoodad {
  m2: string
  position: [number, number, number]
  /** Quaternion [x, y, z, w]. */
  rotation: [number, number, number, number]
  scale: number
}

export interface WmoDoodadSet {
  doodads: WmoDoodad[]
}

/** A WMO's geometry + interior doodad sets (WMO-local space). */
export interface WmoModel {
  batches: WmoBatch[]
  doodadSets: WmoDoodadSet[]
  /** The WMO's own liquid (MLIQ), one layer per category, in WMO-local space. */
  liquids: LiquidLayer[]
}

/** A WMO placed in the world; the world transform is applied on the client. */
export interface WmoPlacement {
  model: string
  /** MODF position [X, Y, Z] in WoW coords. */
  position: [number, number, number]
  /** MODF rotation [X, Y, Z] in degrees. */
  rotation: [number, number, number]
  /** Interior doodad set to render (set 0 is always shown too). */
  doodadSet: number
}

/**
 * A named teleport destination (DB `game_tele`, used by the `.tele` command).
 * Owned by the map editor: teleports are created, edited and deleted from the
 * zone tables panel, on top of the position picked on the map.
 */
export interface GameTele {
  id: number
  position_x: number
  position_y: number
  position_z: number
  orientation: number
  map: number
  name: string
}

/**
 * A creature spawn to render in the 3D view: a slim projection of the DB
 * `creature` row (snake_case fields mirror the columns, as elsewhere in the
 * creature module). Positions are world coords, placed without conversion.
 */
export interface CreatureSpawnMarker {
  guid: number
  id: number
  position_x: number
  position_y: number
  position_z: number
  orientation: number
  /** Effective display id (spawn `modelid` override, else template `modelid1`); 0 if none. */
  display_id: number
  /** creature_template name, for labels/selection ('' if the template is missing). */
  name: string
  /** creature_template.scale (model size multiplier). */
  scale: number
}

/** Resolved client model for a creature display id (from the client DBCs). */
export interface CreatureModelInfo {
  /** M2 path, served over the `mpq://` scheme (like WMO doodads). */
  model: string
  /** Combined CreatureDisplayInfo × CreatureModelData scale. */
  scale: number
  /**
   * BLPs for the M2's runtime texture slots, keyed by texture component: the
   * monster skins of ordinary creatures, the baked body, hair, fur and cape of
   * humanoid NPCs. The M2 only declares these slots, so they must be applied
   * on top of the loaded model or the creature renders black.
   */
  textures: ComponentTextures
  /** How a humanoid NPC is dressed; null for ordinary creatures. */
  character: CharacterAppearance | null
}

/** What the client needs to render one gameobject display id. */
export interface GameObjectModelInfo {
  /** Model path, served over the `mpq://` scheme. */
  model: string
  /**
   * True when the model is a WMO root (`.wmo`) rather than an M2: ships,
   * elevators and city gates are WMOs and go through `loadWmoModel`, while
   * ordinary props are M2s loaded by the ModelManager.
   */
  isWmo: boolean
}

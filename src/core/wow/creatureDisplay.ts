/**
 * How a creature display is drawn beyond its model, as resolved from the
 * client DBCs by the backend (`creature_display.rs`). Shared by the map
 * editor's spawn layer and the model preview.
 */

/** M2 texture components (M2Texture.type) a display supplies images for. */
export const TEXTURE_COMPONENT = {
  body: 1,
  /** A character's cape; on an item model, its own skin. */
  objectSkin: 2,
  hair: 6,
  skinExtra: 8,
  monster1: 11,
} as const

/** BLP paths keyed by the texture component they fill. */
export type ComponentTextures = Record<number, string>

/** How a humanoid NPC (CreatureDisplayInfoExtra) is dressed. */
export interface CharacterAppearance {
  /**
   * Geoset ids drawn on top of the body (geoset 0, always drawn): hairstyle,
   * facial hair, boots, glove cuffs, tabard, cape… Every other geoset of the
   * model stays hidden.
   */
  geosets: number[]
  /** Item models hung on the body's attachment points (helm, shoulders). */
  attachments: ItemAttachment[]
}

/** One worn item drawn as its own model. */
export interface ItemAttachment {
  /** M2 attachment id on the body model (11 helm, 5/6 right/left shoulder). */
  point: number
  /** Item `.m2` path, served over the `mpq://` scheme. */
  model: string
  /** BLP for the item model's skin slot; '' when it has none. */
  texture: string
}

/** Where on a model's skeleton an attachment hangs (from the M2 itself). */
export interface AttachmentPoint {
  id: number
  /** Index into the model's bones. */
  bone: number
  /** Offset from the bone, in bind-pose model space. */
  position: [number, number, number]
}

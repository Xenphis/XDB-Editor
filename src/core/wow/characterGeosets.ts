import type * as THREE from 'three'

/**
 * Picks which geosets (submeshes) a character model draws.
 *
 * Character models — the bodies humanoid NPCs are built on — ship every
 * variant of every body part: all the hairstyles, beards, sideburns, gloves,
 * boots, sleeves… The client draws the variants the NPC's appearance selects
 * (CreatureDisplayInfoExtra, resolved by the backend into a list of geoset
 * ids). @wowserhq/scene draws them all, one draw call each, so a HumanMale
 * cost 61 draw calls with every hairstyle stacked on the same head, where a
 * dressed NPC needs a dozen or so. With dozens of NPCs in a city that was
 * most of the frame.
 *
 * The geometry is shared by every instance of a model, but two NPCs on the
 * same body wear different things, so the choice is made per instance: each
 * geoset draws through its own material, and materials are built per
 * instance, so an unwanted geoset just gets an invisible material — which
 * three.js skips outright, draw call included.
 *
 * Shared by the map editor's spawn layer and the model preview, which both
 * place creatures by display id.
 */

/**
 * Groups that draw nothing without an appearance. A cloak (group 15) is
 * equipment: its variants past 01 are capes.
 */
const HIDDEN_GROUPS = new Set([15])

/**
 * A geoset id is `group * 100 + variant`; id 0 is the body itself. Without an
 * appearance to follow, each group shows its 01 variant.
 */
function isDefaultGeoset(id: number): boolean {
  if (HIDDEN_GROUPS.has(Math.floor(id / 100))) return false
  return id === 0 || id % 100 === 1
}

/** Character models live under `Character\`; creature models do not. */
function isCharacterModel(path: string): boolean {
  return /^character[\\/]/i.test(path)
}

/**
 * Shows the body plus `geosets` (a display's appearance), or every group's
 * default variant for a character model that has no appearance. A no-op for
 * any other model.
 */
export function showCharacterGeosets(
  model: THREE.Object3D,
  path: string,
  geosets: number[] | undefined,
): void {
  if (!geosets && !isCharacterModel(path)) return
  const mesh = model as THREE.Mesh
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  const shown = geosets ? new Set(geosets) : null
  for (const group of mesh.geometry?.groups ?? []) {
    // The id is set on each group by the patched ModelManager; a group without
    // one is kept rather than guessed about.
    const id = (group as { geosetId?: number }).geosetId
    const material = materials[group.materialIndex ?? 0]
    if (id === undefined || !material) continue
    material.visible = id === 0 || (shown ? shown.has(id) : isDefaultGeoset(id))
  }
}

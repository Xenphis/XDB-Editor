import type * as THREE from 'three'

/**
 * Picks which geosets (submeshes) a character model draws.
 *
 * Character models — the bodies humanoid NPCs are built on — ship every
 * variant of every body part: all the hairstyles, beards, sideburns, gloves,
 * boots, sleeves… The client draws the default of each group plus whatever
 * the NPC's appearance selects. @wowserhq/scene draws them all, one draw call
 * each, so a HumanMale cost 61 draw calls with every hairstyle stacked on the
 * same head, where the default set is 11. With dozens of NPCs in a city that
 * was most of the frame.
 *
 * A geoset id is `group * 100 + variant`. The default variant of a group is
 * 01; id 0 is the body itself. The appearance-specific choices (hairstyle,
 * facial hair and equipment from CreatureDisplayInfoExtra) are not applied:
 * every NPC on a model gets its defaults.
 *
 * Shared by the map editor's spawn layer and the model preview, which both
 * place creatures by display id.
 */

/**
 * Groups that draw nothing by default. A cloak (group 15) is equipment: its
 * 01 variant is a cape, not the absence of one.
 */
const HIDDEN_GROUPS = new Set([15])

function isDefaultGeoset(id: number): boolean {
  if (HIDDEN_GROUPS.has(Math.floor(id / 100))) return false
  return id === 0 || id % 100 === 1
}

/** Character models live under `Character\`; creature models do not. */
function isCharacterModel(path: string): boolean {
  return /^character[\\/]/i.test(path)
}

/**
 * Drops every non-default geoset of a character model. A no-op for any other
 * model. The geometry is shared by every instance of the model, so it is
 * filtered once, on the first instance placed.
 */
export function filterCharacterGeosets(model: THREE.Object3D, path: string): void {
  if (!isCharacterModel(path)) return
  const geometry = (model as THREE.Mesh).geometry
  if (!geometry || geometry.userData.geosetsFiltered) return
  geometry.userData.geosetsFiltered = true
  // The id is set on each group by the patched ModelManager; a group without
  // one is kept rather than guessed about.
  geometry.groups = geometry.groups.filter(group => {
    const id = (group as { geosetId?: number }).geosetId
    return id === undefined || isDefaultGeoset(id)
  })
}

import type { ZoneDefinition } from '../types'

/**
 * Curated zones of the world: each entry ties a zone to a DB map id and the
 * origin where the view starts (3D camera spawn / 2D center).
 *
 * Adding a zone = adding an entry here plus its display name in the module
 * i18n files (`mapEditor.zones.names.<id>` in i18n/en.json and fr.json —
 * a missing name falls back to the raw id). Grab coordinates with the
 * editor's right-click "picked position" chip. `zoneId` (AreaTable id) keys
 * the WorldMapArea.dbc lookup that scopes the tables panel to the zone's
 * world rectangle; without it the panel lists the whole map.
 *
 * Origins below are the stock game_tele teleport points (AzerothCore TDB),
 * one per zone — adjust freely.
 */
export const ZONES: ZoneDefinition[] = [
  // ── Royaume de l'Est (map 0) ─────────────────────────────────────────
  { id: 'duskwood', map: 0, origin: { x: -10898.3, y: -364.78, z: 39.27 }, zoneId: 10 },
  { id: 'tirisfal_glades', map: 0, origin: { x: 2036.02, y: 161.33, z: 33.87 }, zoneId: 85 },
  { id: 'hillsbrad_foothills', map: 0, origin: { x: -436.66, y: -581.25, z: 53.59 }, zoneId: 267 },
  { id: 'deadwind_pass', map: 0, origin: { x: -10438.8, y: -1932.75, z: 104.62 }, zoneId: 41 },
  { id: 'dun_morogh', map: 0, origin: { x: -5451.55, y: -656.99, z: 392.68 }, zoneId: 1 },
  { id: 'elwynn_forest', map: 0, origin: { x: -9617.06, y: -288.95, z: 57.31 }, zoneId: 12 },
  { id: 'silverpine_forest', map: 0, origin: { x: 878.74, y: 1359.33, z: 50.36 }, zoneId: 130 },
  { id: 'ironforge', map: 0, origin: { x: -4918.88, y: -940.41, z: 501.56 }, zoneId: 1537 },
  { id: 'undercity', map: 0, origin: { x: 1584.14, y: 240.31, z: -52.15 }, zoneId: 1497 },
  { id: 'searing_gorge', map: 0, origin: { x: -7012.47, y: -1065.13, z: 241.79 }, zoneId: 51 },
  { id: 'arathi_highlands', map: 0, origin: { x: -1508.51, y: -2732.06, z: 32.5 }, zoneId: 45 },
  { id: 'stormwind', map: 0, origin: { x: -8833.38, y: 628.63, z: 94.01 }, zoneId: 1519 },
  { id: 'redridge_mountains', map: 0, origin: { x: -9551.81, y: -2204.73, z: 93.47 }, zoneId: 44 },
  { id: 'the_hinterlands', map: 0, origin: { x: 119.39, y: -3190.37, z: 117.33 }, zoneId: 47 },
  { id: 'wetlands', map: 0, origin: { x: -3242.81, y: -2469.04, z: 15.92 }, zoneId: 11 },
  { id: 'loch_modan', map: 0, origin: { x: -5202.94, y: -2855.18, z: 336.82 }, zoneId: 38 },
  { id: 'eastern_plaguelands', map: 0, origin: { x: 2300.97, y: -4613.36, z: 73.62 }, zoneId: 139 },
  { id: 'western_plaguelands', map: 0, origin: { x: 1728.65, y: -1602.25, z: 63.43 }, zoneId: 28 },
  { id: 'swamp_of_sorrows', map: 0, origin: { x: -10345.4, y: -2773.42, z: 21.99 }, zoneId: 8 },
  { id: 'westfall', map: 0, origin: { x: -10235.2, y: 1222.47, z: 43.63 }, zoneId: 40 },
  { id: 'alterac_mountains', map: 0, origin: { x: 370.76, y: -491.36, z: 175.36 }, zoneId: 36 },
  { id: 'burning_steppes', map: 0, origin: { x: -8118.54, y: -1633.83, z: 133 }, zoneId: 46 },
  { id: 'the_blasted_lands', map: 0, origin: { x: -11182.5, y: -3016.67, z: 7.42 }, zoneId: 4 },
  { id: 'badlands', map: 0, origin: { x: -6779.2, y: -3423.64, z: 241.67 }, zoneId: 3 },
  { id: 'stranglethorn_vale', map: 0, origin: { x: -12644.3, y: -377.41, z: 10.1 }, zoneId: 33 },

  // ── Kalimdor (map 1) ─────────────────────────────────────────────────
  { id: 'azshara', map: 1, origin: { x: 3341.36, y: -4603.79, z: 92.5 }, zoneId: 16 },
  { id: 'winterspring', map: 1, origin: { x: 6759.18, y: -4419.63, z: 763.21 }, zoneId: 618 },
  { id: 'ungoro_crater', map: 1, origin: { x: -7943.22, y: -2119.09, z: -218.34 }, zoneId: 490 },
  { id: 'darnassus', map: 1, origin: { x: 9949.56, y: 2284.21, z: 1341.4 }, zoneId: 1657 },
  { id: 'desolace', map: 1, origin: { x: -606.4, y: 2211.75, z: 92.98 }, zoneId: 405 },
  { id: 'durotar', map: 1, origin: { x: 1007.78, y: -4446.22, z: 11.2 }, zoneId: 14 },
  { id: 'feralas', map: 1, origin: { x: -4841.19, y: 1309.44, z: 81.39 }, zoneId: 357 },
  { id: 'felwood', map: 1, origin: { x: 4102.25, y: -1006.79, z: 272.72 }, zoneId: 361 },
  { id: 'hyjal', map: 1, origin: { x: 5430.49, y: -2805.7, z: 1463.44 }, zoneId: 616 },
  { id: 'thousand_needles', map: 1, origin: { x: -4969.02, y: -1726.89, z: -62.13 }, zoneId: 400 },
  { id: 'thunder_bluff', map: 1, origin: { x: -1277.37, y: 124.8, z: 131.29 }, zoneId: 1638 },
  { id: 'stonetalon_mountains', map: 1, origin: { x: 1570.92, y: 1031.52, z: 137.96 }, zoneId: 406 },
  { id: 'the_barrens', map: 1, origin: { x: 49, y: -2715.55, z: 91.67 }, zoneId: 17 },
  { id: 'dustwallow_marsh', map: 1, origin: { x: -4043.65, y: -2991.32, z: 36.4 }, zoneId: 15 },
  { id: 'mulgore', map: 1, origin: { x: -2192.62, y: -736.32, z: -13.33 }, zoneId: 215 },
  { id: 'orgrimmar', map: 1, origin: { x: 1629.85, y: -4373.64, z: 31.56 }, zoneId: 1637 },
  { id: 'ashenvale', map: 1, origin: { x: 1928.34, y: -2165.95, z: 93.79 }, zoneId: 331 },
  { id: 'moonglade', map: 1, origin: { x: 7654.3, y: -2232.87, z: 462.11 }, zoneId: 493 },
  { id: 'silithus', map: 1, origin: { x: -7426.87, y: 1005.31, z: 1.13 }, zoneId: 1377 },
  { id: 'darkshore', map: 1, origin: { x: 5756.25, y: 298.51, z: 20.6 }, zoneId: 148 },
  { id: 'tanaris', map: 1, origin: { x: -7931.2, y: -3414.28, z: 80.74 }, zoneId: 440 },
  { id: 'teldrassil', map: 1, origin: { x: 10111.3, y: 1557.73, z: 1324.33 }, zoneId: 141 },

  // ── Outre-terre (map 530) ────────────────────────────────────────────
  // La map 530 porte aussi les zones de départ TBC (elfes de sang, draeneï)
  // et Quel'Danas, instanciées loin du continent de l'Outre-terre.
  { id: 'eversong_woods', map: 530, origin: { x: 9079.92, y: -7193.23, z: 55.6 }, zoneId: 3430 },
  { id: 'terokkar_forest', map: 530, origin: { x: -2000.47, y: 4451.54, z: 8.38 }, zoneId: 3519 },
  { id: 'azuremyst_isle', map: 530, origin: { x: -4216.87, y: -12336.9, z: 4.34 }, zoneId: 3524 },
  { id: 'bloodmyst_isle', map: 530, origin: { x: -1993.62, y: -11475.8, z: 63.97 }, zoneId: 3525 },
  { id: 'isle_of_queldanas', map: 530, origin: { x: 12947.4, y: -6893.31, z: 5.68 }, zoneId: 4080 },
  { id: 'the_exodar', map: 530, origin: { x: -3965.7, y: -11653.6, z: -138.84 }, zoneId: 3557 },
  { id: 'blades_edge_mountains', map: 530, origin: { x: 3037.67, y: 5962.86, z: 130.77 }, zoneId: 3522 },
  { id: 'silvermoon', map: 530, origin: { x: 9487.69, y: -7279.2, z: 14.29 }, zoneId: 3487 },
  { id: 'zangarmarsh', map: 530, origin: { x: -54.86, y: 5813.44, z: 20.98 }, zoneId: 3521 },
  { id: 'nagrand', map: 530, origin: { x: -1145.95, y: 8182.35, z: 3.6 }, zoneId: 3518 },
  { id: 'hellfire_peninsula', map: 530, origin: { x: -211.24, y: 4278.54, z: 86.57 }, zoneId: 3483 },
  { id: 'netherstorm', map: 530, origin: { x: 3830.23, y: 3426.5, z: 88.61 }, zoneId: 3523 },
  { id: 'shattrath', map: 530, origin: { x: -1838.16, y: 5301.79, z: -12.43 }, zoneId: 3703 },
  { id: 'ghostlands', map: 530, origin: { x: 7360.86, y: -6803.3, z: 44.29 }, zoneId: 3433 },
  { id: 'shadowmoon_valley', map: 530, origin: { x: -2998.66, y: 2568.9, z: 76.63 }, zoneId: 3520 },

  // ── Norfendre (map 571) ──────────────────────────────────────────────
  { id: 'sholazar_basin', map: 571, origin: { x: 4857.14, y: 5529.11, z: -55.58 }, zoneId: 3711 },
  { id: 'dalaran', map: 571, origin: { x: 5807.98, y: 588.49, z: 660.94 }, zoneId: 4395 },
  { id: 'dragonblight', map: 571, origin: { x: 4379.66, y: 1056.62, z: 150.57 }, zoneId: 65 },
  { id: 'howling_fjord', map: 571, origin: { x: 1902.15, y: -4883.91, z: 171.36 }, zoneId: 495 },
  { id: 'crystalsong_forest', map: 571, origin: { x: 5258.39, y: 156.96, z: 191.7 }, zoneId: 2817 },
  { id: 'wintergrasp', map: 571, origin: { x: 4760.7, y: 2143.7, z: 423 }, zoneId: 4197 },
  { id: 'icecrown', map: 571, origin: { x: 7374.96, y: 1991.1, z: 622.23 }, zoneId: 210 },
  { id: 'grizzly_hills', map: 571, origin: { x: 4391.73, y: -3587.92, z: 238.53 }, zoneId: 394 },
  { id: 'the_storm_peaks', map: 571, origin: { x: 7527.14, y: -1260.89, z: 919.05 }, zoneId: 67 },
  { id: 'borean_tundra', map: 571, origin: { x: 3256.57, y: 5278.23, z: 40.8 }, zoneId: 3537 },
  { id: 'zuldrak', map: 571, origin: { x: 5560.23, y: -3211.66, z: 371.71 }, zoneId: 66 },
]

export const ZONE_BY_ID: ReadonlyMap<string, ZoneDefinition> = new Map(
  ZONES.map(zone => [zone.id, zone]),
)

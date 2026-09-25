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
 * Origins are stock game_tele rows (the trailing comment names the row),
 * picked on a key spot of the zone — its main town or landmark — rather than
 * the zone-wide teleport, which can land anywhere (under a cliff, in a
 * valley). A teleport's height is where a player stands, so the camera spawns
 * on the ground, facing the row's orientation. Adjust freely.
 */
export const ZONES: ZoneDefinition[] = [
  // ── Royaume de l'Est (map 0) ─────────────────────────────────────────
  { id: 'duskwood', map: 0, origin: { x: -10573, y: -1182.51, z: 28.01, orientation: 0.31 }, zoneId: 10 }, // Darkshire
  { id: 'tirisfal_glades', map: 0, origin: { x: 2259.25, y: 290.43, z: 34.11, orientation: 0.99 }, zoneId: 85 }, // Brill
  { id: 'hillsbrad_foothills', map: 0, origin: { x: -853.22, y: -533.53, z: 9.99, orientation: 0.24 }, zoneId: 267 }, // Southshore
  { id: 'deadwind_pass', map: 0, origin: { x: -11118.9, y: -2010.33, z: 47.08, orientation: 0.65 }, zoneId: 41 }, // Karazhan
  { id: 'dun_morogh', map: 0, origin: { x: -5597.31, y: -483.4, z: 396.98, orientation: 3.18 }, zoneId: 1 }, // Kharanos
  { id: 'elwynn_forest', map: 0, origin: { x: -9448.55, y: 68.24, z: 56.32, orientation: 2.11 }, zoneId: 12 }, // Goldshire
  { id: 'silverpine_forest', map: 0, origin: { x: 504.53, y: 1539.08, z: 129.5, orientation: 1.36 }, zoneId: 130 }, // TheSepulcher
  { id: 'ironforge', map: 0, origin: { x: -4918.88, y: -940.41, z: 501.56, orientation: 5.42 }, zoneId: 1537 }, // Ironforge
  { id: 'undercity', map: 0, origin: { x: 1584.07, y: 241.99, z: -52.15, orientation: 0.05 }, zoneId: 1497 }, // Undercity
  { id: 'searing_gorge', map: 0, origin: { x: -6506.47, y: -1149.95, z: 307.71, orientation: 4.18 }, zoneId: 51 }, // ThoriumPoint
  { id: 'arathi_highlands', map: 0, origin: { x: -1246.61, y: -2529.32, z: 20.61, orientation: 0.74 }, zoneId: 45 }, // RefugePointe
  { id: 'stormwind', map: 0, origin: { x: -8833.38, y: 628.63, z: 94.01, orientation: 1.07 }, zoneId: 1519 }, // Stormwind
  { id: 'redridge_mountains', map: 0, origin: { x: -9266.59, y: -2188.77, z: 64.09, orientation: 2.1 }, zoneId: 44 }, // Lakeshire
  { id: 'the_hinterlands', map: 0, origin: { x: 260.37, y: -2125.21, z: 119.57, orientation: 3.18 }, zoneId: 47 }, // AeriePeak
  { id: 'wetlands', map: 0, origin: { x: -3769.32, y: -744.26, z: 8.01, orientation: 1.96 }, zoneId: 11 }, // MenethilHarbor
  { id: 'loch_modan', map: 0, origin: { x: -5352.54, y: -2948.53, z: 323.78, orientation: 5.34 }, zoneId: 38 }, // Thelsamar
  { id: 'eastern_plaguelands', map: 0, origin: { x: 2279.65, y: -5310.01, z: 87.08, orientation: 5.08 }, zoneId: 139 }, // LightsHopeChapel
  { id: 'western_plaguelands', map: 0, origin: { x: 967.96, y: -1443.99, z: 65.04, orientation: 2.05 }, zoneId: 28 }, // ChillwindCamp
  { id: 'swamp_of_sorrows', map: 0, origin: { x: -10446.9, y: -3261.91, z: 20.18, orientation: 5.02 }, zoneId: 8 }, // Stonard
  { id: 'westfall', map: 0, origin: { x: -10624.5, y: 1096.66, z: 33.76, orientation: 1.31 }, zoneId: 40 }, // SentinelHill
  { id: 'alterac_mountains', map: 0, origin: { x: 629.68, y: -348.07, z: 151.1, orientation: 2.86 }, zoneId: 36 }, // RuinsOfAlterac
  { id: 'burning_steppes', map: 0, origin: { x: -8372.77, y: -2754.46, z: 186.62, orientation: 3.43 }, zoneId: 46 }, // MorgansVigil
  { id: 'the_blasted_lands', map: 0, origin: { x: -10999.8, y: -3380.08, z: 62.25, orientation: 4.64 }, zoneId: 4 }, // NethergardeKeep
  { id: 'badlands', map: 0, origin: { x: -6692.48, y: -2175.31, z: 244.15, orientation: 0.43 }, zoneId: 3 }, // Kargath
  { id: 'stranglethorn_vale', map: 0, origin: { x: -14297.2, y: 530.99, z: 8.78, orientation: 3.99 }, zoneId: 33 }, // BootyBay

  // ── Kalimdor (map 1) ─────────────────────────────────────────────────
  { id: 'azshara', map: 1, origin: { x: 2735.06, y: -3867.44, z: 98.65, orientation: 3.56 }, zoneId: 16 }, // TalrendisPoint
  { id: 'winterspring', map: 1, origin: { x: 6725.69, y: -4619.44, z: 720.91, orientation: 4.67 }, zoneId: 618 }, // Everlook
  { id: 'ungoro_crater', map: 1, origin: { x: -6152.25, y: -1087.6, z: -201.43, orientation: 0.71 }, zoneId: 490 }, // MarshalsRefuge
  { id: 'darnassus', map: 1, origin: { x: 9949.56, y: 2284.21, z: 1341.4, orientation: 1.6 }, zoneId: 1657 }, // Darnassus
  { id: 'desolace', map: 1, origin: { x: 176.43, y: 1309.76, z: 190.18, orientation: 0.56 }, zoneId: 405 }, // NijelsPoint
  { id: 'durotar', map: 1, origin: { x: 326.81, y: -4706.65, z: 15.37, orientation: 4.16 }, zoneId: 14 }, // RazorHill
  { id: 'feralas', map: 1, origin: { x: -4396.7, y: 224.84, z: 25.41, orientation: 4.94 }, zoneId: 357 }, // CampMojache
  { id: 'felwood', map: 1, origin: { x: 3986.71, y: -1293.58, z: 250.14, orientation: 5.75 }, zoneId: 361 }, // EmeraldSanctuary
  { id: 'hyjal', map: 1, origin: { x: 5372.72, y: -3378.71, z: 1655.47, orientation: 5.28 }, zoneId: 616 }, // HyjalTheWorldTree
  { id: 'thousand_needles', map: 1, origin: { x: -5431.78, y: -2449.38, z: 89.28, orientation: 2.33 }, zoneId: 400 }, // FreewindPost
  { id: 'thunder_bluff', map: 1, origin: { x: -1277.37, y: 124.8, z: 131.29, orientation: 5.22 }, zoneId: 1638 }, // ThunderBluff
  { id: 'stonetalon_mountains', map: 1, origin: { x: 966.15, y: 926.5, z: 104.65, orientation: 1.27 }, zoneId: 406 }, // SunRockRetreat
  { id: 'the_barrens', map: 1, origin: { x: -452.84, y: -2650.76, z: 95.52, orientation: 0.24 }, zoneId: 17 }, // TheCrossroads
  { id: 'dustwallow_marsh', map: 1, origin: { x: -3711.95, y: -4404.3, z: 21.37, orientation: 4.04 }, zoneId: 15 }, // TheramoreIsle
  { id: 'mulgore', map: 1, origin: { x: -2240.91, y: -399.17, z: -9.42, orientation: 2.53 }, zoneId: 215 }, // BloodhoofVillage
  { id: 'orgrimmar', map: 1, origin: { x: 1629.36, y: -4373.39, z: 31.26, orientation: 3.55 }, zoneId: 1637 }, // Orgrimmar
  { id: 'ashenvale', map: 1, origin: { x: 2676.19, y: -422.9, z: 107.12, orientation: 0.65 }, zoneId: 331 }, // Astranaar
  { id: 'moonglade', map: 1, origin: { x: 7966.85, y: -2491.04, z: 487.73, orientation: 3.21 }, zoneId: 493 }, // Nighthaven
  { id: 'silithus', map: 1, origin: { x: -6818.09, y: 733.81, z: 41.57, orientation: 2.31 }, zoneId: 1377 }, // CenarionHold
  { id: 'darkshore', map: 1, origin: { x: 6501.4, y: 481.61, z: 6.27, orientation: 1.7 }, zoneId: 148 }, // Auberdine
  { id: 'tanaris', map: 1, origin: { x: -7177.15, y: -3785.34, z: 8.37, orientation: 6.1 }, zoneId: 440 }, // Gadgetzan
  { id: 'teldrassil', map: 1, origin: { x: 9848.37, y: 966.95, z: 1306.38, orientation: 3.77 }, zoneId: 141 }, // Dolanaar

  // ── Outre-terre (map 530) ────────────────────────────────────────────
  // La map 530 porte aussi les zones de départ TBC (elfes de sang, draeneï)
  // et Quel'Danas, instanciées loin du continent de l'Outre-terre.
  { id: 'eversong_woods', map: 530, origin: { x: 9514.33, y: -6822.1, z: 16.49, orientation: 1.61 }, zoneId: 3430 }, // FalconwingSquare
  { id: 'terokkar_forest', map: 530, origin: { x: -2640.08, y: 4404.38, z: 35.1, orientation: 4.15 }, zoneId: 3519 }, // StonebreakerHold
  { id: 'azuremyst_isle', map: 530, origin: { x: -4190.85, y: -12516.5, z: 44.53, orientation: 1.34 }, zoneId: 3524 }, // AzureWatch
  { id: 'bloodmyst_isle', map: 530, origin: { x: -1944.5, y: -11873.7, z: 49.4, orientation: 6.05 }, zoneId: 3525 }, // BloodWatch
  { id: 'isle_of_queldanas', map: 530, origin: { x: 12947.4, y: -6893.31, z: 5.68, orientation: 3.09 }, zoneId: 4080 }, // ShatteredSunStaging
  { id: 'the_exodar', map: 530, origin: { x: -3965.7, y: -11653.6, z: -138.84, orientation: 0.85 }, zoneId: 3557 }, // TheExodar
  { id: 'blades_edge_mountains', map: 530, origin: { x: 2018.91, y: 6854.47, z: 171.41, orientation: 0.09 }, zoneId: 3522 }, // Sylvanaar
  { id: 'silvermoon', map: 530, origin: { x: 9487.69, y: -7279.2, z: 14.29, orientation: 6.16 }, zoneId: 3487 }, // SilvermoonCity
  { id: 'zangarmarsh', map: 530, origin: { x: -223.54, y: 5487.99, z: 23.23, orientation: 0.89 }, zoneId: 3521 }, // CenarionRefuge
  { id: 'nagrand', map: 530, origin: { x: -1321.34, y: 7239.12, z: 32.74, orientation: 4.04 }, zoneId: 3518 }, // Garadar
  { id: 'hellfire_peninsula', map: 530, origin: { x: -748.21, y: 2681.52, z: 100.35, orientation: 5.75 }, zoneId: 3483 }, // HonorHold
  { id: 'netherstorm', map: 530, origin: { x: 3043.33, y: 3681.33, z: 143.07, orientation: 5.07 }, zoneId: 3523 }, // Area52
  { id: 'shattrath', map: 530, origin: { x: -1838.16, y: 5301.79, z: -12.43, orientation: 5.95 }, zoneId: 3703 }, // Shattrath
  { id: 'ghostlands', map: 530, origin: { x: 7564.25, y: -6872.23, z: 96.04, orientation: 4.36 }, zoneId: 3433 }, // Tranquillien
  { id: 'shadowmoon_valley', map: 530, origin: { x: -2998.66, y: 2568.9, z: 76.63, orientation: 0.55 }, zoneId: 3520 }, // ShadowmoonVillage

  // ── Norfendre (map 571) ──────────────────────────────────────────────
  { id: 'sholazar_basin', map: 571, origin: { x: 5323, y: 4942, z: -133.5, orientation: 2.17 }, zoneId: 3711 }, // SholazarBasin
  { id: 'dalaran', map: 571, origin: { x: 5804.15, y: 624.77, z: 647.77, orientation: 1.64 }, zoneId: 4395 }, // Dalaran
  { id: 'dragonblight', map: 571, origin: { x: 3543.21, y: 271.83, z: 342.72, orientation: 3.15 }, zoneId: 65 }, // WyrmrestTemple
  { id: 'howling_fjord', map: 571, origin: { x: 564.4, y: -4944.94, z: 18.6, orientation: 5.37 }, zoneId: 495 }, // Valgarde
  { id: 'crystalsong_forest', map: 571, origin: { x: 5474.07, y: 39.76, z: 149.55, orientation: 6.27 }, zoneId: 2817 }, // CrystalsongForest
  { id: 'wintergrasp', map: 571, origin: { x: 4760.7, y: 2143.7, z: 423, orientation: 1.13 }, zoneId: 4197 }, // Wintergrasp
  { id: 'icecrown', map: 571, origin: { x: 8515.89, y: 629.25, z: 547.4, orientation: 1.57 }, zoneId: 210 }, // ArgentTournament
  { id: 'grizzly_hills', map: 571, origin: { x: 3412.88, y: -2791.17, z: 201.52, orientation: 2.25 }, zoneId: 394 }, // AmberpineLodge
  { id: 'the_storm_peaks', map: 571, origin: { x: 7527.14, y: -1260.89, z: 919.05, orientation: 2.07 }, zoneId: 67 }, // StormPeaks
  { id: 'borean_tundra', map: 571, origin: { x: 2213.95, y: 5273.15, z: 11.26, orientation: 5.89 }, zoneId: 3537 }, // ValianceKeep
  { id: 'zuldrak', map: 571, origin: { x: 5560.23, y: -3211.66, z: 371.71, orientation: 5.55 }, zoneId: 66 }, // Zul'Drak
]

export const ZONE_BY_ID: ReadonlyMap<string, ZoneDefinition> = new Map(
  ZONES.map(zone => [zone.id, zone]),
)

/**
 * levels.js - Builtin level definitions (12 levels).
 *
 * Schema:
 *   id       - Level number (1-12) or 'custom_<timestamp>'
 *   name     - Display name
 *   shots    - Starting ammo
 *   playerSpawn - { x, y } (optional, defaults to center)
 *   enemies  - Array of enemy defs. If x/y present, use exact position; otherwise auto-generate.
 *              Fields: type, hp, canShoot  (optional: x, y)
 *   prisms   - Array of prism defs.  Fields: type, angle, splitCount  (optional: x,y, rotSpeed, moveVx, moveVy, moveRange, hp)
 *   barrels  - Array of barrel defs. (optional: x, y)
 *   portals  - Array of portal pair defs. (optional: ax, ay, bx, by)
 *   apples   - Array of apple defs.  (optional: x, y)
 */

export const BUILTIN_LEVELS = [
  // Level 1 — 初阵: 4 basic enemies, no shooting
  {
    id: 1, name: '初阵', shots: 10,
    enemies: [
      { type: 'basic', hp: 1, canShoot: false },
      { type: 'basic', hp: 1, canShoot: false },
      { type: 'basic', hp: 1, canShoot: false },
      { type: 'basic', hp: 1, canShoot: false },
    ],
    prisms: [], barrels: [], portals: [], apples: [],
  },

  // Level 2 — 初战: enemies start shooting, patrol enemies appear
  {
    id: 2, name: '初战', shots: 15,
    enemies: [
      { type: 'basic', hp: 1, canShoot: true },
      { type: 'basic', hp: 1, canShoot: true },
      { type: 'basic', hp: 1, canShoot: true },
      { type: 'patrol', hp: 1, canShoot: false },
      { type: 'patrol', hp: 1, canShoot: false },
    ],
    prisms: [], barrels: [], portals: [], apples: [],
  },

  // Level 3 — 硝烟: enemies get tougher, barrels appear
  {
    id: 3, name: '硝烟', shots: 20,
    enemies: [
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'patrol', hp: 1, canShoot: false },
      { type: 'patrol', hp: 1, canShoot: false },
    ],
    prisms: [],
    barrels: [{}],
    portals: [], apples: [],
  },

  // Level 4 — 棱镜: prisms & tanks appear
  {
    id: 4, name: '棱镜', shots: 25,
    enemies: [
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'patrol', hp: 1, canShoot: false },
      { type: 'patrol', hp: 1, canShoot: false },
      { type: 'tank', hp: 4, canShoot: true },
    ],
    prisms: [
      { type: 'static', splitCount: 2 },
      { type: 'destructible', splitCount: 2, hp: 3 },
    ],
    barrels: [{}],
    portals: [], apples: [],
  },

  // Level 5 — 狙击: snipers, more barrels, apples
  {
    id: 5, name: '狙击', shots: 30,
    enemies: [
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'patrol', hp: 1, canShoot: false },
      { type: 'patrol', hp: 1, canShoot: false },
      { type: 'tank', hp: 4, canShoot: true },
      { type: 'sniper', hp: 1, canShoot: true },
    ],
    prisms: [
      { type: 'static', splitCount: 2 },
      { type: 'destructible', splitCount: 2, hp: 3 },
    ],
    barrels: [{}, {}],
    portals: [],
    apples: [{}, {}],
  },

  // Level 6 — 传送: portals appear, rotating prisms
  {
    id: 6, name: '传送', shots: 35,
    enemies: [
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'patrol', hp: 1, canShoot: false },
      { type: 'patrol', hp: 1, canShoot: false },
      { type: 'patrol', hp: 1, canShoot: false },
      { type: 'tank', hp: 4, canShoot: true },
      { type: 'sniper', hp: 1, canShoot: true },
    ],
    prisms: [
      { type: 'static', splitCount: 2 },
      { type: 'rotating', splitCount: 2 },
      { type: 'destructible', splitCount: 2, hp: 3 },
    ],
    barrels: [{}, {}],
    portals: [{}],
    apples: [{}, {}],
  },

  // Level 7 — 重甲: 2 tanks, 3 prisms with split-3
  {
    id: 7, name: '重甲', shots: 40,
    enemies: [
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'patrol', hp: 1, canShoot: false },
      { type: 'patrol', hp: 1, canShoot: false },
      { type: 'patrol', hp: 1, canShoot: false },
      { type: 'tank', hp: 4, canShoot: true },
      { type: 'tank', hp: 4, canShoot: true },
      { type: 'sniper', hp: 1, canShoot: true },
    ],
    prisms: [
      { type: 'static', splitCount: 3 },
      { type: 'rotating', splitCount: 3 },
      { type: 'destructible', splitCount: 3, hp: 3 },
    ],
    barrels: [{}, {}, {}],
    portals: [{}],
    apples: [{}, {}],
  },

  // Level 8 — 乱舞: more prisms, moving type
  {
    id: 8, name: '乱舞', shots: 45,
    enemies: [
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'patrol', hp: 1, canShoot: false },
      { type: 'patrol', hp: 1, canShoot: false },
      { type: 'patrol', hp: 1, canShoot: false },
      { type: 'tank', hp: 4, canShoot: true },
      { type: 'tank', hp: 4, canShoot: true },
      { type: 'sniper', hp: 1, canShoot: true },
    ],
    prisms: [
      { type: 'static', splitCount: 3 },
      { type: 'rotating', splitCount: 3 },
      { type: 'moving', splitCount: 3 },
      { type: 'destructible', splitCount: 3, hp: 3 },
    ],
    barrels: [{}, {}, {}],
    portals: [{}],
    apples: [{}, {}],
  },

  // Level 9 — 炼狱: 4 barrels, 4 prisms
  {
    id: 9, name: '炼狱', shots: 50,
    enemies: [
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'patrol', hp: 1, canShoot: false },
      { type: 'patrol', hp: 1, canShoot: false },
      { type: 'patrol', hp: 1, canShoot: false },
      { type: 'tank', hp: 4, canShoot: true },
      { type: 'tank', hp: 4, canShoot: true },
      { type: 'sniper', hp: 1, canShoot: true },
    ],
    prisms: [
      { type: 'static', splitCount: 3 },
      { type: 'rotating', splitCount: 3 },
      { type: 'moving', splitCount: 3 },
      { type: 'destructible', splitCount: 3, hp: 3 },
    ],
    barrels: [{}, {}, {}, {}],
    portals: [{}],
    apples: [{}, {}],
  },

  // Level 10 — 双门: 2 snipers, 2 portal pairs, 5 prisms
  {
    id: 10, name: '双门', shots: 55,
    enemies: [
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'patrol', hp: 1, canShoot: false },
      { type: 'patrol', hp: 1, canShoot: false },
      { type: 'patrol', hp: 1, canShoot: false },
      { type: 'tank', hp: 4, canShoot: true },
      { type: 'tank', hp: 4, canShoot: true },
      { type: 'sniper', hp: 1, canShoot: true },
      { type: 'sniper', hp: 1, canShoot: true },
    ],
    prisms: [
      { type: 'static', splitCount: 3 },
      { type: 'static', splitCount: 3 },
      { type: 'rotating', splitCount: 3 },
      { type: 'moving', splitCount: 3 },
      { type: 'destructible', splitCount: 3, hp: 3 },
    ],
    barrels: [{}, {}, {}, {}],
    portals: [{}, {}],
    apples: [{}, {}],
  },

  // Level 11 — 风暴: 5 prisms, intense combat
  {
    id: 11, name: '风暴', shots: 60,
    enemies: [
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'patrol', hp: 1, canShoot: false },
      { type: 'patrol', hp: 1, canShoot: false },
      { type: 'patrol', hp: 1, canShoot: false },
      { type: 'tank', hp: 4, canShoot: true },
      { type: 'tank', hp: 4, canShoot: true },
      { type: 'sniper', hp: 1, canShoot: true },
      { type: 'sniper', hp: 1, canShoot: true },
    ],
    prisms: [
      { type: 'static', splitCount: 3 },
      { type: 'rotating', splitCount: 3 },
      { type: 'rotating', splitCount: 3 },
      { type: 'moving', splitCount: 3 },
      { type: 'destructible', splitCount: 3, hp: 3 },
    ],
    barrels: [{}, {}, {}, {}],
    portals: [{}, {}],
    apples: [{}, {}],
  },

  // Level 12 — 终焉: maximum everything
  {
    id: 12, name: '终焉', shots: 65,
    enemies: [
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'basic', hp: 2, canShoot: true },
      { type: 'patrol', hp: 1, canShoot: false },
      { type: 'patrol', hp: 1, canShoot: false },
      { type: 'patrol', hp: 1, canShoot: false },
      { type: 'tank', hp: 4, canShoot: true },
      { type: 'tank', hp: 4, canShoot: true },
      { type: 'sniper', hp: 1, canShoot: true },
      { type: 'sniper', hp: 1, canShoot: true },
    ],
    prisms: [
      { type: 'static', splitCount: 3 },
      { type: 'static', splitCount: 3 },
      { type: 'rotating', splitCount: 3 },
      { type: 'moving', splitCount: 3 },
      { type: 'moving', splitCount: 3 },
      { type: 'destructible', splitCount: 3, hp: 3 },
    ],
    barrels: [{}, {}, {}, {}],
    portals: [{}, {}],
    apples: [{}, {}],
  },
];

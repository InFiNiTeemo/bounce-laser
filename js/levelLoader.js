/**
 * levelLoader.js - Loads a level data object into the game state.
 *
 * Supports two modes:
 *   - Entities WITH x,y → placed at exact coordinates (editor levels)
 *   - Entities WITHOUT x,y → positions auto-generated (builtin levels)
 */
import { W, H, PORTAL_RADIUS } from './core/constants.js';
import { game, player } from './core/state.js';

// ---- Position generation helpers ----

function randPos(margin, avoidList, minDist) {
  let x, y, attempts = 0;
  do {
    x = margin + Math.random() * (W - margin * 2);
    y = margin + Math.random() * (H - margin * 2);
    attempts++;
  } while (
    attempts < 80 &&
    avoidList.some(p => Math.hypot(x - p.x, y - p.y) < (p.dist || minDist))
  );
  return { x, y };
}

function collectAvoids(extraDist) {
  const list = [{ x: player.x, y: player.y, dist: 120 }];
  for (const e of game.enemies) list.push({ x: e.x, y: e.y, dist: extraDist });
  for (const p of game.prisms) list.push({ x: p.x, y: p.y, dist: 40 });
  for (const b of game.barrels) list.push({ x: b.x, y: b.y, dist: 50 });
  for (const portal of game.portals) {
    list.push({ x: portal.ax, y: portal.ay, dist: 60 });
    list.push({ x: portal.bx, y: portal.by, dist: 60 });
  }
  for (const a of game.apples) list.push({ x: a.x, y: a.y, dist: 40 });
  return list;
}

// ---- Entity builders ----

function buildEnemy(def) {
  const e = {
    type: def.type || 'basic',
    x: def.x ?? 0,
    y: def.y ?? 0,
    size: def.type === 'tank' ? 16 : (def.type === 'sniper' ? 10 : 12),
    hp: def.hp ?? 1,
    maxHp: def.hp ?? 1,
    canShoot: def.canShoot ?? false,
    shootTimer: 999,
    flashTimer: 0,
    bobPhase: Math.random() * Math.PI * 2,
  };
  if (e.canShoot) {
    if (e.type === 'sniper') e.shootTimer = 5 + Math.random() * 3;
    else if (e.type === 'tank') e.shootTimer = 4 + Math.random() * 2;
    else e.shootTimer = 3 + Math.random() * 4;
  }
  if (e.type === 'patrol') {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.8 + Math.random() * 0.4;
    e.moveVx = Math.cos(angle) * speed;
    e.moveVy = Math.sin(angle) * speed;
    e.canShoot = false;
    e.shootTimer = 999;
  }
  if (e.type === 'sniper') {
    e.charging = false;
    e.chargeTimer = 0;
  }
  return e;
}

function buildPrism(def) {
  const type = def.type || 'static';
  const x = def.x ?? 0;
  const y = def.y ?? 0;
  return {
    x, y,
    w: def.w || 40,
    h: def.h || 12,
    angle: def.angle ?? Math.random() * Math.PI,
    type,
    rotSpeed: type === 'rotating'
      ? (def.rotSpeed ?? (0.3 + Math.random() * 0.5) * (Math.random() < 0.5 ? 1 : -1))
      : 0,
    moveVx: type === 'moving'
      ? (def.moveVx ?? (0.3 + Math.random() * 0.5) * (Math.random() < 0.5 ? 1 : -1))
      : 0,
    moveVy: type === 'moving'
      ? (def.moveVy ?? (0.2 + Math.random() * 0.3) * (Math.random() < 0.5 ? 1 : -1))
      : 0,
    moveRange: def.moveRange ?? (60 + Math.random() * 40),
    originX: x,
    originY: y,
    hp: type === 'destructible' ? (def.hp ?? 3) : -1,
    maxHp: type === 'destructible' ? (def.hp ?? 3) : -1,
    flashTimer: 0,
    glowPhase: Math.random() * Math.PI * 2,
    splitCount: def.splitCount ?? 2,
  };
}

function buildBarrel(def) {
  return {
    x: def.x ?? 0,
    y: def.y ?? 0,
    size: 10,
    glowPhase: Math.random() * Math.PI * 2,
    exploded: false,
  };
}

function buildPortal(def) {
  return {
    ax: def.ax ?? 0, ay: def.ay ?? 0,
    bx: def.bx ?? 0, by: def.by ?? 0,
    radius: PORTAL_RADIUS,
    spinPhase: Math.random() * Math.PI * 2,
  };
}

function buildApple(def) {
  return {
    x: def.x ?? 0,
    y: def.y ?? 0,
    size: 8,
    bobPhase: Math.random() * Math.PI * 2,
  };
}

// ---- Materialize: generate concrete positions without touching game state ----

export function materializeLevel(data) {
  // Temporarily hijack game/player to reuse loadLevelData logic
  const saved = {
    enemies: game.enemies, enemyBullets: game.enemyBullets,
    prisms: game.prisms, barrels: game.barrels, portals: game.portals,
    apples: game.apples, pickups: game.pickups, bullets: game.bullets,
    particles: game.particles, levelEnemies: game.levelEnemies,
    killedEnemies: game.killedEnemies,
    px: player.x, py: player.y,
  };

  loadLevelData(data);

  const result = {
    id: data.id || null,
    name: data.name || '\u81EA\u5B9A\u4E49\u5173\u5361',
    shots: data.shots || 10,
    playerSpawn: { x: player.x, y: player.y },
    enemies: game.enemies.map(e => ({
      type: e.type, x: Math.round(e.x), y: Math.round(e.y),
      hp: e.maxHp, canShoot: e.canShoot,
    })),
    prisms: game.prisms.map(p => ({
      type: p.type, x: Math.round(p.x), y: Math.round(p.y),
      angle: p.angle, splitCount: p.splitCount,
      ...(p.type === 'destructible' ? { hp: p.maxHp } : {}),
    })),
    barrels: game.barrels.map(b => ({ x: Math.round(b.x), y: Math.round(b.y) })),
    portals: game.portals.map(p => ({
      ax: Math.round(p.ax), ay: Math.round(p.ay),
      bx: Math.round(p.bx), by: Math.round(p.by),
    })),
    apples: game.apples.map(a => ({ x: Math.round(a.x), y: Math.round(a.y) })),
  };

  // Restore
  game.enemies = saved.enemies; game.enemyBullets = saved.enemyBullets;
  game.prisms = saved.prisms; game.barrels = saved.barrels;
  game.portals = saved.portals; game.apples = saved.apples;
  game.pickups = saved.pickups; game.bullets = saved.bullets;
  game.particles = saved.particles; game.levelEnemies = saved.levelEnemies;
  game.killedEnemies = saved.killedEnemies;
  player.x = saved.px; player.y = saved.py;

  return result;
}

// ---- Main loader ----

export function loadLevelData(data) {
  // Reset arrays
  game.enemies = [];
  game.enemyBullets = [];
  game.prisms = [];
  game.barrels = [];
  game.portals = [];
  game.apples = [];
  game.pickups = [];
  game.bullets = [];
  game.particles = [];

  // Player spawn
  if (data.playerSpawn) {
    player.x = data.playerSpawn.x;
    player.y = data.playerSpawn.y;
  } else {
    player.x = W / 2;
    player.y = H / 2;
  }

  // --- Enemies ---
  for (const def of (data.enemies || [])) {
    const e = buildEnemy(def);
    if (def.x != null && def.y != null) {
      e.x = def.x;
      e.y = def.y;
    } else {
      const avoids = collectAvoids(40);
      const pos = randPos(40, avoids, 40);
      e.x = pos.x;
      e.y = pos.y;
    }
    game.enemies.push(e);
  }

  // --- Prisms ---
  for (const def of (data.prisms || [])) {
    const p = buildPrism(def);
    if (def.x != null && def.y != null) {
      p.x = def.x;
      p.y = def.y;
    } else {
      const avoids = collectAvoids(50);
      const pos = randPos(60, avoids, 50);
      p.x = pos.x;
      p.y = pos.y;
    }
    p.originX = p.x;
    p.originY = p.y;
    game.prisms.push(p);
  }

  // --- Barrels ---
  for (const def of (data.barrels || [])) {
    const b = buildBarrel(def);
    if (def.x != null && def.y != null) {
      b.x = def.x;
      b.y = def.y;
    } else {
      const avoids = collectAvoids(40);
      const pos = randPos(50, avoids, 50);
      b.x = pos.x;
      b.y = pos.y;
    }
    game.barrels.push(b);
  }

  // --- Portals ---
  for (const def of (data.portals || [])) {
    const portal = buildPortal(def);
    if (def.ax != null && def.ay != null && def.bx != null && def.by != null) {
      portal.ax = def.ax;
      portal.ay = def.ay;
      portal.bx = def.bx;
      portal.by = def.by;
    } else {
      // Auto-generate pair
      const avoidsA = collectAvoids(60);
      const posA = randPos(60, avoidsA, 60);
      portal.ax = posA.x;
      portal.ay = posA.y;
      const avoidsB = [...collectAvoids(60), { x: posA.x, y: posA.y, dist: 150 }];
      const posB = randPos(60, avoidsB, 60);
      portal.bx = posB.x;
      portal.by = posB.y;
    }
    game.portals.push(portal);
  }

  // --- Apples ---
  for (const def of (data.apples || [])) {
    const a = buildApple(def);
    if (def.x != null && def.y != null) {
      a.x = def.x;
      a.y = def.y;
    } else {
      const avoids = collectAvoids(40);
      const pos = randPos(50, avoids, 40);
      a.x = pos.x;
      a.y = pos.y;
    }
    game.apples.push(a);
  }

  // Level tracking
  game.levelEnemies = game.enemies.length;
  game.killedEnemies = 0;
}

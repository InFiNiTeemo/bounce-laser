/**
 * levelLoader.js - Loads a level data object into the game state.
 *
 * Supports two modes controlled by the `fixedLayout` tag:
 *   - fixedLayout: true  → use exact x,y from level data (editor / community levels)
 *   - fixedLayout: false → auto-generate random positions (builtin levels)
 */
import { W, H, PORTAL_RADIUS, GRAVITY_WELL_RADIUS, PRISM_UNIT_W } from './core/constants.js';
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
  for (const gw of game.gravityWells) list.push({ x: gw.x, y: gw.y, dist: 60 });
  for (const amp of game.amplifiers) list.push({ x: amp.x, y: amp.y, dist: 40 });
  return list;
}

// ---- Entity builders ----

function buildEnemy(def) {
  const e = {
    type: def.type || 'basic',
    x: def.x ?? 0,
    y: def.y ?? 0,
    size: def.type === 'tank' ? 16 : (def.type === 'sniper' ? 10 : (def.type === 'healer' || def.type === 'ghost') ? 11 : 12),
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
  if (e.type === 'healer') {
    e.hp = Math.max(2, e.hp);
    e.maxHp = Math.max(2, e.maxHp);
    e.healTimer = 5 + Math.random() * 2;
    e.healRange = 120;
    e.healPulseTimer = 0;
    e.canShoot = false;
    e.shootTimer = 999;
  }
  if (e.type === 'ghost') {
    e.hp = Math.max(2, e.hp);
    e.maxHp = Math.max(2, e.maxHp);
    e.visible = true;
    e.phaseTimer = 3 + Math.random();
    e.fadeAlpha = 1.0;
  }
  return e;
}

function buildPrism(def) {
  const type = def.type || 'static';
  const x = def.x ?? 0;
  const y = def.y ?? 0;
  const segments = def.segments ?? 1;
  return {
    x, y,
    segments,
    w: segments > 1 ? segments * PRISM_UNIT_W : (def.w || 40),
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

function buildGravityWell(def) {
  const type = def.type || 'attract';
  const isDestructible = def.hp != null && def.hp > 0;
  return {
    x: def.x ?? 0,
    y: def.y ?? 0,
    type,
    hp: isDestructible ? def.hp : -1,
    maxHp: isDestructible ? def.hp : -1,
    flashTimer: 0,
    glowPhase: Math.random() * Math.PI * 2,
    orbitPhase: Math.random() * Math.PI * 2,
    pulseTimer: Math.random() * 3,
    currentStrength: type === 'attract' ? 0.8 : (type === 'repel' ? -0.6 : 0),
  };
}

function buildAmplifier(def) {
  const charges = def.charges ?? 3;
  return {
    x: def.x ?? 0,
    y: def.y ?? 0,
    charges,
    maxCharges: charges,
    glowPhase: Math.random() * Math.PI * 2,
    flashTimer: 0,
    shatterTimer: 0,
  };
}

// ---- Materialize: generate concrete positions without touching game state ----

export function materializeLevel(data) {
  // Temporarily hijack game/player to reuse loadLevelData logic
  const saved = {
    enemies: game.enemies, enemyBullets: game.enemyBullets,
    prisms: game.prisms, barrels: game.barrels, portals: game.portals,
    apples: game.apples, gravityWells: game.gravityWells, amplifiers: game.amplifiers,
    pickups: game.pickups, bullets: game.bullets,
    particles: game.particles, levelEnemies: game.levelEnemies,
    killedEnemies: game.killedEnemies,
    px: player.x, py: player.y,
  };

  loadLevelData(data);

  const result = {
    id: data.id || null,
    name: data.name || '\u81EA\u5B9A\u4E49\u5173\u5361',
    fixedLayout: true,
    shots: data.shots || 10,
    playerSpawn: { x: player.x, y: player.y },
    enemies: game.enemies.map(e => ({
      type: e.type, x: Math.round(e.x), y: Math.round(e.y),
      hp: e.maxHp, canShoot: e.canShoot,
    })),
    prisms: game.prisms.map(p => ({
      type: p.type, x: Math.round(p.x), y: Math.round(p.y),
      angle: p.angle, splitCount: p.splitCount,
      segments: p.segments || 1,
      w: p.w || 40, h: p.h || 12,
      ...(p.type === 'destructible' ? { hp: p.maxHp } : {}),
    })),
    barrels: game.barrels.map(b => ({ x: Math.round(b.x), y: Math.round(b.y) })),
    portals: game.portals.map(p => ({
      ax: Math.round(p.ax), ay: Math.round(p.ay),
      bx: Math.round(p.bx), by: Math.round(p.by),
    })),
    apples: game.apples.map(a => ({ x: Math.round(a.x), y: Math.round(a.y) })),
    gravityWells: game.gravityWells.map(gw => ({
      type: gw.type, x: Math.round(gw.x), y: Math.round(gw.y),
      ...(gw.hp >= 0 ? { hp: gw.maxHp } : {}),
    })),
    amplifiers: game.amplifiers.map(a => ({
      x: Math.round(a.x), y: Math.round(a.y), charges: a.maxCharges,
    })),
  };

  // Restore
  game.enemies = saved.enemies; game.enemyBullets = saved.enemyBullets;
  game.prisms = saved.prisms; game.barrels = saved.barrels;
  game.portals = saved.portals; game.apples = saved.apples;
  game.gravityWells = saved.gravityWells; game.amplifiers = saved.amplifiers;
  game.pickups = saved.pickups; game.bullets = saved.bullets;
  game.particles = saved.particles; game.levelEnemies = saved.levelEnemies;
  game.killedEnemies = saved.killedEnemies;
  player.x = saved.px; player.y = saved.py;

  return result;
}

// ---- Main loader ----

export function loadLevelData(data) {
  const fixed = !!data.fixedLayout;

  // Reset arrays
  game.enemies = [];
  game.enemyBullets = [];
  game.prisms = [];
  game.barrels = [];
  game.portals = [];
  game.apples = [];
  game.gravityWells = [];
  game.amplifiers = [];
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
    if (fixed) {
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
    if (!fixed) {
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
    if (!fixed) {
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
    if (!fixed) {
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
    if (!fixed) {
      const avoids = collectAvoids(40);
      const pos = randPos(50, avoids, 40);
      a.x = pos.x;
      a.y = pos.y;
    }
    game.apples.push(a);
  }

  // --- Gravity Wells ---
  for (const def of (data.gravityWells || [])) {
    const gw = buildGravityWell(def);
    if (!fixed) {
      const avoids = collectAvoids(60);
      const pos = randPos(60, avoids, 60);
      gw.x = pos.x;
      gw.y = pos.y;
    }
    game.gravityWells.push(gw);
  }

  // --- Amplifiers ---
  for (const def of (data.amplifiers || [])) {
    const amp = buildAmplifier(def);
    if (!fixed) {
      const avoids = collectAvoids(40);
      const pos = randPos(50, avoids, 40);
      amp.x = pos.x;
      amp.y = pos.y;
    }
    game.amplifiers.push(amp);
  }

  // Level tracking
  game.levelEnemies = game.enemies.length;
  game.killedEnemies = 0;
  game.bounceKills = 0;
  game.shieldReflectKills = 0;
}

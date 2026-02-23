/**
 * enemies.js — Enemy spawning, drawing, and AI logic.
 * Handles all enemy types: basic, patrol, tank, and sniper.
 */
import { ctx, drawPixelRect, drawPixelCircle } from '../core/render.js';
import { W, H, COLORS, ENEMY_COLORS } from '../core/constants.js';
import { game, player } from '../core/state.js';

// Level-based enemy composition: [basic, patrol, tank, sniper]
function getEnemyCounts(lvl) {
  if (lvl >= 10) return [5, 3, 2, 2];
  if (lvl >= 7)  return [4, 3, 2, 1];
  if (lvl >= 6)  return [4, 3, 1, 1];
  if (lvl >= 5)  return [4, 2, 1, 1];
  if (lvl >= 4)  return [4, 2, 1, 0];
  if (lvl >= 3)  return [4, 2, 0, 0];
  if (lvl >= 2)  return [3, 2, 0, 0];
  return [4, 0, 0, 0];
}

function spawnPos() {
  let ex, ey;
  do {
    ex = 40 + Math.random() * (W - 80);
    ey = 40 + Math.random() * (H - 80);
  } while (Math.hypot(ex - player.x, ey - player.y) < 120);
  return { ex, ey };
}

export function spawnEnemies() {
  game.enemies = [];
  game.enemyBullets = [];
  const lvl = game.level;
  const [nBasic, nPatrol, nTank, nSniper] = getEnemyCounts(lvl);
  const total = nBasic + nPatrol + nTank + nSniper;
  game.levelEnemies = total;
  game.killedEnemies = 0;

  // Basic enemies
  for (let i = 0; i < nBasic; i++) {
    const { ex, ey } = spawnPos();
    game.enemies.push({
      type: 'basic', x: ex, y: ey, size: 12,
      hp: lvl >= 3 ? 2 : 1, maxHp: lvl >= 3 ? 2 : 1,
      shootTimer: lvl >= 2 ? (3 + Math.random() * 4) : 999,
      canShoot: lvl >= 2, flashTimer: 0, bobPhase: Math.random() * Math.PI * 2,
    });
  }

  // Patrol enemies — blue, moves, no shoot
  for (let i = 0; i < nPatrol; i++) {
    const { ex, ey } = spawnPos();
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.8 + Math.random() * 0.4;
    game.enemies.push({
      type: 'patrol', x: ex, y: ey, size: 12,
      hp: 1, maxHp: 1, canShoot: false, shootTimer: 999,
      flashTimer: 0, bobPhase: Math.random() * Math.PI * 2,
      moveVx: Math.cos(angle) * speed, moveVy: Math.sin(angle) * speed,
    });
  }

  // Tank enemies — purple, big, high HP, slow shoot
  for (let i = 0; i < nTank; i++) {
    const { ex, ey } = spawnPos();
    game.enemies.push({
      type: 'tank', x: ex, y: ey, size: 16,
      hp: 4, maxHp: 4, canShoot: true,
      shootTimer: 4 + Math.random() * 2,
      flashTimer: 0, bobPhase: Math.random() * Math.PI * 2,
    });
  }

  // Sniper enemies — yellow, small, charges then fast shot
  for (let i = 0; i < nSniper; i++) {
    const { ex, ey } = spawnPos();
    game.enemies.push({
      type: 'sniper', x: ex, y: ey, size: 10,
      hp: 1, maxHp: 1, canShoot: true,
      shootTimer: 5 + Math.random() * 3,
      flashTimer: 0, bobPhase: Math.random() * Math.PI * 2,
      charging: false, chargeTimer: 0,
    });
  }
}

export function drawEnemy(e) {
  const bob = Math.sin(e.bobPhase) * 2;

  // Flash white on hit — all types
  if (e.flashTimer > 0) {
    drawPixelCircle(e.x, e.y + bob, e.size + 2, '#ffffff');
    return;
  }

  if (e.type === 'patrol') {
    drawEnemyPatrol(e, bob);
  } else if (e.type === 'tank') {
    drawEnemyTank(e, bob);
  } else if (e.type === 'sniper') {
    drawEnemySniper(e, bob);
  } else {
    drawEnemyBasic(e, bob);
  }
}

function drawEnemyBasic(e, bob) {
  drawPixelCircle(e.x, e.y + bob, e.size, COLORS.enemyDark);
  drawPixelCircle(e.x, e.y + bob, e.size - 3, COLORS.enemy);
  drawPixelRect(e.x - 5, e.y - 4 + bob, 4, 4, '#880022');
  drawPixelRect(e.x + 2, e.y - 4 + bob, 4, 4, '#880022');
  // HP bar
  if (e.maxHp > 1) {
    const bw = 20, ratio = e.hp / e.maxHp;
    drawPixelRect(e.x - bw / 2, e.y - e.size - 8 + bob, bw, 3, '#330011');
    drawPixelRect(e.x - bw / 2, e.y - e.size - 8 + bob, bw * ratio, 3, COLORS.enemy);
  }
  // Gun barrel
  if (e.canShoot) {
    const a = Math.atan2(player.y - e.y, player.x - e.x);
    const gx = e.x + Math.cos(a) * (e.size + 6);
    const gy = e.y + bob + Math.sin(a) * (e.size + 6);
    drawPixelRect(gx - 2, gy - 2, 4, 4, '#ff8844');
  }
}

function drawEnemyPatrol(e, bob) {
  const C = ENEMY_COLORS.patrol;
  drawPixelCircle(e.x, e.y + bob, e.size, C.dark);
  drawPixelCircle(e.x, e.y + bob, e.size - 3, C.body);
  drawPixelRect(e.x - 5, e.y - 4 + bob, 4, 4, C.eye);
  drawPixelRect(e.x + 2, e.y - 4 + bob, 4, 4, C.eye);
  // Direction triangle indicator
  const dir = e.moveVx >= 0 ? 1 : -1;
  const tx = e.x + dir * (e.size + 5);
  const ty = e.y + bob;
  ctx.fillStyle = C.body;
  ctx.beginPath();
  ctx.moveTo(tx + dir * 5, ty);
  ctx.lineTo(tx - dir * 2, ty - 4);
  ctx.lineTo(tx - dir * 2, ty + 4);
  ctx.closePath();
  ctx.fill();
}

function drawEnemyTank(e, bob) {
  const C = ENEMY_COLORS.tank;
  drawPixelCircle(e.x, e.y + bob, e.size, C.dark);
  drawPixelCircle(e.x, e.y + bob, e.size - 3, C.body);
  // Armor bands (2 horizontal lines)
  drawPixelRect(e.x - e.size + 4, e.y - 3 + bob, (e.size - 4) * 2, 2, C.dark);
  drawPixelRect(e.x - e.size + 4, e.y + 3 + bob, (e.size - 4) * 2, 2, C.dark);
  // Eyes
  drawPixelRect(e.x - 6, e.y - 5 + bob, 4, 4, C.eye);
  drawPixelRect(e.x + 3, e.y - 5 + bob, 4, 4, C.eye);
  // HP bar
  const bw = 24, ratio = e.hp / e.maxHp;
  drawPixelRect(e.x - bw / 2, e.y - e.size - 8 + bob, bw, 3, '#220033');
  drawPixelRect(e.x - bw / 2, e.y - e.size - 8 + bob, bw * ratio, 3, C.body);
  // Thick gun barrel
  const a = Math.atan2(player.y - e.y, player.x - e.x);
  const gx = e.x + Math.cos(a) * (e.size + 4);
  const gy = e.y + bob + Math.sin(a) * (e.size + 4);
  drawPixelRect(gx - 3, gy - 3, 6, 6, C.dark);
  drawPixelRect(gx - 2, gy - 2, 4, 4, '#cc66ff');
}

function drawEnemySniper(e, bob) {
  const C = ENEMY_COLORS.sniper;
  // Charging aim line — drawn BEFORE body so it appears behind
  if (e.charging) {
    const a = Math.atan2(player.y - (e.y + bob), player.x - e.x);
    const dist = Math.hypot(player.x - e.x, player.y - (e.y + bob));
    ctx.save();
    ctx.strokeStyle = '#ff2222';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 80) * 0.3;
    ctx.beginPath();
    ctx.moveTo(e.x, e.y + bob);
    ctx.lineTo(e.x + Math.cos(a) * dist, e.y + bob + Math.sin(a) * dist);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Body — flicker when charging
  const show = !e.charging || Math.sin(Date.now() / 60) > -0.3;
  if (show) {
    drawPixelCircle(e.x, e.y + bob, e.size, C.dark);
    drawPixelCircle(e.x, e.y + bob, e.size - 3, C.body);
    drawPixelRect(e.x - 4, e.y - 3 + bob, 3, 3, C.eye);
    drawPixelRect(e.x + 2, e.y - 3 + bob, 3, 3, C.eye);
  }
  // Scope / crosshair decoration on top
  if (show) {
    const a = Math.atan2(player.y - e.y, player.x - e.x);
    const gx = e.x + Math.cos(a) * (e.size + 4);
    const gy = e.y + bob + Math.sin(a) * (e.size + 4);
    drawPixelRect(gx - 1, gy - 1, 3, 3, e.charging ? '#ff4444' : C.dark);
  }
}

export function updateEnemyAI(e, dt) {
  // Patrol movement — bounce off edges
  if (e.type === 'patrol') {
    e.x += e.moveVx;
    e.y += e.moveVy;
    if (e.x < 40 || e.x > W - 40) e.moveVx *= -1;
    if (e.y < 40 || e.y > H - 40) e.moveVy *= -1;
    e.x = Math.max(20, Math.min(W - 20, e.x));
    e.y = Math.max(20, Math.min(H - 20, e.y));
  }

  // Sniper charge-up mechanic
  if (e.type === 'sniper' && e.canShoot) {
    if (e.charging) {
      e.chargeTimer -= dt;
      if (e.chargeTimer <= 0) {
        e.charging = false;
        const a = Math.atan2(player.y - e.y, player.x - e.x);
        game.enemyBullets.push({
          x: e.x, y: e.y,
          vx: Math.cos(a) * 6, vy: Math.sin(a) * 6,
          life: 200, lastPortal: null, bulletType: 'sniper'
        });
        e.shootTimer = 5 + Math.random() * 3;
      }
    } else {
      e.shootTimer -= dt;
      if (e.shootTimer <= 0) {
        e.charging = true;
        e.chargeTimer = 1.2;
      }
    }
  }
  // Tank shooting — slow, speed 2
  else if (e.type === 'tank' && e.canShoot) {
    e.shootTimer -= dt;
    if (e.shootTimer <= 0) {
      e.shootTimer = 4 + Math.random() * 2;
      const a = Math.atan2(player.y - e.y, player.x - e.x);
      game.enemyBullets.push({
        x: e.x, y: e.y,
        vx: Math.cos(a) * 2, vy: Math.sin(a) * 2,
        life: 250, lastPortal: null, bulletType: 'tank'
      });
    }
  }
  // Basic shooting
  else if (e.type !== 'patrol' && e.type !== 'sniper' && e.canShoot) {
    e.shootTimer -= dt;
    if (e.shootTimer <= 0) {
      e.shootTimer = 2.5 + Math.random() * 3;
      const a = Math.atan2(player.y - e.y, player.x - e.x);
      game.enemyBullets.push({
        x: e.x, y: e.y,
        vx: Math.cos(a) * 3, vy: Math.sin(a) * 3,
        life: 200, lastPortal: null, bulletType: 'basic'
      });
    }
  }
}

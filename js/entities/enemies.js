/**
 * enemies.js — Enemy spawning, drawing, and AI logic.
 * Handles all enemy types: basic, patrol, tank, sniper, healer, and ghost.
 */
import { ctx, drawPixelRect, drawPixelCircle } from '../core/render.js';
import { W, H, COLORS, ENEMY_COLORS } from '../core/constants.js';
import { game, player } from '../core/state.js';
import { getSprite } from '../sprites/spriteLoader.js';
import { SPRITE_DEFS } from '../sprites/spriteData.js';
import { playSound } from '../systems/audio.js';
import { damagePlayer } from '../systems/damage.js';

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
    const speed = 50 + Math.random() * 25;
    game.enemies.push({
      type: 'patrol', x: ex, y: ey, size: 12,
      hp: 1, maxHp: 1, canShoot: false, shootTimer: 999,
      flashTimer: 0, bobPhase: Math.random() * Math.PI * 2,
      moveVx: Math.cos(angle) * speed, moveVy: Math.sin(angle) * speed,
      chaseTimer: 4 + Math.random() * 3,
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
    if (e.type === 'ghost') ctx.globalAlpha = e.fadeAlpha;
    drawPixelCircle(e.x, e.y + bob, e.size + 2, '#ffffff');
    if (e.type === 'ghost') ctx.globalAlpha = 1;
    return;
  }

  if (e.type === 'patrol') {
    drawEnemyPatrol(e, bob);
  } else if (e.type === 'tank') {
    drawEnemyTank(e, bob);
  } else if (e.type === 'sniper') {
    drawEnemySniper(e, bob);
  } else if (e.type === 'healer') {
    drawEnemyHealer(e, bob);
  } else if (e.type === 'ghost') {
    drawEnemyGhost(e, bob);
  } else {
    drawEnemyBasic(e, bob);
  }
}

function drawEnemyBasic(e, bob) {
  const sprite = getSprite('enemy_basic');
  const def = SPRITE_DEFS.enemy_basic;
  ctx.drawImage(sprite, Math.floor(e.x - def.cx), Math.floor(e.y + bob - def.cy), def.w, def.h);
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
  const sprite = getSprite('enemy_patrol');
  const def = SPRITE_DEFS.enemy_patrol;
  ctx.drawImage(sprite, Math.floor(e.x - def.cx), Math.floor(e.y + bob - def.cy), def.w, def.h);
  // Direction triangle indicator — points toward movement direction
  const angle = Math.atan2(e.moveVy, e.moveVx);
  const tipDist = e.size + 8;
  const tipX = e.x + Math.cos(angle) * tipDist;
  const tipY = e.y + bob + Math.sin(angle) * tipDist;
  const backX = e.x + Math.cos(angle) * (tipDist - 7);
  const backY = e.y + bob + Math.sin(angle) * (tipDist - 7);
  const perpX = Math.cos(angle + Math.PI / 2) * 4;
  const perpY = Math.sin(angle + Math.PI / 2) * 4;
  ctx.fillStyle = C.body;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(backX + perpX, backY + perpY);
  ctx.lineTo(backX - perpX, backY - perpY);
  ctx.closePath();
  ctx.fill();
}

function drawEnemyTank(e, bob) {
  const C = ENEMY_COLORS.tank;
  const sprite = getSprite('enemy_tank');
  const def = SPRITE_DEFS.enemy_tank;
  ctx.drawImage(sprite, Math.floor(e.x - def.cx), Math.floor(e.y + bob - def.cy), def.w, def.h);
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
    const sprite = getSprite('enemy_sniper');
    const def = SPRITE_DEFS.enemy_sniper;
    ctx.drawImage(sprite, Math.floor(e.x - def.cx), Math.floor(e.y + bob - def.cy), def.w, def.h);
  }
  // Scope / crosshair decoration on top
  if (show) {
    const a = Math.atan2(player.y - e.y, player.x - e.x);
    const gx = e.x + Math.cos(a) * (e.size + 4);
    const gy = e.y + bob + Math.sin(a) * (e.size + 4);
    drawPixelRect(gx - 1, gy - 1, 3, 3, e.charging ? '#ff4444' : C.dark);
  }
}

function drawEnemyHealer(e, bob) {
  const C = ENEMY_COLORS.healer;
  // Healing pulse ring
  if (e.healPulseTimer > 0) {
    const progress = 1 - e.healPulseTimer / 0.5;
    const r = e.size + progress * (e.healRange - e.size);
    ctx.globalAlpha = 0.3 * (1 - progress);
    ctx.strokeStyle = C.body;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(e.x, e.y + bob, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // Body sprite
  const sprite = getSprite('enemy_healer');
  const def = SPRITE_DEFS.enemy_healer;
  ctx.drawImage(sprite, Math.floor(e.x - def.cx), Math.floor(e.y + bob - def.cy), def.w, def.h);
  // HP bar
  const s = e.size;
  const cy = e.y + bob;
  if (e.maxHp > 1) {
    const bw = 20, ratio = e.hp / e.maxHp;
    drawPixelRect(e.x - bw / 2, cy - s - 8, bw, 3, '#003322');
    drawPixelRect(e.x - bw / 2, cy - s - 8, bw * ratio, 3, C.body);
  }
}

function drawEnemyGhost(e, bob) {
  const C = ENEMY_COLORS.ghost;
  ctx.globalAlpha = e.fadeAlpha;
  const s = e.size;
  const cy = e.y + bob;
  // Body sprite (with fade alpha)
  const sprite = getSprite('enemy_ghost');
  const def = SPRITE_DEFS.enemy_ghost;
  ctx.drawImage(sprite, Math.floor(e.x - def.cx), Math.floor(e.y + bob - def.cy), def.w, def.h);
  // Gun barrel
  if (e.canShoot) {
    const a = Math.atan2(player.y - e.y, player.x - e.x);
    const gx = e.x + Math.cos(a) * (s + 5);
    const gy = cy + Math.sin(a) * (s + 5);
    drawPixelRect(gx - 2, gy - 2, 4, 4, C.dark);
  }
  // HP bar
  if (e.maxHp > 1) {
    const bw = 20, ratio = e.hp / e.maxHp;
    drawPixelRect(e.x - bw / 2, cy - s - 8, bw, 3, '#002233');
    drawPixelRect(e.x - bw / 2, cy - s - 8, bw * ratio, 3, C.body);
  }
  ctx.globalAlpha = 1;
}

export function updateEnemyAI(e, dt) {
  // Patrol movement — bounce off edges and player
  if (e.type === 'patrol') {
    e.x += e.moveVx * dt;
    e.y += e.moveVy * dt;
    if (e.x < 40 || e.x > W - 40) e.moveVx *= -1;
    if (e.y < 40 || e.y > H - 40) e.moveVy *= -1;
    e.x = Math.max(20, Math.min(W - 20, e.x));
    e.y = Math.max(20, Math.min(H - 20, e.y));
    // Periodically chase player
    e.chaseTimer -= dt;
    if (e.chaseTimer <= 0) {
      e.chaseTimer = 4 + Math.random() * 3;
      const a = Math.atan2(player.y - e.y, player.x - e.x);
      const spd = Math.hypot(e.moveVx, e.moveVy);
      e.moveVx = Math.cos(a) * spd;
      e.moveVy = Math.sin(a) * spd;
    }
    // Bounce off player + deal contact damage (ignores shield)
    const dist = Math.hypot(e.x - player.x, e.y - player.y);
    if (dist < e.size + player.size) {
      const nx = (e.x - player.x) / (dist || 1);
      const ny = (e.y - player.y) / (dist || 1);
      e.x = player.x + nx * (e.size + player.size + 2);
      e.y = player.y + ny * (e.size + player.size + 2);
      const spd = Math.hypot(e.moveVx, e.moveVy);
      e.moveVx = nx * spd;
      e.moveVy = ny * spd;
      // Contact damage: 1 HP, bypasses shield, respects invincibility
      if (player.invincibleTimer <= 0) {
        damagePlayer('\u88AB\u54E8\u5175\u649E\u6B7B\u4E86!', 1);
      }
    }
  }

  // Healer — periodic heal pulse
  if (e.type === 'healer') {
    e.healTimer -= dt;
    if (e.healPulseTimer > 0) e.healPulseTimer -= dt;
    if (e.healTimer <= 0) {
      e.healTimer = 5 + Math.random() * 2;
      e.healPulseTimer = 0.5;
      for (const ally of game.enemies) {
        if (ally === e) continue;
        if (Math.hypot(ally.x - e.x, ally.y - e.y) <= e.healRange && ally.hp < ally.maxHp) {
          ally.hp = Math.min(ally.maxHp, ally.hp + 1);
          ally.flashTimer = 0.08;
        }
      }
    }
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
          life: 200, lastPortal: null, bulletType: 'sniper', hp: 2, damage: 2
        });
        playSound('enemy_shoot',{pitch:1.3});
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
      playSound('enemy_shoot',{pitch:0.7});
    }
  }
  // Ghost — phase in/out
  else if (e.type === 'ghost') {
    e.phaseTimer -= dt;
    if (e.visible) {
      if (e.phaseTimer <= 0.3) {
        e.fadeAlpha = Math.max(0, e.phaseTimer / 0.3);
      } else {
        e.fadeAlpha = 1;
      }
      if (e.phaseTimer <= 0) {
        e.visible = false;
        e.phaseTimer = 2.5 + Math.random();
        e.fadeAlpha = 0;
        // Teleport to new position
        let nx, ny, attempts = 0;
        do {
          nx = 40 + Math.random() * (W - 80);
          ny = 40 + Math.random() * (H - 80);
          attempts++;
        } while (attempts < 30 && Math.hypot(nx - player.x, ny - player.y) < 80);
        e.x = nx;
        e.y = ny;
      }
      // Shoot when visible
      if (e.canShoot) {
        e.shootTimer -= dt;
        if (e.shootTimer <= 0) {
          e.shootTimer = 3 + Math.random() * 2;
          const a = Math.atan2(player.y - e.y, player.x - e.x);
          game.enemyBullets.push({
            x: e.x, y: e.y,
            vx: Math.cos(a) * 3.5, vy: Math.sin(a) * 3.5,
            life: 200, lastPortal: null, bulletType: 'ghost'
          });
          playSound('enemy_shoot',{pitch:0.9});
        }
      }
    } else {
      if (e.phaseTimer <= 0.3) {
        e.fadeAlpha = Math.min(1, 1 - e.phaseTimer / 0.3);
      } else {
        e.fadeAlpha = 0;
      }
      if (e.phaseTimer <= 0) {
        e.visible = true;
        e.phaseTimer = 3 + Math.random();
        e.fadeAlpha = 1;
      }
    }
  }
  // Basic shooting
  else if (e.type !== 'patrol' && e.type !== 'sniper' && e.type !== 'healer' && e.canShoot) {
    e.shootTimer -= dt;
    if (e.shootTimer <= 0) {
      e.shootTimer = 2.5 + Math.random() * 3;
      const a = Math.atan2(player.y - e.y, player.x - e.x);
      game.enemyBullets.push({
        x: e.x, y: e.y,
        vx: Math.cos(a) * 3, vy: Math.sin(a) * 3,
        life: 200, lastPortal: null, bulletType: 'basic'
      });
      playSound('enemy_shoot');
    }
  }
}

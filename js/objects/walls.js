/**
 * walls.js - Wall objects: reflect or solid (absorb).
 * Reuses prism collision math (worldToLocal, getPrismHitNormal, reflectVec).
 */
import { ctx, drawPixelRect } from '../core/render.js';
import { WALL_COLORS } from '../core/constants.js';
import { game } from '../core/state.js';
import { worldToLocal, getPrismHitNormal, reflectVec } from './prism.js';
import { spawnParticles } from '../systems/particles.js';
import { playSound } from '../systems/audio.js';

// ---- Collision detection (same as prism) ----

export function bulletHitsWall(bullet, wall) {
  const maxR = Math.hypot(wall.w, wall.h) / 2;
  if (Math.hypot(bullet.x - wall.x, bullet.y - wall.y) > maxR + 6) return false;
  const local = worldToLocal(bullet.x, bullet.y, wall);
  const hw = wall.w / 2;
  const hh = wall.h / 2;
  const cx = Math.max(-hw, Math.min(local.x, hw));
  const cy = Math.max(-hh, Math.min(local.y, hh));
  return (local.x - cx) ** 2 + (local.y - cy) ** 2 <= 16;
}

// ---- Bullet reflection (no split) ----

function reflectBulletAtWall(bullet, wall) {
  const normal = getPrismHitNormal(bullet, wall);
  const ref = reflectVec(bullet.vx, bullet.vy, normal.x, normal.y);
  bullet.vx = ref.vx;
  bullet.vy = ref.vy;
  bullet.x += normal.x * 6;
  bullet.y += normal.y * 6;
  bullet.bounces++;
}

/**
 * Returns:
 *   'reflect' — bullet was reflected in-place (caller should continue)
 *   'absorb'  — bullet was consumed, caller should splice it
 *   false     — no collision
 */
export function checkBulletWallCollisions(bi) {
  const b = game.bullets[bi];
  if (!b) return false;
  for (let j = 0; j < game.walls.length; j++) {
    const wall = game.walls[j];
    if (!bulletHitsWall(b, wall)) continue;

    const colors = WALL_COLORS[wall.type] || WALL_COLORS.reflect;

    if (wall.type === 'solid') {
      spawnParticles(b.x, b.y, colors.glow, 8);
      playSound('bounce', { pitch: 0.5 + Math.random() * 0.15 });
      game.bullets.splice(bi, 1);
      return 'absorb';
    }

    spawnParticles(b.x, b.y, colors.glow, 6);
    playSound('bounce', { pitch: 0.8 + Math.random() * 0.2 });
    reflectBulletAtWall(b, wall);
    return 'reflect';
  }
  return false;
}

// ---- Update ----

export function updateWalls(dt) {
  for (const w of game.walls) {
    w.glowPhase += dt * 2;
  }
}

// ---- Draw ----

export function drawWall(wall) {
  const colors = WALL_COLORS[wall.type] || WALL_COLORS.reflect;
  const isSolid = wall.type === 'solid';
  ctx.save();
  ctx.translate(wall.x, wall.y);
  ctx.rotate(wall.angle);
  const hw = wall.w / 2;
  const hh = wall.h / 2;
  const gi = 0.5 + Math.sin(wall.glowPhase || 0) * 0.3;

  // Outer glow
  ctx.shadowColor = colors.glow;
  ctx.shadowBlur = 8 + gi * 6;

  // Outer border (dark)
  drawPixelRect(-hw, -hh, wall.w, wall.h, colors.edge);

  // Inner body (bright)
  drawPixelRect(-hw + 2, -hh + 2, wall.w - 4, wall.h - 4, colors.bodyDark);
  drawPixelRect(-hw + 3, -hh + 3, wall.w - 6, wall.h - 6, colors.body);

  ctx.shadowBlur = 0;

  // Center stripe (horizontal)
  const stripeAlpha = 0.35 + gi * 0.25;
  ctx.fillStyle = `rgba(255,255,255,${stripeAlpha})`;
  ctx.fillRect(Math.floor(-hw + 4), Math.floor(-1), wall.w - 8, 2);

  // End cap accents
  const capAlpha = 0.3 + gi * 0.2;
  ctx.fillStyle = colors.stripe;
  ctx.globalAlpha = capAlpha;
  ctx.fillRect(Math.floor(-hw + 2), Math.floor(-hh + 2), 3, wall.h - 4);
  ctx.fillRect(Math.floor(hw - 5), Math.floor(-hh + 2), 3, wall.h - 4);
  ctx.globalAlpha = 1;

  // Type-specific decoration
  if (isSolid) {
    // X marks along the wall to indicate "no pass"
    ctx.strokeStyle = `rgba(255,100,60,${0.25 + gi * 0.15})`;
    ctx.lineWidth = 1;
    const spacing = 16;
    const startX = -hw + 8;
    const endX = hw - 8;
    for (let mx = startX; mx <= endX; mx += spacing) {
      const sz = Math.min(hh - 3, 4);
      ctx.beginPath();
      ctx.moveTo(mx - sz, -sz); ctx.lineTo(mx + sz, sz);
      ctx.moveTo(mx + sz, -sz); ctx.lineTo(mx - sz, sz);
      ctx.stroke();
    }
  } else {
    // Reflect arrows: small chevrons indicating bounce direction
    ctx.strokeStyle = `rgba(100,220,255,${0.2 + gi * 0.15})`;
    ctx.lineWidth = 1;
    const spacing = 14;
    const startX = -hw + 10;
    const endX = hw - 10;
    for (let mx = startX; mx <= endX; mx += spacing) {
      const sz = Math.min(hh - 3, 3);
      ctx.beginPath();
      ctx.moveTo(mx - sz, sz);
      ctx.lineTo(mx, -sz);
      ctx.lineTo(mx + sz, sz);
      ctx.stroke();
    }
  }

  // Top highlight edge
  ctx.fillStyle = `rgba(255,255,255,${0.15 + gi * 0.1})`;
  ctx.fillRect(Math.floor(-hw + 2), Math.floor(-hh), wall.w - 4, 1);

  ctx.restore();
}

/**
 * prism.js - Prism collision math, spawning, splitting, rendering, and pickups.
 */
import { ctx, drawPixelRect, drawPixelCircle } from '../core/render.js';
import { W, H, PRISM_COLORS, PRISM_MIN_LEVEL, MAX_BULLETS } from '../core/constants.js';
import { game, player } from '../core/state.js';
import { spawnParticles } from '../systems/particles.js';

// ---- PRISM COLLISION MATH ----

export function worldToLocal(px, py, prism) {
  const dx = px - prism.x;
  const dy = py - prism.y;
  const cos = Math.cos(-prism.angle);
  const sin = Math.sin(-prism.angle);
  return {
    x: dx * cos - dy * sin,
    y: dx * sin + dy * cos
  };
}

export function bulletHitsPrism(bullet, prism) {
  const maxR = Math.hypot(prism.w, prism.h) / 2;
  if (Math.hypot(bullet.x - prism.x, bullet.y - prism.y) > maxR + 6) return false;
  const local = worldToLocal(bullet.x, bullet.y, prism);
  const hw = prism.w / 2;
  const hh = prism.h / 2;
  const cx = Math.max(-hw, Math.min(local.x, hw));
  const cy = Math.max(-hh, Math.min(local.y, hh));
  return (local.x - cx) ** 2 + (local.y - cy) ** 2 <= 16;
}

export function getPrismHitNormal(bullet, prism) {
  const local = worldToLocal(bullet.x, bullet.y, prism);
  const hw = prism.w / 2;
  const hh = prism.h / 2;
  const dL = Math.abs(local.x + hw);
  const dR = Math.abs(local.x - hw);
  const dT = Math.abs(local.y + hh);
  const dB = Math.abs(local.y - hh);
  const minD = Math.min(dL, dR, dT, dB);
  let ln;
  if (minD === dL) ln = { x: -1, y: 0 };
  else if (minD === dR) ln = { x: 1, y: 0 };
  else if (minD === dT) ln = { x: 0, y: -1 };
  else ln = { x: 0, y: 1 };
  const cos = Math.cos(prism.angle);
  const sin = Math.sin(prism.angle);
  return {
    x: ln.x * cos - ln.y * sin,
    y: ln.x * sin + ln.y * cos
  };
}

export function reflectVec(vx, vy, nx, ny) {
  const dot = vx * nx + vy * ny;
  return {
    vx: vx - 2 * dot * nx,
    vy: vy - 2 * dot * ny
  };
}

export function spawnPrisms() {
  game.prisms = [];
  game.pickups = [];
  const lvl = game.level;
  if (lvl < PRISM_MIN_LEVEL) return;
  const pl = lvl - PRISM_MIN_LEVEL;
  const count = Math.min(2 + Math.floor(pl / 2), 6);
  for (let i = 0; i < count; i++) {
    let px, py;
    do {
      px = 60 + Math.random() * (W - 120);
      py = 60 + Math.random() * (H - 120);
    } while (
      Math.hypot(px - player.x, py - player.y) < 80 ||
      game.enemies.some(e => Math.hypot(px - e.x, py - e.y) < 50)
    );
    let type = 'static';
    if (pl >= 4 && Math.random() < 0.3) type = 'moving';
    else if (pl >= 2 && Math.random() < 0.35) type = 'rotating';
    if (pl >= 1 && i === count - 1) type = 'destructible';
    game.prisms.push({
      x: px,
      y: py,
      w: 40,
      h: 12,
      angle: Math.random() * Math.PI,
      type,
      rotSpeed: type === 'rotating'
        ? (0.3 + Math.random() * 0.5) * (Math.random() < 0.5 ? 1 : -1)
        : 0,
      moveVx: type === 'moving'
        ? (0.3 + Math.random() * 0.5) * (Math.random() < 0.5 ? 1 : -1)
        : 0,
      moveVy: type === 'moving'
        ? (0.2 + Math.random() * 0.3) * (Math.random() < 0.5 ? 1 : -1)
        : 0,
      moveRange: 60 + Math.random() * 40,
      originX: px,
      originY: py,
      hp: type === 'destructible' ? 3 : -1,
      maxHp: type === 'destructible' ? 3 : -1,
      flashTimer: 0,
      glowPhase: Math.random() * Math.PI * 2,
      splitCount: pl >= 3 ? 3 : 2
    });
  }
}

export function splitBulletAtPrism(bullet, prism) {
  const normal = getPrismHitNormal(bullet, prism);
  const ref = reflectVec(bullet.vx, bullet.vy, normal.x, normal.y);
  const speed = Math.hypot(bullet.vx, bullet.vy);
  const baseAngle = Math.atan2(ref.vy, ref.vx);
  const spread = Math.PI / 8;
  const sc = prism.splitCount;
  const nb = [];
  for (let i = 0; i < sc; i++) {
    let a;
    if (sc === 2) a = baseAngle + (i === 0 ? -spread / 2 : spread / 2);
    else a = baseAngle + (i - 1) * spread;
    nb.push({
      x: bullet.x + normal.x * 6,
      y: bullet.y + normal.y * 6,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      bounces: bullet.bounces,
      maxBounces: bullet.maxBounces,
      life: Math.min(bullet.life, 200),
      trail: [],
      piercing: bullet.piercing || false,
      piercingUsed: bullet.piercingUsed || false,
      fromPrism: true,
      lastPortal: null
    });
  }
  return nb;
}

export function checkBulletPrismCollisions(bi) {
  const b = game.bullets[bi];
  if (!b) return false;
  for (let j = game.prisms.length - 1; j >= 0; j--) {
    const prism = game.prisms[j];
    if (!bulletHitsPrism(b, prism)) continue;
    spawnParticles(b.x, b.y, PRISM_COLORS.glow, 8);
    if (prism.type === 'destructible') {
      prism.hp--;
      prism.flashTimer = 0.15;
      if (prism.hp <= 0) {
        spawnParticles(prism.x, prism.y, PRISM_COLORS.destructible, 20);
        game.screenShake = 0.15;
        game.pickups.push({
          x: prism.x,
          y: prism.y,
          type: 'piercing',
          life: 600,
          bobPhase: 0
        });
        game.prisms.splice(j, 1);
      }
    }
    const nb = splitBulletAtPrism(b, prism);
    const avail = MAX_BULLETS - game.bullets.length;
    if (avail > 0) game.bullets.push(...nb.slice(0, avail));
    game.bullets.splice(bi, 1);
    return true;
  }
  return false;
}

export function updatePrisms(dt) {
  for (let i = game.prisms.length - 1; i >= 0; i--) {
    const p = game.prisms[i];
    p.glowPhase += dt * 2;
    if (p.flashTimer > 0) p.flashTimer -= dt;
    if (p.rotSpeed !== 0) p.angle += p.rotSpeed * dt;
    if (p.type === 'moving') {
      p.x += p.moveVx;
      p.y += p.moveVy;
      if (p.x < 50 || p.x > W - 50) p.moveVx *= -1;
      if (p.y < 50 || p.y > H - 50) p.moveVy *= -1;
      if (Math.hypot(p.x - p.originX, p.y - p.originY) > p.moveRange) {
        p.moveVx *= -1;
        p.moveVy *= -1;
      }
    }
  }
}

export function drawPrism(p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  const hw = p.w / 2;
  const hh = p.h / 2;
  const gi = 0.5 + Math.sin(p.glowPhase) * 0.3;
  if (p.flashTimer > 0) {
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 20;
    drawPixelRect(-hw, -hh, p.w, p.h, '#ffffff');
    ctx.shadowBlur = 0;
    ctx.restore();
    return;
  }
  const isD = p.type === 'destructible';
  ctx.shadowColor = isD ? PRISM_COLORS.destructible : PRISM_COLORS.glow;
  ctx.shadowBlur = 8 + gi * 6;
  drawPixelRect(-hw, -hh, p.w, p.h, isD ? PRISM_COLORS.destructibleDark : PRISM_COLORS.bodyDark);
  drawPixelRect(-hw + 2, -hh + 2, p.w - 4, p.h - 4, isD ? PRISM_COLORS.destructible : PRISM_COLORS.body);
  ctx.fillStyle = `rgba(255,255,255,${0.3 + gi * 0.2})`;
  ctx.fillRect(Math.floor(-hw + 4), Math.floor(-1), p.w - 8, 2);
  ctx.shadowBlur = 0;
  if (isD && p.maxHp > 0) {
    const bw = p.w - 4;
    const ratio = p.hp / p.maxHp;
    drawPixelRect(-bw / 2, -hh - 6, bw, 3, '#330033');
    drawPixelRect(-bw / 2, -hh - 6, bw * ratio, 3, PRISM_COLORS.destructible);
  }
  if (p.type === 'rotating') {
    ctx.fillStyle = `rgba(200,100,255,${0.4 + gi * 0.3})`;
    ctx.fillRect(Math.floor(hw + 2), -2, 3, 3);
    ctx.fillRect(Math.floor(-hw - 5), -2, 3, 3);
  }
  ctx.restore();
}

export function updatePickups(dt) {
  for (let i = game.pickups.length - 1; i >= 0; i--) {
    const pk = game.pickups[i];
    pk.life--;
    pk.bobPhase += dt * 3;
    if (pk.life <= 0) {
      game.pickups.splice(i, 1);
      continue;
    }
    if (Math.hypot(pk.x - player.x, pk.y - player.y) < player.size + 10) {
      if (pk.type === 'piercing') game.piercingCount++;
      spawnParticles(pk.x, pk.y, '#ffaaff', 10);
      game.pickups.splice(i, 1);
    }
  }
}

export function drawPickup(pk) {
  const bob = Math.sin(pk.bobPhase) * 3;
  const pulse = 0.6 + Math.sin(pk.bobPhase * 2) * 0.4;
  if (pk.life < 120 && Math.floor(pk.life / 8) % 2 === 0) return;
  ctx.save();
  ctx.shadowColor = '#ffaaff';
  ctx.shadowBlur = 10 * pulse;
  const cx = pk.x;
  const cy = pk.y + bob;
  drawPixelRect(cx - 1, cy - 6, 2, 2, '#ffaaff');
  drawPixelRect(cx - 3, cy - 4, 6, 2, '#ffaaff');
  drawPixelRect(cx - 5, cy - 2, 10, 2, '#ff88ff');
  drawPixelRect(cx - 3, cy, 6, 2, '#ffaaff');
  drawPixelRect(cx - 1, cy + 2, 2, 2, '#ffaaff');
  drawPixelRect(cx - 1, cy - 2, 2, 2, '#ffffff');
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffaaff';
  ctx.font = '7px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.globalAlpha = pulse;
  ctx.fillText('\u7a7f\u900f', cx, cy + 12);
  ctx.globalAlpha = 1;
  ctx.restore();
}

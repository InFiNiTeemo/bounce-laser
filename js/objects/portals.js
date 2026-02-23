/**
 * portals.js - Portal spawning, rendering, and bullet teleportation.
 */
import { ctx, drawPixelCircle } from '../core/render.js';
import { W, H, PORTAL_COLORS, PORTAL_RADIUS, PORTAL_MIN_LEVEL } from '../core/constants.js';
import { game, player } from '../core/state.js';
import { spawnParticles } from '../systems/particles.js';

export function spawnPortals() {
  game.portals = [];
  const lvl = game.level;
  if (lvl < PORTAL_MIN_LEVEL) return;
  const portalLevel = lvl - PORTAL_MIN_LEVEL;
  const pairCount = portalLevel >= 4 ? 2 : 1;
  for (let p = 0; p < pairCount; p++) {
    let ax, ay, bx, by, att = 0;
    do {
      ax = 60 + Math.random() * (W - 120);
      ay = 60 + Math.random() * (H - 120);
      att++;
    } while (
      att < 50 && (
        Math.hypot(ax - player.x, ay - player.y) < 80 ||
        game.enemies.some(e => Math.hypot(ax - e.x, ay - e.y) < 50) ||
        game.prisms.some(pr => Math.hypot(ax - pr.x, ay - pr.y) < 40) ||
        game.portals.some(pp =>
          Math.hypot(ax - pp.ax, ay - pp.ay) < 60 ||
          Math.hypot(ax - pp.bx, ay - pp.by) < 60
        )
      )
    );
    att = 0;
    do {
      bx = 60 + Math.random() * (W - 120);
      by = 60 + Math.random() * (H - 120);
      att++;
    } while (
      att < 50 && (
        Math.hypot(bx - ax, by - ay) < 150 ||
        Math.hypot(bx - player.x, by - player.y) < 80 ||
        game.enemies.some(e => Math.hypot(bx - e.x, by - e.y) < 50) ||
        game.prisms.some(pr => Math.hypot(bx - pr.x, by - pr.y) < 40) ||
        game.portals.some(pp =>
          Math.hypot(bx - pp.ax, by - pp.ay) < 60 ||
          Math.hypot(bx - pp.bx, by - pp.by) < 60
        )
      )
    );
    game.portals.push({
      ax, ay, bx, by,
      radius: PORTAL_RADIUS,
      spinPhase: Math.random() * Math.PI * 2
    });
  }
}

export function updatePortals(dt) {
  for (const p of game.portals) p.spinPhase += dt * 3;
}

function drawSinglePortal(cx, cy, phase, type) {
  const colors = type === 'blue'
    ? [PORTAL_COLORS.blue, PORTAL_COLORS.blueBright, PORTAL_COLORS.blueGlow]
    : [PORTAL_COLORS.orange, PORTAL_COLORS.orangeBright, PORTAL_COLORS.orangeGlow];
  ctx.save();
  ctx.shadowColor = colors[0];
  ctx.shadowBlur = 12 + Math.sin(phase * 2) * 4;
  for (let layer = 0; layer < 3; layer++) {
    const r = 5 + layer * 5;
    const count = 6 + layer * 2;
    const speed = (3 - layer) * 0.8;
    const alpha = 0.9 - layer * 0.25;
    for (let i = 0; i < count; i++) {
      const angle = phase * speed + (i / count) * Math.PI * 2;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      const size = 3 - layer * 0.5;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = layer === 0 ? colors[1] : colors[0];
      ctx.fillRect(
        Math.floor(px - size / 2),
        Math.floor(py - size / 2),
        size,
        size
      );
    }
  }
  ctx.globalAlpha = 0.8 + Math.sin(phase * 3) * 0.2;
  drawPixelCircle(cx, cy, 4, colors[1]);
  drawPixelCircle(cx, cy, 2, '#ffffff');
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.restore();
}

export function drawPortal(portal) {
  drawSinglePortal(portal.ax, portal.ay, portal.spinPhase, 'blue');
  drawSinglePortal(portal.bx, portal.by, portal.spinPhase, 'orange');
}

export function checkBulletPortalCollision(b) {
  let ported = false;
  for (const portal of game.portals) {
    const dA = Math.hypot(b.x - portal.ax, b.y - portal.ay);
    const dB = Math.hypot(b.x - portal.bx, b.y - portal.by);
    if (dA < portal.radius && b.lastPortal !== portal) {
      b.x = portal.bx + (b.x - portal.ax);
      b.y = portal.by + (b.y - portal.ay);
      b.lastPortal = portal;
      b.portalGrace = 8;
      if (b.trail) b.trail = [];
      spawnParticles(portal.ax, portal.ay, PORTAL_COLORS.blue, 6);
      spawnParticles(portal.bx, portal.by, PORTAL_COLORS.orange, 6);
      ported = true;
      break;
    }
    if (dB < portal.radius && b.lastPortal !== portal) {
      b.x = portal.ax + (b.x - portal.bx);
      b.y = portal.ay + (b.y - portal.by);
      b.lastPortal = portal;
      b.portalGrace = 8;
      if (b.trail) b.trail = [];
      spawnParticles(portal.bx, portal.by, PORTAL_COLORS.orange, 6);
      spawnParticles(portal.ax, portal.ay, PORTAL_COLORS.blue, 6);
      ported = true;
      break;
    }
  }
  if (b.lastPortal && !ported) {
    const lp = b.lastPortal;
    if (
      Math.hypot(b.x - lp.ax, b.y - lp.ay) > lp.radius + 4 &&
      Math.hypot(b.x - lp.bx, b.y - lp.by) > lp.radius + 4
    ) {
      b.lastPortal = null;
    }
  }
  return ported;
}

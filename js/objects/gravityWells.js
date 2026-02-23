/**
 * gravityWells.js - Gravity well objects that bend bullet trajectories.
 *
 * Types:
 *   attract - pulls bullets toward center (blue)
 *   repel   - pushes bullets away from center (yellow)
 *   pulse   - alternates between attract/repel (purple)
 */
import { ctx } from '../core/render.js';
import { GRAVITY_WELL_RADIUS, GRAVITY_WELL_COLORS } from '../core/constants.js';
import { game } from '../core/state.js';
import { spawnParticles } from '../systems/particles.js';

const GW = GRAVITY_WELL_COLORS;
const PULSE_PERIOD = 3; // seconds per full cycle

// ---- Spawn ----

export function spawnGravityWells(level) {
  // Handled by levelLoader; this is kept for legacy auto-spawn if needed
}

// ---- Update ----

export function updateGravityWells(dt) {
  for (let i = game.gravityWells.length - 1; i >= 0; i--) {
    const gw = game.gravityWells[i];
    gw.glowPhase += dt * 2;

    // Pulse type: cycle between attract and repel
    if (gw.type === 'pulse') {
      gw.pulseTimer += dt;
      const t = (gw.pulseTimer % PULSE_PERIOD) / PULSE_PERIOD;
      // sin wave: positive = attract, negative = repel
      gw.currentStrength = Math.sin(t * Math.PI * 2) * 0.8;
    }

    // Orbital particles
    gw.orbitPhase += dt * (gw.type === 'repel' ? -1.5 : 1.5);

    // Destructible: flash timer
    if (gw.flashTimer > 0) gw.flashTimer -= dt;

    // Remove if destroyed
    if (gw.hp === 0) {
      // Shockwave: push all nearby bullets outward
      const pushRadius = GRAVITY_WELL_RADIUS * 1.2;
      const allBullets = [...game.bullets, ...game.enemyBullets];
      for (const b of allBullets) {
        const dx = b.x - gw.x, dy = b.y - gw.y;
        const dist = Math.hypot(dx, dy);
        if (dist < pushRadius && dist > 0) {
          const force = 3 * (1 - dist / pushRadius);
          b.vx += (dx / dist) * force;
          b.vy += (dy / dist) * force;
        }
      }
      spawnParticles(gw.x, gw.y, GW.attract, 20);
      spawnParticles(gw.x, gw.y, '#ffffff', 10);
      game.screenShake = Math.max(game.screenShake, 0.3);
      game.gravityWells.splice(i, 1);
    }
  }
}

// ---- Gravity application (called per bullet from bullets.js / enemyBullets.js) ----

export function applyGravityToVelocity(b) {
  for (const gw of game.gravityWells) {
    const dx = gw.x - b.x, dy = gw.y - b.y;
    const dist = Math.hypot(dx, dy);
    if (dist > GRAVITY_WELL_RADIUS || dist < 4) continue;

    const str = gw.currentStrength;
    // strength scales inversely with distance
    const curve = str * 0.8 / dist;

    const toAngle = Math.atan2(dy, dx);
    const curAngle = Math.atan2(b.vy, b.vx);
    let diff = toAngle - curAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    const deflect = Math.sign(diff) * Math.min(Math.abs(diff), Math.abs(curve));
    const spd = Math.hypot(b.vx, b.vy);
    const newAngle = curAngle + deflect;
    b.vx = Math.cos(newAngle) * spd;
    b.vy = Math.sin(newAngle) * spd;
  }
}

// ---- Damage (for destructible gravity wells) ----

export function damageGravityWell(gw, dmg) {
  if (gw.hp < 0) return; // not destructible
  gw.hp = Math.max(0, gw.hp - dmg);
  gw.flashTimer = 0.15;
  spawnParticles(gw.x, gw.y, '#ffffff', 6);
}

// ---- Draw ----

export function drawGravityWell(gw) {
  const pulse = 0.5 + 0.5 * Math.sin(gw.glowPhase);

  // Determine colors based on type/state
  let coreColor, glowColor, brightColor;
  if (gw.type === 'pulse') {
    // Blend between attract and repel colors based on currentStrength
    const t = (gw.currentStrength + 0.8) / 1.6; // normalize to 0-1
    coreColor = t > 0.5 ? GW.attract : GW.repel;
    glowColor = t > 0.5 ? GW.attractGlow : GW.repelGlow;
    brightColor = GW.pulseBright;
  } else if (gw.type === 'repel') {
    coreColor = GW.repel;
    glowColor = GW.repelGlow;
    brightColor = GW.repelBright;
  } else {
    coreColor = GW.attract;
    glowColor = GW.attractGlow;
    brightColor = GW.attractBright;
  }

  // Influence radius ring (dashed)
  const ringAlpha = 0.15 + pulse * 0.1;
  ctx.save();
  ctx.setLineDash([4, 6]);
  ctx.strokeStyle = coreColor;
  ctx.globalAlpha = ringAlpha;
  ctx.lineWidth = 1;
  const ringR = GRAVITY_WELL_RADIUS * (0.95 + pulse * 0.05);
  ctx.beginPath();
  ctx.arc(gw.x, gw.y, ringR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  ctx.restore();

  // Orbital particles (6-8 small dots)
  const orbCount = 7;
  const orbRadius = 20 + pulse * 5;
  for (let k = 0; k < orbCount; k++) {
    const angle = gw.orbitPhase + (k / orbCount) * Math.PI * 2;
    const r = orbRadius + Math.sin(gw.glowPhase * 2 + k) * 4;
    const ox = gw.x + Math.cos(angle) * r;
    const oy = gw.y + Math.sin(angle) * r;
    const pAlpha = 0.3 + 0.4 * Math.sin(gw.glowPhase + k * 0.8);
    ctx.fillStyle = coreColor;
    ctx.globalAlpha = pAlpha;
    ctx.fillRect(Math.floor(ox) - 1, Math.floor(oy) - 1, 2, 2);
  }
  ctx.globalAlpha = 1;

  // Core glow
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 8 + pulse * 8;

  // Flash white when damaged
  const flashActive = gw.flashTimer > 0;

  // Core body
  ctx.fillStyle = flashActive ? '#ffffff' : coreColor;
  ctx.beginPath();
  ctx.arc(gw.x, gw.y, 6, 0, Math.PI * 2);
  ctx.fill();

  // Inner bright core
  ctx.fillStyle = flashActive ? '#ffffff' : brightColor;
  ctx.beginPath();
  ctx.arc(gw.x, gw.y, 3, 0, Math.PI * 2);
  ctx.fill();

  // Center white dot
  ctx.fillStyle = GW.core;
  ctx.beginPath();
  ctx.arc(gw.x, gw.y, 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;

  // HP bar for destructible
  if (gw.hp >= 0 && gw.maxHp > 0) {
    const barW = 20, barH = 3;
    const bx = gw.x - barW / 2, by = gw.y - 14;
    ctx.fillStyle = '#333333';
    ctx.fillRect(bx, by, barW, barH);
    ctx.fillStyle = coreColor;
    ctx.fillRect(bx, by, barW * (gw.hp / gw.maxHp), barH);
  }
}

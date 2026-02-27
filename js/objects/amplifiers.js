/**
 * amplifiers.js - Amplifier objects that power up bullets passing through.
 *
 * Bullets gain +1 damage and 1.3x speed. Limited charges before shattering.
 * Both player and enemy bullets can be amplified.
 */
import { ctx } from '../core/render.js';
import { AMPLIFIER_RADIUS, AMPLIFIER_COLORS } from '../core/constants.js';
import { game } from '../core/state.js';
import { spawnParticles } from '../systems/particles.js';

const AC = AMPLIFIER_COLORS;

// ---- Update ----

export function updateAmplifiers(dt) {
  for (let i = game.amplifiers.length - 1; i >= 0; i--) {
    const amp = game.amplifiers[i];
    amp.glowPhase += dt * 3;
    if (amp.flashTimer > 0) amp.flashTimer -= dt;

    // Remove shattered amplifiers after brief delay
    if (amp.charges <= 0) {
      amp.shatterTimer -= dt;
      if (amp.shatterTimer <= 0) {
        game.amplifiers.splice(i, 1);
      }
    }
  }
}

// ---- Amplify check (called per bullet from bullets.js / enemyBullets.js) ----

export function checkBulletAmplifier(b) {
  for (const amp of game.amplifiers) {
    if (amp.charges <= 0) continue;
    if (b.amplified) continue;
    const adx = b.x - amp.x, ady = b.y - amp.y;
    if (adx * adx + ady * ady < AMPLIFIER_RADIUS * AMPLIFIER_RADIUS) {
      b.amplified = true;
      b.ampDmg = (b.ampDmg || 0) + 1;
      b.vx *= 1.3;
      b.vy *= 1.3;
      amp.charges--;
      amp.flashTimer = 0.2;
      spawnParticles(amp.x, amp.y, AC.charge, 8);
      spawnParticles(amp.x, amp.y, '#ffffff', 4);
      if (amp.charges <= 0) {
        // Shatter effect
        amp.shatterTimer = 0.3;
        spawnParticles(amp.x, amp.y, AC.body, 16);
        spawnParticles(amp.x, amp.y, AC.charge, 10);
      }
      return; // one amplifier per frame per bullet
    }
  }
}

// ---- Draw ----

export function drawAmplifier(amp) {
  const pulse = 0.5 + 0.5 * Math.sin(amp.glowPhase);
  const isShattered = amp.charges <= 0;

  if (isShattered) {
    // Fading out
    ctx.globalAlpha = Math.max(0, amp.shatterTimer / 0.3);
  }

  const flashActive = amp.flashTimer > 0;

  // Glow
  ctx.shadowColor = AC.glow;
  ctx.shadowBlur = 6 + pulse * 6;

  // Diamond/hexagonal body
  const s = 10; // half-size
  ctx.save();
  ctx.translate(amp.x, amp.y);

  // Diamond shape
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(s * 0.7, 0);
  ctx.lineTo(0, s);
  ctx.lineTo(-s * 0.7, 0);
  ctx.closePath();

  // Fill
  ctx.fillStyle = flashActive ? '#ffffff' : (isShattered ? '#336644' : AC.body);
  ctx.fill();

  // Outline
  ctx.strokeStyle = flashActive ? '#ffffff' : AC.bodyDark;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Inner highlight
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.5);
  ctx.lineTo(s * 0.35, 0);
  ctx.lineTo(0, s * 0.5);
  ctx.lineTo(-s * 0.35, 0);
  ctx.closePath();
  ctx.fillStyle = flashActive ? '#ffffff' : AC.glow;
  ctx.globalAlpha = (isShattered ? 0.2 : 0.4 + pulse * 0.2) * (ctx.globalAlpha || 1);
  ctx.fill();
  ctx.globalAlpha = isShattered ? Math.max(0, amp.shatterTimer / 0.3) : 1;

  ctx.restore();
  ctx.shadowBlur = 0;

  // Charge indicators: small orbiting dots
  if (!isShattered) {
    for (let k = 0; k < amp.charges; k++) {
      const angle = amp.glowPhase * 0.8 + (k / amp.maxCharges) * Math.PI * 2;
      const r = 16 + pulse * 2;
      const cx = amp.x + Math.cos(angle) * r;
      const cy = amp.y + Math.sin(angle) * r;
      ctx.shadowColor = AC.charge;
      ctx.shadowBlur = 4;
      ctx.fillStyle = AC.charge;
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  ctx.globalAlpha = 1;
}

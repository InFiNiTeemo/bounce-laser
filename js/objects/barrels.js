/**
 * barrels.js - Barrel spawning, explosion chain reactions, and rendering.
 */
import { ctx, drawPixelCircle, drawPixelRect } from '../core/render.js';
import { W, H, COLORS, BARREL_COLORS, BARREL_MIN_LEVEL, BARREL_EXPLOSION_RADIUS } from '../core/constants.js';
import { game, player } from '../core/state.js';
import { spawnParticles } from '../systems/particles.js';
import { getSprite } from '../sprites/spriteLoader.js';
import { SPRITE_DEFS } from '../sprites/spriteData.js';
import { playSound } from '../systems/audio.js';
import { registerKill } from '../systems/combo.js';

export function spawnBarrels() {
  game.barrels = [];
  if (game.level < BARREL_MIN_LEVEL) return;
  const count = Math.min(1 + Math.floor((game.level - BARREL_MIN_LEVEL) / 2), 4);
  for (let i = 0; i < count; i++) {
    let bx, by;
    do {
      bx = 50 + Math.random() * (W - 100);
      by = 50 + Math.random() * (H - 100);
    } while (
      Math.hypot(bx - player.x, by - player.y) < 100 ||
      game.enemies.some(e => Math.hypot(bx - e.x, by - e.y) < 40) ||
      game.barrels.some(b => Math.hypot(bx - b.x, by - b.y) < 50)
    );
    game.barrels.push({
      x: bx,
      y: by,
      size: 10,
      glowPhase: Math.random() * Math.PI * 2,
      exploded: false
    });
  }
}

export function explodeBarrel(barrel) {
  if (barrel.exploded) return;
  barrel.exploded = true;
  playSound('barrel_explode');
  const bx = barrel.x;
  const by = barrel.y;
  spawnParticles(bx, by, '#ff4444', 20);
  spawnParticles(bx, by, '#ff8822', 16);
  spawnParticles(bx, by, '#ffcc44', 12);
  spawnParticles(bx, by, '#ffffff', 6);
  game.screenShake = Math.max(game.screenShake, 0.4);
  const effectiveRadius = BARREL_EXPLOSION_RADIUS * game.explosionRadiusMult;
  const er2 = effectiveRadius * effectiveRadius;
  for (let i = game.enemies.length - 1; i >= 0; i--) {
    const e = game.enemies[i];
    if (e.type === 'ghost' && !e.visible) continue;
    const dx = bx - e.x, dy = by - e.y;
    if (dx * dx + dy * dy < er2) {
      e.hp -= (2 + game.explosionDmgBonus);
      e.flashTimer = 0.15;
      spawnParticles(e.x, e.y, COLORS.enemy, 8);
      if (e.hp <= 0) {
        spawnParticles(e.x, e.y, '#ffcc44', 16);
        game.enemies.splice(i, 1);
        game.killedEnemies++;
        const barrelKillScore = 150 * game.level;
        game.score += barrelKillScore;
        registerKill(e.x, e.y, barrelKillScore);
      }
    }
  }
  for (let i = game.barrels.length - 1; i >= 0; i--) {
    const other = game.barrels[i];
    if (!other.exploded) { const dx = bx - other.x, dy = by - other.y; if (dx * dx + dy * dy < er2) explodeBarrel(other); }
  }
  for (let i = game.enemyBullets.length - 1; i >= 0; i--) {
    const eb = game.enemyBullets[i];
    const dx = bx - eb.x, dy = by - eb.y;
    if (dx * dx + dy * dy < er2) {
      spawnParticles(eb.x, eb.y, COLORS.warning, 4);
      game.enemyBullets.splice(i, 1);
    }
  }
}

export function updateBarrels(dt) {
  for (let i = 0; i < game.barrels.length; i++) {
    game.barrels[i].glowPhase += dt * 3;
  }
  game.barrels = game.barrels.filter(b => !b.exploded);
}

export function drawBarrel(barrel) {
  const pulse = 0.5 + 0.5 * Math.sin(barrel.glowPhase);
  // Explosion radius indicator
  const radius = BARREL_EXPLOSION_RADIUS * game.explosionRadiusMult;
  ctx.save();
  ctx.beginPath();
  ctx.arc(barrel.x, barrel.y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255,68,68,${0.08 + pulse * 0.06})`;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  // Barrel sprite
  ctx.shadowColor = BARREL_COLORS.glow;
  ctx.shadowBlur = 4 + pulse * 6;
  const sprite = getSprite('barrel');
  const def = SPRITE_DEFS.barrel;
  ctx.drawImage(sprite, Math.floor(barrel.x - def.cx), Math.floor(barrel.y - def.cy), def.w, def.h);
  ctx.shadowBlur = 0;
}

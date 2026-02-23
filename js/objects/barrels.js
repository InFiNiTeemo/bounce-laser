/**
 * barrels.js - Barrel spawning, explosion chain reactions, and rendering.
 */
import { ctx, drawPixelCircle, drawPixelRect } from '../core/render.js';
import { W, H, COLORS, BARREL_COLORS, BARREL_MIN_LEVEL, BARREL_EXPLOSION_RADIUS } from '../core/constants.js';
import { game, player } from '../core/state.js';
import { spawnParticles } from '../systems/particles.js';

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
  const bx = barrel.x;
  const by = barrel.y;
  spawnParticles(bx, by, '#ff4444', 20);
  spawnParticles(bx, by, '#ff8822', 16);
  spawnParticles(bx, by, '#ffcc44', 12);
  spawnParticles(bx, by, '#ffffff', 6);
  game.screenShake = Math.max(game.screenShake, 0.4);
  for (let i = game.enemies.length - 1; i >= 0; i--) {
    const e = game.enemies[i];
    if (Math.hypot(bx - e.x, by - e.y) < BARREL_EXPLOSION_RADIUS) {
      e.hp -= 2;
      e.flashTimer = 0.15;
      spawnParticles(e.x, e.y, COLORS.enemy, 8);
      if (e.hp <= 0) {
        spawnParticles(e.x, e.y, '#ffcc44', 16);
        game.enemies.splice(i, 1);
        game.killedEnemies++;
        game.score += 150 * game.level;
      }
    }
  }
  for (let i = game.barrels.length - 1; i >= 0; i--) {
    const other = game.barrels[i];
    if (!other.exploded && Math.hypot(bx - other.x, by - other.y) < BARREL_EXPLOSION_RADIUS) {
      explodeBarrel(other);
    }
  }
  for (let i = game.enemyBullets.length - 1; i >= 0; i--) {
    const eb = game.enemyBullets[i];
    if (Math.hypot(bx - eb.x, by - eb.y) < BARREL_EXPLOSION_RADIUS) {
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
  const bx = barrel.x;
  const by = barrel.y;
  const r = barrel.size;
  const pulse = 0.5 + 0.5 * Math.sin(barrel.glowPhase);
  ctx.shadowColor = BARREL_COLORS.glow;
  ctx.shadowBlur = 4 + pulse * 6;
  drawPixelCircle(bx, by, r, BARREL_COLORS.bodyDark);
  drawPixelCircle(bx, by, r - 2, BARREL_COLORS.body);
  drawPixelRect(bx - r + 2, by - 3, (r - 2) * 2, 2, BARREL_COLORS.band);
  drawPixelRect(bx - r + 2, by + 2, (r - 2) * 2, 2, BARREL_COLORS.band);
  drawPixelRect(bx - 1, by - 1, 2, 2, BARREL_COLORS.danger);
  ctx.shadowBlur = 0;
}

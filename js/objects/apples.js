/**
 * apples.js - Health apple spawning, animation, and rendering.
 */
import { ctx, drawPixelRect } from '../core/render.js';
import { W, H } from '../core/constants.js';
import { game, player } from '../core/state.js';
import { getSprite } from '../sprites/spriteLoader.js';
import { SPRITE_DEFS } from '../sprites/spriteData.js';

export function spawnApples() {
  game.apples = [];
  if (game.playerHp >= game.playerMaxHp && Math.random() > 0.4) return;
  const count = game.level >= 5 ? 2 : 1;
  for (let i = 0; i < count; i++) {
    let ax, ay, att = 0;
    do {
      ax = 50 + Math.random() * (W - 100);
      ay = 50 + Math.random() * (H - 100);
      att++;
    } while (att < 50 && (
      Math.hypot(ax - player.x, ay - player.y) < 100 ||
      game.enemies.some(e => Math.hypot(ax - e.x, ay - e.y) < 40)
    ));
    game.apples.push({ x: ax, y: ay, size: 8, bobPhase: Math.random() * Math.PI * 2 });
  }
}

export function updateApples(dt) {
  for (const a of game.apples) a.bobPhase += dt * 2.5;
}

export function drawApple(a) {
  const bob = Math.sin(a.bobPhase) * 2;
  ctx.save();
  ctx.shadowColor = '#ff4444';
  ctx.shadowBlur = 6 + Math.sin(a.bobPhase * 2) * 3;
  const sprite = getSprite('apple');
  const def = SPRITE_DEFS.apple;
  ctx.drawImage(sprite, Math.floor(a.x - def.cx), Math.floor(a.y + bob - def.cy), def.w, def.h);
  ctx.shadowBlur = 0;
  ctx.restore();
}

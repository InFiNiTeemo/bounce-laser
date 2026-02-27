/**
 * BACKUP — Original drawApple() from js/objects/apples.js
 * This file is for archival only; NOT imported by the game.
 *
 * Dependencies: ctx, drawPixelRect from core/render.js
 * No constants needed (colors are hardcoded).
 */

export function drawApple(a) {
  const bob = Math.sin(a.bobPhase) * 2;
  const cx = a.x, cy = a.y + bob;

  ctx.save();
  ctx.shadowColor = '#ff4444';
  ctx.shadowBlur = 6 + Math.sin(a.bobPhase * 2) * 3;

  // Stem
  drawPixelRect(cx - 2, cy - 12, 3, 6, '#55aa33');
  drawPixelRect(cx + 2, cy - 11, 3, 3, '#44dd22');

  // Body (4 layers, top to bottom)
  drawPixelRect(cx - 6, cy - 6, 12, 3, '#ff2222');
  drawPixelRect(cx - 8, cy - 3, 15, 6, '#ff3333');
  drawPixelRect(cx - 6, cy + 3, 12, 3, '#cc2222');
  drawPixelRect(cx - 3, cy + 6, 6, 3, '#aa1111');

  // Highlight
  drawPixelRect(cx - 5, cy - 3, 3, 3, '#ff8888');

  ctx.shadowBlur = 0;
  ctx.restore();
}

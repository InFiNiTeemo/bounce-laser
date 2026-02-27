/**
 * BACKUP — Original drawBarrel() from js/objects/barrels.js
 * This file is for archival only; NOT imported by the game.
 *
 * Dependencies: ctx, drawPixelCircle, drawPixelRect from core/render.js
 * Colors used: BARREL_COLORS = {
 *   body: '#ff8822', bodyDark: '#aa5511',
 *   band: '#ffcc44', danger: '#ff2200', glow: '#ffaa33'
 * }
 */

export function drawBarrel(barrel) {
  const bx = barrel.x;
  const by = barrel.y;
  const r = barrel.size * 1.5;    // size=10 → r=15
  const pulse = 0.5 + 0.5 * Math.sin(barrel.glowPhase);

  ctx.shadowColor = BARREL_COLORS.glow;         // #ffaa33
  ctx.shadowBlur = 4 + pulse * 6;

  // Body
  drawPixelCircle(bx, by, r, BARREL_COLORS.bodyDark);   // #aa5511
  drawPixelCircle(bx, by, r - 2, BARREL_COLORS.body);   // #ff8822

  // Horizontal band stripes
  drawPixelRect(bx - r + 2, by - 3, (r - 2) * 2, 2, BARREL_COLORS.band);     // #ffcc44
  drawPixelRect(bx - r + 2, by + 2, (r - 2) * 2, 2, BARREL_COLORS.band);

  // Center danger dot
  drawPixelRect(bx - 1, by - 1, 2, 2, BARREL_COLORS.danger);   // #ff2200

  ctx.shadowBlur = 0;
}

/**
 * BACKUP — Original drawPrism() and drawPickup() from js/objects/prism.js
 * This file is for archival only; NOT imported by the game.
 *
 * Dependencies: ctx, drawPixelRect, drawPixelCircle from core/render.js
 * Constants: PRISM_UNIT_W = 40
 * Colors used: PRISM_COLORS = {
 *   body: '#aa44ff', bodyDark: '#6622aa', glow: '#cc66ff',
 *   destructible: '#ff88cc', destructibleDark: '#aa4488'
 * }
 */

export function drawPrism(p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  const hw = p.w / 2;
  const hh = p.h / 2;
  const gi = 0.5 + Math.sin(p.glowPhase) * 0.3;
  const segments = p.segments || 1;

  // Flash white on hit
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

  // Layer 1: dark outer body (one continuous rect)
  drawPixelRect(-hw, -hh, p.w, p.h, isD ? PRISM_COLORS.destructibleDark : PRISM_COLORS.bodyDark);
  // Layer 2: bright inner body (one continuous rect, inset 2px)
  drawPixelRect(-hw + 2, -hh + 2, p.w - 4, p.h - 4, isD ? PRISM_COLORS.destructible : PRISM_COLORS.body);

  // Layer 3: end cap highlights (multi-segment only)
  if (segments > 1) {
    const capW = 4;
    const capColor = isD
      ? `rgba(255,180,220,${0.25 + gi * 0.15})`
      : `rgba(200,140,255,${0.25 + gi * 0.15})`;
    ctx.fillStyle = capColor;
    ctx.fillRect(Math.floor(-hw + 2), Math.floor(-hh + 2), capW, p.h - 4);
    ctx.fillRect(Math.floor(hw - 2 - capW), Math.floor(-hh + 2), capW, p.h - 4);
  }

  // Layer 4: segment divider lines (multi-segment only)
  if (segments > 1) {
    const divColor = isD
      ? `rgba(170,68,136,${0.3 + gi * 0.2})`
      : `rgba(102,34,170,${0.3 + gi * 0.2})`;
    ctx.fillStyle = divColor;
    for (let i = 1; i < segments; i++) {
      const dx = -hw + i * PRISM_UNIT_W;
      ctx.fillRect(Math.floor(dx), Math.floor(-hh + 3), 1, p.h - 6);
    }
  }

  // Layer 5: center white stripe (continuous)
  ctx.fillStyle = `rgba(255,255,255,${0.3 + gi * 0.2})`;
  ctx.fillRect(Math.floor(-hw + 4), Math.floor(-1), p.w - 8, 2);
  ctx.shadowBlur = 0;

  // Health bar (destructible)
  if (isD && p.maxHp > 0) {
    const bw = p.w - 4;
    const ratio = p.hp / p.maxHp;
    drawPixelRect(-bw / 2, -hh - 6, bw, 3, '#330033');
    drawPixelRect(-bw / 2, -hh - 6, bw * ratio, 3, PRISM_COLORS.destructible);
  }

  // Rotating indicators
  if (p.type === 'rotating') {
    ctx.fillStyle = `rgba(200,100,255,${0.4 + gi * 0.3})`;
    ctx.fillRect(Math.floor(hw + 2), -2, 3, 3);
    ctx.fillRect(Math.floor(-hw - 5), -2, 3, 3);
  }

  ctx.restore();
}

export function drawPickup(pk) {
  const bob = Math.sin(pk.bobPhase) * 3;
  const pulse = 0.6 + Math.sin(pk.bobPhase * 2) * 0.4;

  // Blink when about to expire
  if (pk.life < 120 && Math.floor(pk.life / 8) % 2 === 0) return;

  ctx.save();
  ctx.shadowColor = '#ffaaff';
  ctx.shadowBlur = 10 * pulse;

  const cx = pk.x;
  const cy = pk.y + bob;

  // Diamond shape (piercing pickup)
  drawPixelRect(cx - 1, cy - 6, 2, 2, '#ffaaff');
  drawPixelRect(cx - 3, cy - 4, 6, 2, '#ffaaff');
  drawPixelRect(cx - 5, cy - 2, 10, 2, '#ff88ff');
  drawPixelRect(cx - 3, cy, 6, 2, '#ffaaff');
  drawPixelRect(cx - 1, cy + 2, 2, 2, '#ffaaff');
  // Inner highlight
  drawPixelRect(cx - 1, cy - 2, 2, 2, '#ffffff');

  ctx.shadowBlur = 0;

  // "穿透" label
  ctx.fillStyle = '#ffaaff';
  ctx.font = '7px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.globalAlpha = pulse;
  ctx.fillText('\u7a7f\u900f', cx, cy + 12);
  ctx.globalAlpha = 1;

  ctx.restore();
}

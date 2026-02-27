/**
 * BACKUP — Original drawPlayer() from js/entities/player.js
 * This file is for archival only; NOT imported by the game.
 *
 * Dependencies: ctx, drawPixelRect, drawPixelCircle from core/render.js
 * Colors used: COLORS.player (#00ff88), COLORS.playerDark (#009955),
 *              COLORS.gun (#cccccc), COLORS.laserGlow (#00ffcc)
 * State used:  player (x, y, size, invincibleTimer, gunLength),
 *              game (gunAngle, secondLife, secondLifeUsed)
 */

export function drawPlayer() {
  const p = player;
  if (p.invincibleTimer > 0 && Math.floor(p.invincibleTimer * 10) % 2 === 0) return;
  const s = p.size;

  // 二次生命光环（未使用时显示金色脉冲环）
  if (game.secondLife && !game.secondLifeUsed) {
    const pulse = 0.4 + Math.sin(Date.now() / 300) * 0.3;
    const r = s + 6 + Math.sin(Date.now() / 400) * 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,221,68,${pulse})`;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#ffdd44';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Shadow
  drawPixelCircle(p.x, p.y + s + 2, s * 0.6, 'rgba(0,0,0,0.3)');
  // Body outer
  drawPixelCircle(p.x, p.y, s, COLORS.playerDark);   // #009955
  // Body inner
  drawPixelCircle(p.x, p.y, s - 3, COLORS.player);   // #00ff88

  // Eyes (follow gun angle)
  const ex = Math.cos(game.gunAngle) * 4;
  const ey = Math.sin(game.gunAngle) * 4;
  drawPixelRect(p.x - 4 + ex, p.y - 3 + ey, 3, 3, '#003322');
  drawPixelRect(p.x + 2 + ex, p.y - 3 + ey, 3, 3, '#003322');

  // Gun barrel
  const gx = p.x + Math.cos(game.gunAngle) * p.gunLength;
  const gy = p.y + Math.sin(game.gunAngle) * p.gunLength;
  ctx.strokeStyle = COLORS.gun;   // #cccccc
  ctx.lineWidth = 4;
  ctx.shadowColor = COLORS.laserGlow;   // #00ffcc
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.moveTo(
    p.x + Math.cos(game.gunAngle) * s,
    p.y + Math.sin(game.gunAngle) * s
  );
  ctx.lineTo(gx, gy);
  ctx.stroke();
  ctx.shadowBlur = 0;
  // Gun tip
  drawPixelCircle(gx, gy, 3, COLORS.laserGlow);
}

/**
 * BACKUP — Original enemy draw functions from js/entities/enemies.js
 * This file is for archival only; NOT imported by the game.
 *
 * Dependencies: ctx, drawPixelRect, drawPixelCircle from core/render.js
 * Colors used:
 *   COLORS.enemy (#ff4466), COLORS.enemyDark (#aa2244)
 *   ENEMY_COLORS.patrol  { body:'#4488ff', dark:'#2255cc', eye:'#002266' }
 *   ENEMY_COLORS.tank    { body:'#aa44ff', dark:'#6622cc', eye:'#330066' }
 *   ENEMY_COLORS.sniper  { body:'#ffcc00', dark:'#aa8800', eye:'#664400' }
 *   ENEMY_COLORS.healer  { body:'#44cc88', dark:'#228855', eye:'#004422' }
 *   ENEMY_COLORS.ghost   { body:'#44ddcc', dark:'#228877', eye:'#004433' }
 * State used: player (x, y), game (enemies)
 */

// ---- Dispatch + flash ----
export function drawEnemy(e) {
  const bob = Math.sin(e.bobPhase) * 2;

  // Flash white on hit — all types
  if (e.flashTimer > 0) {
    if (e.type === 'ghost') ctx.globalAlpha = e.fadeAlpha;
    drawPixelCircle(e.x, e.y + bob, e.size + 2, '#ffffff');
    if (e.type === 'ghost') ctx.globalAlpha = 1;
    return;
  }

  if (e.type === 'patrol') {
    drawEnemyPatrol(e, bob);
  } else if (e.type === 'tank') {
    drawEnemyTank(e, bob);
  } else if (e.type === 'sniper') {
    drawEnemySniper(e, bob);
  } else if (e.type === 'healer') {
    drawEnemyHealer(e, bob);
  } else if (e.type === 'ghost') {
    drawEnemyGhost(e, bob);
  } else {
    drawEnemyBasic(e, bob);
  }
}

// ---- Basic (red) ----
function drawEnemyBasic(e, bob) {
  drawPixelCircle(e.x, e.y + bob, e.size, COLORS.enemyDark);      // #aa2244
  drawPixelCircle(e.x, e.y + bob, e.size - 3, COLORS.enemy);      // #ff4466
  drawPixelRect(e.x - 5, e.y - 4 + bob, 4, 4, '#880022');         // eyes
  drawPixelRect(e.x + 2, e.y - 4 + bob, 4, 4, '#880022');
  // HP bar
  if (e.maxHp > 1) {
    const bw = 20, ratio = e.hp / e.maxHp;
    drawPixelRect(e.x - bw / 2, e.y - e.size - 8 + bob, bw, 3, '#330011');
    drawPixelRect(e.x - bw / 2, e.y - e.size - 8 + bob, bw * ratio, 3, COLORS.enemy);
  }
  // Gun barrel
  if (e.canShoot) {
    const a = Math.atan2(player.y - e.y, player.x - e.x);
    const gx = e.x + Math.cos(a) * (e.size + 6);
    const gy = e.y + bob + Math.sin(a) * (e.size + 6);
    drawPixelRect(gx - 2, gy - 2, 4, 4, '#ff8844');
  }
}

// ---- Patrol (blue) ----
function drawEnemyPatrol(e, bob) {
  const C = ENEMY_COLORS.patrol;
  drawPixelCircle(e.x, e.y + bob, e.size, C.dark);
  drawPixelCircle(e.x, e.y + bob, e.size - 3, C.body);
  drawPixelRect(e.x - 5, e.y - 4 + bob, 4, 4, C.eye);
  drawPixelRect(e.x + 2, e.y - 4 + bob, 4, 4, C.eye);
  // Direction triangle indicator
  const dir = e.moveVx >= 0 ? 1 : -1;
  const tx = e.x + dir * (e.size + 5);
  const ty = e.y + bob;
  ctx.fillStyle = C.body;
  ctx.beginPath();
  ctx.moveTo(tx + dir * 5, ty);
  ctx.lineTo(tx - dir * 2, ty - 4);
  ctx.lineTo(tx - dir * 2, ty + 4);
  ctx.closePath();
  ctx.fill();
}

// ---- Tank (purple) ----
function drawEnemyTank(e, bob) {
  const C = ENEMY_COLORS.tank;
  drawPixelCircle(e.x, e.y + bob, e.size, C.dark);
  drawPixelCircle(e.x, e.y + bob, e.size - 3, C.body);
  // Armor bands (2 horizontal lines)
  drawPixelRect(e.x - e.size + 4, e.y - 3 + bob, (e.size - 4) * 2, 2, C.dark);
  drawPixelRect(e.x - e.size + 4, e.y + 3 + bob, (e.size - 4) * 2, 2, C.dark);
  // Eyes
  drawPixelRect(e.x - 6, e.y - 5 + bob, 4, 4, C.eye);
  drawPixelRect(e.x + 3, e.y - 5 + bob, 4, 4, C.eye);
  // HP bar
  const bw = 24, ratio = e.hp / e.maxHp;
  drawPixelRect(e.x - bw / 2, e.y - e.size - 8 + bob, bw, 3, '#220033');
  drawPixelRect(e.x - bw / 2, e.y - e.size - 8 + bob, bw * ratio, 3, C.body);
  // Thick gun barrel
  const a = Math.atan2(player.y - e.y, player.x - e.x);
  const gx = e.x + Math.cos(a) * (e.size + 4);
  const gy = e.y + bob + Math.sin(a) * (e.size + 4);
  drawPixelRect(gx - 3, gy - 3, 6, 6, C.dark);
  drawPixelRect(gx - 2, gy - 2, 4, 4, '#cc66ff');
}

// ---- Sniper (yellow) ----
function drawEnemySniper(e, bob) {
  const C = ENEMY_COLORS.sniper;
  // Charging aim line — drawn BEFORE body so it appears behind
  if (e.charging) {
    const a = Math.atan2(player.y - (e.y + bob), player.x - e.x);
    const dist = Math.hypot(player.x - e.x, player.y - (e.y + bob));
    ctx.save();
    ctx.strokeStyle = '#ff2222';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 80) * 0.3;
    ctx.beginPath();
    ctx.moveTo(e.x, e.y + bob);
    ctx.lineTo(e.x + Math.cos(a) * dist, e.y + bob + Math.sin(a) * dist);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Body — flicker when charging
  const show = !e.charging || Math.sin(Date.now() / 60) > -0.3;
  if (show) {
    drawPixelCircle(e.x, e.y + bob, e.size, C.dark);
    drawPixelCircle(e.x, e.y + bob, e.size - 3, C.body);
    drawPixelRect(e.x - 4, e.y - 3 + bob, 3, 3, C.eye);
    drawPixelRect(e.x + 2, e.y - 3 + bob, 3, 3, C.eye);
  }
  // Scope / crosshair decoration on top
  if (show) {
    const a = Math.atan2(player.y - e.y, player.x - e.x);
    const gx = e.x + Math.cos(a) * (e.size + 4);
    const gy = e.y + bob + Math.sin(a) * (e.size + 4);
    drawPixelRect(gx - 1, gy - 1, 3, 3, e.charging ? '#ff4444' : C.dark);
  }
}

// ---- Healer (green diamond) ----
function drawEnemyHealer(e, bob) {
  const C = ENEMY_COLORS.healer;
  // Healing pulse ring
  if (e.healPulseTimer > 0) {
    const progress = 1 - e.healPulseTimer / 0.5;
    const r = e.size + progress * (e.healRange - e.size);
    ctx.globalAlpha = 0.3 * (1 - progress);
    ctx.strokeStyle = C.body;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(e.x, e.y + bob, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // Diamond body
  const s = e.size;
  const cy = e.y + bob;
  ctx.save();
  ctx.shadowColor = C.body;
  ctx.shadowBlur = 6;
  ctx.fillStyle = C.dark;
  ctx.beginPath();
  ctx.moveTo(e.x, cy - s);
  ctx.lineTo(e.x + s, cy);
  ctx.lineTo(e.x, cy + s);
  ctx.lineTo(e.x - s, cy);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = C.body;
  ctx.beginPath();
  ctx.moveTo(e.x, cy - s + 3);
  ctx.lineTo(e.x + s - 3, cy);
  ctx.lineTo(e.x, cy + s - 3);
  ctx.lineTo(e.x - s + 3, cy);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
  // White cross (medical symbol)
  drawPixelRect(e.x - 1, cy - 5, 2, 10, '#ffffff');
  drawPixelRect(e.x - 5, cy - 1, 10, 2, '#ffffff');
  // Eyes
  drawPixelRect(e.x - 5, cy - 4, 3, 3, C.eye);
  drawPixelRect(e.x + 3, cy - 4, 3, 3, C.eye);
  // HP bar
  if (e.maxHp > 1) {
    const bw = 20, ratio = e.hp / e.maxHp;
    drawPixelRect(e.x - bw / 2, cy - s - 8, bw, 3, '#003322');
    drawPixelRect(e.x - bw / 2, cy - s - 8, bw * ratio, 3, C.body);
  }
}

// ---- Ghost (cyan, phase in/out) ----
function drawEnemyGhost(e, bob) {
  const C = ENEMY_COLORS.ghost;
  ctx.globalAlpha = e.fadeAlpha;
  const s = e.size;
  const cy = e.y + bob;
  ctx.save();
  ctx.shadowColor = C.body;
  ctx.shadowBlur = 8 * e.fadeAlpha;
  // Ghost body: dome top + wavy bottom
  ctx.fillStyle = C.dark;
  ctx.beginPath();
  ctx.arc(e.x, cy - 2, s, Math.PI, 0); // dome top
  // Wavy bottom tail
  const wave = Math.sin(e.bobPhase * 2) * 2;
  ctx.lineTo(e.x + s, cy + s - 2);
  ctx.lineTo(e.x + s * 0.6, cy + s - 5 + wave);
  ctx.lineTo(e.x + s * 0.2, cy + s - 2);
  ctx.lineTo(e.x - s * 0.2, cy + s - 5 - wave);
  ctx.lineTo(e.x - s * 0.6, cy + s - 2);
  ctx.lineTo(e.x - s, cy + s - 2);
  ctx.closePath();
  ctx.fill();
  // Inner lighter body
  ctx.fillStyle = C.body;
  ctx.beginPath();
  ctx.arc(e.x, cy - 2, s - 3, Math.PI, 0);
  ctx.lineTo(e.x + s - 3, cy + s - 5);
  ctx.lineTo(e.x + s * 0.5, cy + s - 7 + wave);
  ctx.lineTo(e.x, cy + s - 5);
  ctx.lineTo(e.x - s * 0.5, cy + s - 7 - wave);
  ctx.lineTo(e.x - s + 3, cy + s - 5);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
  // Eyes — larger, glowing
  drawPixelRect(e.x - 5, cy - 4, 4, 4, C.eye);
  drawPixelRect(e.x + 2, cy - 4, 4, 4, C.eye);
  drawPixelRect(e.x - 4, cy - 3, 2, 2, '#88ffee');
  drawPixelRect(e.x + 3, cy - 3, 2, 2, '#88ffee');
  // Gun barrel
  if (e.canShoot) {
    const a = Math.atan2(player.y - e.y, player.x - e.x);
    const gx = e.x + Math.cos(a) * (s + 5);
    const gy = cy + Math.sin(a) * (s + 5);
    drawPixelRect(gx - 2, gy - 2, 4, 4, C.dark);
  }
  // HP bar
  if (e.maxHp > 1) {
    const bw = 20, ratio = e.hp / e.maxHp;
    drawPixelRect(e.x - bw / 2, cy - s - 8, bw, 3, '#002233');
    drawPixelRect(e.x - bw / 2, cy - s - 8, bw * ratio, 3, C.body);
  }
  ctx.globalAlpha = 1;
}

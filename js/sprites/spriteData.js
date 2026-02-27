/**
 * spriteData.js — Sprite registry and rendering for export tool.
 *
 * SPRITE_DEFS: metadata for each sprite (file, dimensions, anchor).
 * renderAllSprites(): renders each sprite body onto offscreen canvases
 *   using the original procedural draw code — used by the export tool.
 */
import { setCtx, getCtx, drawPixelCircle, drawPixelRect } from '../core/render.js';
import { COLORS, ENEMY_COLORS, PRISM_COLORS, BARREL_COLORS, PRISM_UNIT_W, SCALE } from '../core/constants.js';

export const SPRITE_DEFS = {
  player:              { file: 'player.png',              w: 48, h: 48, cx: 24, cy: 24 },
  enemy_basic:         { file: 'enemy_basic.png',         w: 40, h: 40, cx: 20, cy: 20 },
  enemy_patrol:        { file: 'enemy_patrol.png',        w: 40, h: 40, cx: 20, cy: 20 },
  enemy_tank:          { file: 'enemy_tank.png',          w: 48, h: 48, cx: 24, cy: 24 },
  enemy_sniper:        { file: 'enemy_sniper.png',        w: 36, h: 36, cx: 18, cy: 18 },
  enemy_healer:        { file: 'enemy_healer.png',        w: 40, h: 40, cx: 20, cy: 20 },
  enemy_ghost:         { file: 'enemy_ghost.png',         w: 40, h: 48, cx: 20, cy: 22 },
  barrel:              { file: 'barrel.png',              w: 44, h: 44, cx: 22, cy: 22 },
  apple:               { file: 'apple.png',               w: 36, h: 40, cx: 18, cy: 22 },
  prism_normal:        { file: 'prism_normal.png',        w: 56, h: 28, cx: 28, cy: 14 },
  prism_destructible:  { file: 'prism_destructible.png',  w: 56, h: 28, cx: 28, cy: 14 },
  pickup_piercing:     { file: 'pickup_piercing.png',     w: 28, h: 28, cx: 14, cy: 14 },
};

/**
 * Render every sprite body onto offscreen canvases using the original
 * procedural drawing code. Returns { key: HTMLCanvasElement }.
 * Call this from the export tool page (requires a valid rendering context).
 */
export function renderAllSprites() {
  const prevCtx = getCtx();
  const results = {};

  for (const [key, def] of Object.entries(SPRITE_DEFS)) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(def.w * SCALE);
    c.height = Math.ceil(def.h * SCALE);
    const offCtx = c.getContext('2d');
    offCtx.scale(SCALE, SCALE);
    setCtx(offCtx);
    _renderSprite(key, def);
    results[key] = c;
  }

  setCtx(prevCtx);
  return results;
}

// ---- Internal render functions per sprite ----

function _renderSprite(key, def) {
  const cx = def.cx, cy = def.cy;

  switch (key) {
    case 'player':        _renderPlayer(cx, cy); break;
    case 'enemy_basic':   _renderEnemyBasic(cx, cy); break;
    case 'enemy_patrol':  _renderEnemyPatrol(cx, cy); break;
    case 'enemy_tank':    _renderEnemyTank(cx, cy); break;
    case 'enemy_sniper':  _renderEnemySniper(cx, cy); break;
    case 'enemy_healer':  _renderEnemyHealer(cx, cy); break;
    case 'enemy_ghost':   _renderEnemyGhost(cx, cy); break;
    case 'barrel':        _renderBarrel(cx, cy); break;
    case 'apple':         _renderApple(cx, cy); break;
    case 'prism_normal':  _renderPrism(cx, cy, false); break;
    case 'prism_destructible': _renderPrism(cx, cy, true); break;
    case 'pickup_piercing': _renderPickup(cx, cy); break;
  }
}

function _renderPlayer(cx, cy) {
  const s = 14; // player.size
  // Shadow
  drawPixelCircle(cx, cy + s + 2, s * 0.6, 'rgba(0,0,0,0.3)');
  // Body outer
  drawPixelCircle(cx, cy, s, COLORS.playerDark);
  // Body inner
  drawPixelCircle(cx, cy, s - 3, COLORS.player);
  // Eyes are drawn dynamically in player.js (follow gun angle)
}

function _renderEnemyBasic(cx, cy) {
  const s = 12;
  drawPixelCircle(cx, cy, s, COLORS.enemyDark);
  drawPixelCircle(cx, cy, s - 3, COLORS.enemy);
  // Eyes
  drawPixelRect(cx - 5, cy - 4, 4, 4, '#880022');
  drawPixelRect(cx + 2, cy - 4, 4, 4, '#880022');
}

function _renderEnemyPatrol(cx, cy) {
  const C = ENEMY_COLORS.patrol;
  const s = 12;
  drawPixelCircle(cx, cy, s, C.dark);
  drawPixelCircle(cx, cy, s - 3, C.body);
  drawPixelRect(cx - 5, cy - 4, 4, 4, C.eye);
  drawPixelRect(cx + 2, cy - 4, 4, 4, C.eye);
}

function _renderEnemyTank(cx, cy) {
  const C = ENEMY_COLORS.tank;
  const s = 16;
  drawPixelCircle(cx, cy, s, C.dark);
  drawPixelCircle(cx, cy, s - 3, C.body);
  // Armor bands
  drawPixelRect(cx - s + 4, cy - 3, (s - 4) * 2, 2, C.dark);
  drawPixelRect(cx - s + 4, cy + 3, (s - 4) * 2, 2, C.dark);
  // Eyes
  drawPixelRect(cx - 6, cy - 5, 4, 4, C.eye);
  drawPixelRect(cx + 3, cy - 5, 4, 4, C.eye);
}

function _renderEnemySniper(cx, cy) {
  const C = ENEMY_COLORS.sniper;
  const s = 10;
  drawPixelCircle(cx, cy, s, C.dark);
  drawPixelCircle(cx, cy, s - 3, C.body);
  drawPixelRect(cx - 4, cy - 3, 3, 3, C.eye);
  drawPixelRect(cx + 2, cy - 3, 3, 3, C.eye);
}

function _renderEnemyHealer(cx, cy) {
  const C = ENEMY_COLORS.healer;
  const s = 11;
  const offCtx = getCtx();
  // Diamond body
  offCtx.save();
  offCtx.shadowColor = C.body;
  offCtx.shadowBlur = 6;
  offCtx.fillStyle = C.dark;
  offCtx.beginPath();
  offCtx.moveTo(cx, cy - s);
  offCtx.lineTo(cx + s, cy);
  offCtx.lineTo(cx, cy + s);
  offCtx.lineTo(cx - s, cy);
  offCtx.closePath();
  offCtx.fill();
  offCtx.fillStyle = C.body;
  offCtx.beginPath();
  offCtx.moveTo(cx, cy - s + 3);
  offCtx.lineTo(cx + s - 3, cy);
  offCtx.lineTo(cx, cy + s - 3);
  offCtx.lineTo(cx - s + 3, cy);
  offCtx.closePath();
  offCtx.fill();
  offCtx.shadowBlur = 0;
  offCtx.restore();
  // White cross
  drawPixelRect(cx - 1, cy - 5, 2, 10, '#ffffff');
  drawPixelRect(cx - 5, cy - 1, 10, 2, '#ffffff');
  // Eyes
  drawPixelRect(cx - 5, cy - 4, 3, 3, C.eye);
  drawPixelRect(cx + 3, cy - 4, 3, 3, C.eye);
}

function _renderEnemyGhost(cx, cy) {
  const C = ENEMY_COLORS.ghost;
  const s = 11;
  const offCtx = getCtx();
  offCtx.save();
  offCtx.shadowColor = C.body;
  offCtx.shadowBlur = 8;
  // Dome + wavy tail (wave=0 at rest)
  offCtx.fillStyle = C.dark;
  offCtx.beginPath();
  offCtx.arc(cx, cy - 2, s, Math.PI, 0);
  offCtx.lineTo(cx + s, cy + s - 2);
  offCtx.lineTo(cx + s * 0.6, cy + s - 5);
  offCtx.lineTo(cx + s * 0.2, cy + s - 2);
  offCtx.lineTo(cx - s * 0.2, cy + s - 5);
  offCtx.lineTo(cx - s * 0.6, cy + s - 2);
  offCtx.lineTo(cx - s, cy + s - 2);
  offCtx.closePath();
  offCtx.fill();
  // Inner body
  offCtx.fillStyle = C.body;
  offCtx.beginPath();
  offCtx.arc(cx, cy - 2, s - 3, Math.PI, 0);
  offCtx.lineTo(cx + s - 3, cy + s - 5);
  offCtx.lineTo(cx + s * 0.5, cy + s - 7);
  offCtx.lineTo(cx, cy + s - 5);
  offCtx.lineTo(cx - s * 0.5, cy + s - 7);
  offCtx.lineTo(cx - s + 3, cy + s - 5);
  offCtx.closePath();
  offCtx.fill();
  offCtx.shadowBlur = 0;
  offCtx.restore();
  // Eyes
  drawPixelRect(cx - 5, cy - 4, 4, 4, C.eye);
  drawPixelRect(cx + 2, cy - 4, 4, 4, C.eye);
  drawPixelRect(cx - 4, cy - 3, 2, 2, '#88ffee');
  drawPixelRect(cx + 3, cy - 3, 2, 2, '#88ffee');
}

function _renderBarrel(cx, cy) {
  const r = 15; // size=10 * 1.5
  const offCtx = getCtx();
  offCtx.shadowColor = BARREL_COLORS.glow;
  offCtx.shadowBlur = 7; // mid-pulse
  drawPixelCircle(cx, cy, r, BARREL_COLORS.bodyDark);
  drawPixelCircle(cx, cy, r - 2, BARREL_COLORS.body);
  drawPixelRect(cx - r + 2, cy - 3, (r - 2) * 2, 2, BARREL_COLORS.band);
  drawPixelRect(cx - r + 2, cy + 2, (r - 2) * 2, 2, BARREL_COLORS.band);
  drawPixelRect(cx - 1, cy - 1, 2, 2, BARREL_COLORS.danger);
  offCtx.shadowBlur = 0;
}

function _renderApple(cx, cy) {
  const offCtx = getCtx();
  offCtx.save();
  offCtx.shadowColor = '#ff4444';
  offCtx.shadowBlur = 6;
  // Stem
  drawPixelRect(cx - 2, cy - 12, 3, 6, '#55aa33');
  drawPixelRect(cx + 2, cy - 11, 3, 3, '#44dd22');
  // Body
  drawPixelRect(cx - 6, cy - 6, 12, 3, '#ff2222');
  drawPixelRect(cx - 8, cy - 3, 15, 6, '#ff3333');
  drawPixelRect(cx - 6, cy + 3, 12, 3, '#cc2222');
  drawPixelRect(cx - 3, cy + 6, 6, 3, '#aa1111');
  // Highlight
  drawPixelRect(cx - 5, cy - 3, 3, 3, '#ff8888');
  offCtx.shadowBlur = 0;
  offCtx.restore();
}

function _renderPrism(cx, cy, isDestructible) {
  const w = PRISM_UNIT_W; // 40
  const h = 12;
  const hw = w / 2;
  const hh = h / 2;
  const gi = 0.65; // mid-glow
  const offCtx = getCtx();

  offCtx.shadowColor = isDestructible ? PRISM_COLORS.destructible : PRISM_COLORS.glow;
  offCtx.shadowBlur = 12;

  // Outer body
  drawPixelRect(cx - hw, cy - hh, w, h,
    isDestructible ? PRISM_COLORS.destructibleDark : PRISM_COLORS.bodyDark);
  // Inner body
  drawPixelRect(cx - hw + 2, cy - hh + 2, w - 4, h - 4,
    isDestructible ? PRISM_COLORS.destructible : PRISM_COLORS.body);
  // Center white stripe
  offCtx.fillStyle = `rgba(255,255,255,${0.3 + gi * 0.2})`;
  offCtx.fillRect(Math.floor(cx - hw + 4), Math.floor(cy - 1), w - 8, 2);

  offCtx.shadowBlur = 0;
}

function _renderPickup(cx, cy) {
  const offCtx = getCtx();
  offCtx.save();
  offCtx.shadowColor = '#ffaaff';
  offCtx.shadowBlur = 8;
  // Diamond shape
  drawPixelRect(cx - 1, cy - 6, 2, 2, '#ffaaff');
  drawPixelRect(cx - 3, cy - 4, 6, 2, '#ffaaff');
  drawPixelRect(cx - 5, cy - 2, 10, 2, '#ff88ff');
  drawPixelRect(cx - 3, cy, 6, 2, '#ffaaff');
  drawPixelRect(cx - 1, cy + 2, 2, 2, '#ffaaff');
  // Inner highlight
  drawPixelRect(cx - 1, cy - 2, 2, 2, '#ffffff');
  offCtx.shadowBlur = 0;
  offCtx.restore();
}

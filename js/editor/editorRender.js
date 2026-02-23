/**
 * editorRender.js - Renders the editor canvas using game draw functions
 */
import { ctx, setCtx, drawBackground } from '../core/render.js';
import { W, H } from '../core/constants.js';
import { drawEnemy } from '../entities/enemies.js';
import { drawPrism } from '../objects/prism.js';
import { drawBarrel } from '../objects/barrels.js';
import { drawPortal } from '../objects/portals.js';
import { drawApple } from '../objects/apples.js';
import { drawPixelCircle, drawPixelRect } from '../core/render.js';

/**
 * Render the editor view to the given canvas context.
 */
export function renderEditor(editorCtx, state) {
  // Swap rendering context to editor canvas
  const prevCtx = ctx;
  setCtx(editorCtx);

  // Background
  drawBackground();

  // Grid overlay (snap grid) — brighter than game grid
  if (state.gridSnap) {
    editorCtx.strokeStyle = 'rgba(0,255,136,0.08)';
    editorCtx.lineWidth = 1;
    for (let x = 0; x < W; x += state.gridSize) {
      editorCtx.beginPath();
      editorCtx.moveTo(x, 0);
      editorCtx.lineTo(x, H);
      editorCtx.stroke();
    }
    for (let y = 0; y < H; y += state.gridSize) {
      editorCtx.beginPath();
      editorCtx.moveTo(0, y);
      editorCtx.lineTo(W, y);
      editorCtx.stroke();
    }
  }

  const ld = state.levelData;

  // Player spawn marker
  const ps = ld.playerSpawn || { x: W / 2, y: H / 2 };
  editorCtx.save();
  editorCtx.shadowColor = '#00ff88';
  editorCtx.shadowBlur = 12;
  drawPixelCircle(ps.x, ps.y, 14, '#009955');
  drawPixelCircle(ps.x, ps.y, 11, '#00ff88');
  // Gun indicator
  drawPixelRect(ps.x + 14, ps.y - 2, 8, 4, '#cccccc');
  // Eye
  drawPixelRect(ps.x + 2, ps.y - 4, 4, 4, '#003311');
  editorCtx.shadowBlur = 0;
  editorCtx.restore();
  // Label
  editorCtx.font = '7px "Press Start 2P"';
  editorCtx.fillStyle = '#00ff88';
  editorCtx.textAlign = 'center';
  editorCtx.fillText('\u73A9\u5BB6', ps.x, ps.y + 24);

  // Portals
  for (const p of (ld.portals || [])) {
    if (p.ax != null && p.bx != null) {
      drawPortal({
        ax: p.ax, ay: p.ay, bx: p.bx, by: p.by,
        radius: 16, spinPhase: performance.now() / 400,
      });
    }
  }

  // Prisms
  for (const p of (ld.prisms || [])) {
    if (p.x != null) {
      drawPrism({
        x: p.x, y: p.y, w: p.w || 40, h: p.h || 12,
        angle: p.angle || 0, type: p.type || 'static',
        hp: p.hp || 3, maxHp: p.hp || 3,
        flashTimer: 0, glowPhase: performance.now() / 500,
        rotSpeed: 0, splitCount: p.splitCount || 2,
      });
    }
  }

  // Barrels
  for (const b of (ld.barrels || [])) {
    if (b.x != null) {
      drawBarrel({
        x: b.x, y: b.y, size: 10,
        glowPhase: performance.now() / 400, exploded: false,
      });
    }
  }

  // Apples
  for (const a of (ld.apples || [])) {
    if (a.x != null) {
      drawApple({
        x: a.x, y: a.y, size: 8,
        bobPhase: performance.now() / 600,
      });
    }
  }

  // Enemies (draw last so they're on top)
  for (const e of (ld.enemies || [])) {
    if (e.x != null) {
      drawEnemy({
        type: e.type || 'basic',
        x: e.x, y: e.y,
        size: e.type === 'tank' ? 16 : (e.type === 'sniper' ? 10 : 12),
        hp: e.hp || 1, maxHp: e.hp || 1,
        canShoot: e.canShoot || false,
        flashTimer: 0, bobPhase: 0,
        moveVx: 1, moveVy: 0,
        charging: false, chargeTimer: 0,
        shootTimer: 999,
      });
    }
  }

  // Selection highlight
  if (state.selected) {
    const sel = state.selected;
    editorCtx.save();
    editorCtx.strokeStyle = '#ffdd44';
    editorCtx.lineWidth = 2;
    editorCtx.setLineDash([4, 4]);
    editorCtx.shadowColor = '#ffdd44';
    editorCtx.shadowBlur = 8;
    if (sel.kind === 'portal') {
      const p = ld.portals[sel.index];
      if (sel.end === 'a' || !sel.end) {
        editorCtx.strokeRect(p.ax - 20, p.ay - 20, 40, 40);
      }
      if (sel.end === 'b' || !sel.end) {
        editorCtx.strokeRect(p.bx - 20, p.by - 20, 40, 40);
      }
    } else if (sel.kind === 'player') {
      editorCtx.strokeRect(ps.x - 18, ps.y - 18, 36, 36);
    } else {
      const entity = getEntityBySelection(ld, sel);
      if (entity) {
        const sz = getEntitySize(sel.kind, entity);
        editorCtx.strokeRect(entity.x - sz - 4, entity.y - sz - 4, (sz + 4) * 2, (sz + 4) * 2);
      }
    }
    editorCtx.setLineDash([]);
    editorCtx.shadowBlur = 0;
    editorCtx.restore();
  }

  // Ghost preview (tool placement preview at cursor)
  if (state.tool !== 'select' && state.tool !== 'eraser' && state.cursorX >= 0) {
    editorCtx.globalAlpha = 0.4;
    const gx = state.snapX;
    const gy = state.snapY;
    if (state.tool === 'enemy') {
      const sub = state.enemySubtype;
      drawEnemy({
        type: sub, x: gx, y: gy,
        size: sub === 'tank' ? 16 : (sub === 'sniper' ? 10 : 12),
        hp: 1, maxHp: 1, canShoot: false,
        flashTimer: 0, bobPhase: 0,
        moveVx: 1, moveVy: 0,
        charging: false, chargeTimer: 0, shootTimer: 999,
      });
    } else if (state.tool === 'prism') {
      drawPrism({
        x: gx, y: gy, w: 40, h: 12,
        angle: 0, type: state.prismSubtype || 'static',
        hp: 3, maxHp: 3, flashTimer: 0,
        glowPhase: performance.now() / 500,
        rotSpeed: 0, splitCount: 2,
      });
    } else if (state.tool === 'barrel') {
      drawBarrel({ x: gx, y: gy, size: 10, glowPhase: 0, exploded: false });
    } else if (state.tool === 'portal') {
      drawPixelCircle(gx, gy, 16, state.portalPhase === 0 ? '#4488ff' : '#ff8844');
    } else if (state.tool === 'apple') {
      drawApple({ x: gx, y: gy, size: 8, bobPhase: 0 });
    } else if (state.tool === 'player') {
      drawPixelCircle(gx, gy, 14, '#00ff88');
    }
    editorCtx.globalAlpha = 1;
  }

  // Eraser cursor
  if (state.tool === 'eraser' && state.cursorX >= 0) {
    editorCtx.save();
    editorCtx.strokeStyle = '#ff4444';
    editorCtx.lineWidth = 2;
    editorCtx.beginPath();
    editorCtx.arc(state.cursorX, state.cursorY, 12, 0, Math.PI * 2);
    editorCtx.stroke();
    const cx = state.cursorX, cy = state.cursorY;
    editorCtx.beginPath();
    editorCtx.moveTo(cx - 6, cy - 6); editorCtx.lineTo(cx + 6, cy + 6);
    editorCtx.moveTo(cx + 6, cy - 6); editorCtx.lineTo(cx - 6, cy + 6);
    editorCtx.stroke();
    editorCtx.restore();
  }

  // Portal placement guide text
  if (state.tool === 'portal') {
    editorCtx.font = '8px "Press Start 2P"';
    editorCtx.fillStyle = state.portalPhase === 0 ? '#4488ff' : '#ff8844';
    editorCtx.textAlign = 'center';
    editorCtx.fillText(
      state.portalPhase === 0 ? '\u653E\u7F6E\u84DD\u8272\u4F20\u9001\u95E8' : '\u653E\u7F6E\u6A59\u8272\u4F20\u9001\u95E8',
      W / 2, H - 12
    );
  }

  // Restore original context
  setCtx(prevCtx);
}

function getEntityBySelection(ld, sel) {
  const arr = ld[sel.kind + 's'] || ld[sel.kind + 'es'] ||
    (sel.kind === 'enemy' ? ld.enemies : null);
  if (!arr) return null;
  return arr[sel.index];
}

function getEntitySize(kind, entity) {
  if (kind === 'enemy') {
    return entity.type === 'tank' ? 16 : (entity.type === 'sniper' ? 10 : 12);
  }
  if (kind === 'prism') return 20;
  if (kind === 'barrel') return 10;
  if (kind === 'apple') return 8;
  return 14;
}

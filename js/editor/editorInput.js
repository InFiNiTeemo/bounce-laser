/**
 * editorInput.js - Mouse and keyboard handling for the level editor
 *
 * Controls:
 *   Left click     - place / select / drag
 *   Right click    - delete entity under cursor
 *   Mouse wheel    - rotate selected entity (prism angle, ±15°)
 *   Shift+drag     - stretch prism (resize w/h)
 *   Delete/Backspace - delete selected
 *   Ctrl+Z / Ctrl+Y - undo / redo
 */
import { W, H, PRISM_UNIT_W, PRISM_MAX_SEGMENTS } from '../core/constants.js';
import { pushSnapshot, undo, redo } from './editorHistory.js';
import { worldToLocal } from '../objects/prism.js';

const HIT_RADIUS = {
  enemy: 14, barrel: 12, portal: 18, apple: 10, player: 16,
};

function hitTest(ld, mx, my) {
  const ps = ld.playerSpawn || { x: W / 2, y: H / 2 };
  if (Math.hypot(mx - ps.x, my - ps.y) < HIT_RADIUS.player) {
    return { kind: 'player', index: -1 };
  }
  for (let i = (ld.enemies || []).length - 1; i >= 0; i--) {
    const e = ld.enemies[i];
    if (e.x != null && Math.hypot(mx - e.x, my - e.y) < HIT_RADIUS.enemy) return { kind: 'enemy', index: i };
  }
  for (let i = (ld.prisms || []).length - 1; i >= 0; i--) {
    const p = ld.prisms[i];
    if (p.x == null) continue;
    const pw = p.w || 40, ph = p.h || 12;
    const maxR = Math.hypot(pw, ph) / 2 + 6;
    if (Math.hypot(mx - p.x, my - p.y) > maxR) continue;
    const local = worldToLocal(mx, my, { x: p.x, y: p.y, angle: p.angle || 0 });
    if (Math.abs(local.x) <= pw / 2 + 6 && Math.abs(local.y) <= ph / 2 + 6) {
      return { kind: 'prism', index: i };
    }
  }
  for (let i = (ld.barrels || []).length - 1; i >= 0; i--) {
    const b = ld.barrels[i];
    if (b.x != null && Math.hypot(mx - b.x, my - b.y) < HIT_RADIUS.barrel) return { kind: 'barrel', index: i };
  }
  for (let i = (ld.portals || []).length - 1; i >= 0; i--) {
    const p = ld.portals[i];
    if (p.ax != null && Math.hypot(mx - p.ax, my - p.ay) < HIT_RADIUS.portal) return { kind: 'portal', index: i, end: 'a' };
    if (p.bx != null && Math.hypot(mx - p.bx, my - p.by) < HIT_RADIUS.portal) return { kind: 'portal', index: i, end: 'b' };
  }
  for (let i = (ld.apples || []).length - 1; i >= 0; i--) {
    const a = ld.apples[i];
    if (a.x != null && Math.hypot(mx - a.x, my - a.y) < HIT_RADIUS.apple) return { kind: 'apple', index: i };
  }
  return null;
}

function deleteEntity(ld, sel) {
  if (sel.kind === 'player') return;
  if (sel.kind === 'portal') { ld.portals.splice(sel.index, 1); }
  else { const arr = getArray(ld, sel.kind); if (arr) arr.splice(sel.index, 1); }
}

function getArray(ld, kind) {
  if (kind === 'enemy') return ld.enemies;
  if (kind === 'prism') return ld.prisms;
  if (kind === 'barrel') return ld.barrels;
  if (kind === 'apple') return ld.apples;
  if (kind === 'portal') return ld.portals;
  return null;
}

export function initEditorInput(editorCanvas, state, onUpdate) {
  let dragging = false;
  let stretching = false; // Shift+drag to stretch prism
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let stretchStartX = 0;
  let stretchStartW = 40;
  let stretchStartH = 12;
  let prismDragging = false; // drag-to-create long prism

  function canvasCoords(e) {
    const r = editorCanvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
  }

  function snap(v) {
    if (!state.gridSnap) return v;
    return Math.round(v / state.gridSize) * state.gridSize;
  }

  function onMouseMove(e) {
    const { x, y } = canvasCoords(e);
    state.cursorX = x;
    state.cursorY = y;
    state.snapX = snap(x);
    state.snapY = snap(y);

    // Prism drag-to-create: compute segment count from distance
    if (prismDragging && state.tool === 'prism') {
      const angle = state.placementAngle || 0;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const dx = x - state.prismDragAnchorX;
      const dy = y - state.prismDragAnchorY;
      const proj = dx * cos + dy * sin;
      const projDist = Math.abs(proj);
      if (projDist > 5) state.prismDragDir = proj >= 0 ? 1 : -1;
      const rawSeg = Math.round(projDist / PRISM_UNIT_W);
      state.prismDragSegments = Math.max(1, Math.min(PRISM_MAX_SEGMENTS, rawSeg + 1));
      onUpdate();
      return;
    }

    if (stretching && state.selected && state.selected.kind === 'prism') {
      const p = state.levelData.prisms[state.selected.index];
      if (p) {
        const dx = x - stretchStartX;
        const dy = y - dragOffsetY;
        if ((p.segments || 1) > 1) {
          const rawSeg = Math.round(Math.abs(stretchStartW + dx) / PRISM_UNIT_W);
          p.segments = Math.max(1, Math.min(PRISM_MAX_SEGMENTS, rawSeg));
          p.w = p.segments * PRISM_UNIT_W;
        } else {
          p.w = Math.max(20, Math.min(200, Math.round(stretchStartW + dx)));
        }
        p.h = Math.max(6, Math.min(60, Math.round(stretchStartH + dy)));
        onUpdate();
      }
      return;
    }

    if (dragging && state.selected) {
      const sx = snap(x - dragOffsetX);
      const sy = snap(y - dragOffsetY);
      moveSelected(state.levelData, state.selected, sx, sy);
      onUpdate();
    }
  }

  function onMouseDown(e) {
    if (e.button === 2) {
      e.preventDefault();
      if (prismDragging) {
        prismDragging = false;
        state.prismDragActive = false;
        onUpdate();
        return;
      }
      const { x, y } = canvasCoords(e);
      const hit = hitTest(state.levelData, x, y);
      if (hit && hit.kind !== 'player') {
        pushSnapshot();
        deleteEntity(state.levelData, hit);
        if (state.selected && state.selected.kind === hit.kind && state.selected.index === hit.index) {
          state.selected = null;
        }
        onUpdate();
      }
      return;
    }

    if (e.button !== 0) return;
    const { x, y } = canvasCoords(e);
    const ld = state.levelData;

    if (state.tool === 'select') {
      const hit = hitTest(ld, x, y);
      if (hit) {
        state.selected = hit;
        pushSnapshot();

        // Shift+drag on prism = stretch
        if (e.shiftKey && hit.kind === 'prism') {
          stretching = true;
          const p = ld.prisms[hit.index];
          stretchStartX = x;
          stretchStartW = p.w || 40;
          stretchStartH = p.h || 12;
          dragOffsetY = y;
          onUpdate();
          return;
        }

        dragging = true;
        if (hit.kind === 'player') {
          const ps = ld.playerSpawn || { x: W / 2, y: H / 2 };
          dragOffsetX = x - ps.x; dragOffsetY = y - ps.y;
        } else if (hit.kind === 'portal') {
          const p = ld.portals[hit.index];
          if (hit.end === 'a') { dragOffsetX = x - p.ax; dragOffsetY = y - p.ay; }
          else { dragOffsetX = x - p.bx; dragOffsetY = y - p.by; }
        } else {
          const entity = getArray(ld, hit.kind)[hit.index];
          dragOffsetX = x - entity.x; dragOffsetY = y - entity.y;
        }
      } else {
        state.selected = null;
      }
      onUpdate();
      return;
    }

    if (state.tool === 'eraser') {
      const hit = hitTest(ld, x, y);
      if (hit && hit.kind !== 'player') {
        pushSnapshot();
        deleteEntity(ld, hit);
        onUpdate();
      }
      return;
    }

    // Placement tools
    const sx = snap(x);
    const sy = snap(y);
    pushSnapshot();

    if (state.tool === 'player') {
      if (!ld.playerSpawn) ld.playerSpawn = { x: W / 2, y: H / 2 };
      ld.playerSpawn.x = sx; ld.playerSpawn.y = sy;
    } else if (state.tool === 'enemy') {
      if (!ld.enemies) ld.enemies = [];
      ld.enemies.push({
        type: state.enemySubtype || 'basic', x: sx, y: sy,
        hp: state.enemySubtype === 'tank' ? 4 : (state.enemySubtype === 'healer' || state.enemySubtype === 'ghost') ? 2 : 1,
        canShoot: state.enemySubtype !== 'patrol' && state.enemySubtype !== 'healer',
      });
    } else if (state.tool === 'prism') {
      // Start drag-to-create (finalized on mouseup)
      prismDragging = true;
      state.prismDragActive = true;
      state.prismDragAnchorX = sx;
      state.prismDragAnchorY = sy;
      state.prismDragSegments = 1;
      onUpdate();
      return;
    } else if (state.tool === 'barrel') {
      if (!ld.barrels) ld.barrels = [];
      ld.barrels.push({ x: sx, y: sy });
    } else if (state.tool === 'portal') {
      if (state.portalPhase === 0) {
        state.tempPortalA = { x: sx, y: sy };
        state.portalPhase = 1;
        onUpdate();
        return;
      } else {
        if (!ld.portals) ld.portals = [];
        ld.portals.push({ ax: state.tempPortalA.x, ay: state.tempPortalA.y, bx: sx, by: sy });
        state.portalPhase = 0;
        state.tempPortalA = null;
      }
    } else if (state.tool === 'apple') {
      if (!ld.apples) ld.apples = [];
      ld.apples.push({ x: sx, y: sy });
    }
    onUpdate();
  }

  function onMouseUp(e) {
    if (e.button === 0) {
      if (prismDragging && state.tool === 'prism') {
        const ld = state.levelData;
        if (!ld.prisms) ld.prisms = [];
        pushSnapshot();
        const segments = state.prismDragSegments;
        const halfW = (segments * PRISM_UNIT_W) / 2;
        const dir = state.prismDragDir || 1;
        const pAngle = state.placementAngle || 0;
        ld.prisms.push({
          type: state.prismSubtype || 'static',
          x: state.prismDragAnchorX + Math.cos(pAngle) * dir * halfW,
          y: state.prismDragAnchorY + Math.sin(pAngle) * dir * halfW,
          angle: pAngle,
          splitCount: 2,
          segments,
          w: segments * PRISM_UNIT_W,
          h: 12,
          hp: state.prismSubtype === 'destructible' ? 3 : undefined,
        });
        prismDragging = false;
        state.prismDragActive = false;
        onUpdate();
      }
      dragging = false;
      stretching = false;
    }
  }

  function onContextMenu(e) { e.preventDefault(); }

  // Mouse wheel: rotate placement preview or selected entity
  function onWheel(e) {
    // Placement mode: adjust pre-placement angle (prism tool)
    if (state.tool === 'prism' && !state.selected) {
      e.preventDefault();
      const step = e.shiftKey ? (Math.PI / 36) : (Math.PI / 12); // 5° or 15°
      state.placementAngle = (state.placementAngle || 0) + (e.deltaY > 0 ? step : -step);
      onUpdate();
      return;
    }

    if (!state.selected) return;
    const sel = state.selected;
    const ld = state.levelData;

    // Rotate selected prisms
    if (sel.kind === 'prism') {
      e.preventDefault();
      const p = ld.prisms[sel.index];
      if (!p) return;
      pushSnapshot();
      const step = e.shiftKey ? (Math.PI / 36) : (Math.PI / 12); // 5° or 15°
      p.angle = (p.angle || 0) + (e.deltaY > 0 ? step : -step);
      onUpdate();
    }
  }

  // Keyboard shortcuts
  function onKeyDown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
    if (e.ctrlKey && e.code === 'KeyZ') { e.preventDefault(); undo(); onUpdate(); }
    else if (e.ctrlKey && e.code === 'KeyY') { e.preventDefault(); redo(); onUpdate(); }
    else if (e.code === 'Delete' || e.code === 'Backspace') {
      if (state.selected && state.selected.kind !== 'player') {
        pushSnapshot();
        deleteEntity(state.levelData, state.selected);
        state.selected = null;
        onUpdate();
      }
    }
  }

  editorCanvas.addEventListener('mousemove', onMouseMove);
  editorCanvas.addEventListener('mousedown', onMouseDown);
  editorCanvas.addEventListener('mouseup', onMouseUp);
  editorCanvas.addEventListener('contextmenu', onContextMenu);
  editorCanvas.addEventListener('wheel', onWheel, { passive: false });
  document.addEventListener('keydown', onKeyDown);

  return function cleanup() {
    editorCanvas.removeEventListener('mousemove', onMouseMove);
    editorCanvas.removeEventListener('mousedown', onMouseDown);
    editorCanvas.removeEventListener('mouseup', onMouseUp);
    editorCanvas.removeEventListener('contextmenu', onContextMenu);
    editorCanvas.removeEventListener('wheel', onWheel);
    document.removeEventListener('keydown', onKeyDown);
  };
}

function moveSelected(ld, sel, x, y) {
  if (sel.kind === 'player') {
    if (!ld.playerSpawn) ld.playerSpawn = { x: W / 2, y: H / 2 };
    ld.playerSpawn.x = x; ld.playerSpawn.y = y;
  } else if (sel.kind === 'portal') {
    const p = ld.portals[sel.index];
    if (sel.end === 'a') { p.ax = x; p.ay = y; } else { p.bx = x; p.by = y; }
  } else {
    const arr = getArray(ld, sel.kind);
    if (arr && arr[sel.index]) { arr[sel.index].x = x; arr[sel.index].y = y; }
  }
}

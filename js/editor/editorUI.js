/**
 * editorUI.js - Editor toolbar, property panel, and action button wiring
 */
import { W, H, PRISM_UNIT_W, PRISM_MAX_SEGMENTS } from '../core/constants.js';

/**
 * Wire up all editor UI controls.
 * Returns a cleanup function and an updateProperties function.
 */
export function initEditorUI(state, callbacks) {
  const {
    onToolChange, onNew, onSave, onLoad, onPlayTest,
    onCopyJSON, onPasteJSON, onUndo, onRedo, onBack,
  } = callbacks;

  // Tool buttons
  const toolBtns = document.querySelectorAll('#editorToolbar .editor-tool');
  function setActiveTool(tool) {
    toolBtns.forEach(b => b.classList.toggle('active', b.dataset.tool === tool));
    state.tool = tool;
    // Reset portal phase when switching away
    if (tool !== 'portal') { state.portalPhase = 0; state.tempPortalA = null; }
    updateSubtypePanel();
    onToolChange(tool);
  }
  toolBtns.forEach(btn => {
    btn.addEventListener('click', () => setActiveTool(btn.dataset.tool));
  });

  // Subtype panel
  const subtypePanel = document.getElementById('editorSubtypePanel');
  function updateSubtypePanel() {
    subtypePanel.innerHTML = '';
    if (state.tool === 'enemy') {
      const types = [
        { value: 'basic', label: '\u666E\u901A' },
        { value: 'patrol', label: '\u5DE1\u903B' },
        { value: 'tank', label: '\u5766\u514B' },
        { value: 'sniper', label: '\u72D9\u51FB' },
        { value: 'healer', label: '\u533B\u7597' },
        { value: 'ghost', label: '\u5E7D\u7075' },
      ];
      types.forEach(t => {
        const btn = document.createElement('button');
        btn.className = 'editor-subtype' + (state.enemySubtype === t.value ? ' active' : '');
        btn.textContent = t.label;
        btn.addEventListener('click', () => {
          state.enemySubtype = t.value;
          updateSubtypePanel();
        });
        subtypePanel.appendChild(btn);
      });
    } else if (state.tool === 'wall') {
      const types = [
        { value: 'reflect', label: '\u53CD\u5C04' },
        { value: 'solid', label: '\u5B9E\u4F53' },
      ];
      types.forEach(t => {
        const btn = document.createElement('button');
        btn.className = 'editor-subtype' + ((state.wallSubtype || 'reflect') === t.value ? ' active' : '');
        btn.textContent = t.label;
        btn.addEventListener('click', () => {
          state.wallSubtype = t.value;
          updateSubtypePanel();
        });
        subtypePanel.appendChild(btn);
      });
    } else if (state.tool === 'prism') {
      const types = [
        { value: 'static', label: '\u9759\u6B62' },
        { value: 'rotating', label: '\u65CB\u8F6C' },
        { value: 'moving', label: '\u79FB\u52A8' },
        { value: 'destructible', label: '\u53EF\u7834\u574F' },
      ];
      types.forEach(t => {
        const btn = document.createElement('button');
        btn.className = 'editor-subtype' + (state.prismSubtype === t.value ? ' active' : '');
        btn.textContent = t.label;
        btn.addEventListener('click', () => {
          state.prismSubtype = t.value;
          updateSubtypePanel();
        });
        subtypePanel.appendChild(btn);
      });
    }
  }

  // Level name & shots
  const nameInput = document.getElementById('editorLevelName');
  const shotsInput = document.getElementById('editorShots');
  const gridCheckbox = document.getElementById('editorGridSnap');

  nameInput.value = state.levelData.name || '\u81EA\u5B9A\u4E49\u5173\u5361';
  shotsInput.value = state.levelData.shots || 10;
  gridCheckbox.checked = state.gridSnap;

  nameInput.addEventListener('input', () => { state.levelData.name = nameInput.value; });
  shotsInput.addEventListener('change', () => {
    state.levelData.shots = Math.max(1, parseInt(shotsInput.value) || 10);
    shotsInput.value = state.levelData.shots;
  });
  gridCheckbox.addEventListener('change', () => { state.gridSnap = gridCheckbox.checked; });

  // Action buttons
  document.getElementById('editorNew').addEventListener('click', onNew);
  document.getElementById('editorSave').addEventListener('click', onSave);
  document.getElementById('editorLoad').addEventListener('click', onLoad);
  document.getElementById('editorPlayTest').addEventListener('click', onPlayTest);
  document.getElementById('editorCopyJSON').addEventListener('click', onCopyJSON);
  document.getElementById('editorPasteJSON').addEventListener('click', onPasteJSON);
  document.getElementById('editorUndo').addEventListener('click', onUndo);
  document.getElementById('editorRedo').addEventListener('click', onRedo);
  document.getElementById('editorBack').addEventListener('click', onBack);

  // Property panel update function
  function updateProperties() {
    const panel = document.getElementById('editorProperties');
    if (!state.selected) {
      panel.innerHTML = '<div class="editor-prop-hint">\u9009\u62E9\u5B9E\u4F53\u67E5\u770B\u5C5E\u6027</div>';
      return;
    }
    const sel = state.selected;
    const ld = state.levelData;
    let html = '';

    if (sel.kind === 'player') {
      const ps = ld.playerSpawn || { x: W / 2, y: H / 2 };
      html = `<div class="prop-row"><span>\u73A9\u5BB6\u751F\u6210\u70B9</span></div>
        <div class="prop-row"><label>X: <input type="number" class="prop-input" data-field="px" value="${Math.round(ps.x)}"></label>
        <label>Y: <input type="number" class="prop-input" data-field="py" value="${Math.round(ps.y)}"></label></div>`;
    } else if (sel.kind === 'enemy') {
      const e = ld.enemies[sel.index];
      if (!e) { panel.innerHTML = ''; return; }
      html = `<div class="prop-row"><span>\u654C\u4EBA [${e.type}]</span></div>
        <div class="prop-row">
          <label>HP: <select class="prop-input" data-field="hp">
            <option value="1" ${e.hp===1?'selected':''}>1</option>
            <option value="2" ${e.hp===2?'selected':''}>2</option>
            <option value="3" ${e.hp===3?'selected':''}>3</option>
            <option value="4" ${e.hp===4?'selected':''}>4</option>
          </select></label>
          <label>\u5C04\u51FB: <input type="checkbox" class="prop-input" data-field="canShoot" ${e.canShoot?'checked':''}></label>
        </div>
        <div class="prop-row">
          <label>\u7C7B\u578B: <select class="prop-input" data-field="type">
            <option value="basic" ${e.type==='basic'?'selected':''}>\u666E\u901A</option>
            <option value="patrol" ${e.type==='patrol'?'selected':''}>\u5DE1\u903B</option>
            <option value="tank" ${e.type==='tank'?'selected':''}>\u5766\u514B</option>
            <option value="sniper" ${e.type==='sniper'?'selected':''}>\u72D9\u51FB</option>
          </select></label>
        </div>`;
    } else if (sel.kind === 'prism') {
      const p = ld.prisms[sel.index];
      if (!p) { panel.innerHTML = ''; return; }
      const angleDeg = Math.round((p.angle || 0) * 180 / Math.PI);
      const seg = p.segments || 1;
      html = `<div class="prop-row"><span>\u68F1\u955C [${p.type}]</span></div>
        <div class="prop-row">
          <label>\u7C7B\u578B: <select class="prop-input" data-field="ptype">
            <option value="static" ${p.type==='static'?'selected':''}>\u9759\u6B62</option>
            <option value="rotating" ${p.type==='rotating'?'selected':''}>\u65CB\u8F6C</option>
            <option value="moving" ${p.type==='moving'?'selected':''}>\u79FB\u52A8</option>
            <option value="destructible" ${p.type==='destructible'?'selected':''}>\u53EF\u7834\u574F</option>
          </select></label>
        </div>
        <div class="prop-row">
          <label>\u89D2\u5EA6: <input type="number" class="prop-input" data-field="angle" value="${angleDeg}" min="0" max="360" step="5"></label>
          <label>\u5206\u88C2: <select class="prop-input" data-field="splitCount">
            <option value="2" ${p.splitCount===2?'selected':''}>2</option>
            <option value="3" ${p.splitCount===3?'selected':''}>3</option>
          </select></label>
        </div>
        <div class="prop-row">
          <label>\u6BB5\u6570: <input type="number" class="prop-input" data-field="segments" value="${seg}" min="1" max="${PRISM_MAX_SEGMENTS}" step="1"></label>
          <label>\u603B\u5BBD: <span style="color:#66ddaa">${p.w||40}px</span></label>
        </div>
        <div class="prop-row">
          ${seg > 1 ? `<label>\u5BBD: <span style="color:#66ddaa">${p.w||40}</span></label>` : `<label>\u5BBD: <input type="number" class="prop-input" data-field="pw" value="${p.w||40}" min="20" max="200" step="2"></label>`}
          <label>\u9AD8: <input type="number" class="prop-input" data-field="ph" value="${p.h||12}" min="6" max="60" step="2"></label>
        </div>
        ${p.type==='destructible'?`<div class="prop-row"><label>HP: <input type="number" class="prop-input" data-field="php" value="${p.hp||3}" min="1" max="10"></label></div>`:''}`;
    } else if (sel.kind === 'barrel') {
      html = `<div class="prop-row"><span>\u7206\u70B8\u6876</span></div>`;
    } else if (sel.kind === 'apple') {
      html = `<div class="prop-row"><span>\u82F9\u679C</span></div>`;
    } else if (sel.kind === 'wall') {
      const w = ld.walls[sel.index];
      if (!w) { panel.innerHTML = ''; return; }
      const wtype = w.type || 'reflect';
      const angleDeg = Math.round((w.angle || 0) * 180 / Math.PI);
      const typeLabel = wtype === 'solid' ? '\u5B9E\u4F53\u5899' : '\u53CD\u5C04\u5899';
      html = `<div class="prop-row"><span>${typeLabel}</span></div>
        <div class="prop-row">
          <label>\u7C7B\u578B: <select class="prop-input" data-field="wtype">
            <option value="reflect" ${wtype==='reflect'?'selected':''}>\u53CD\u5C04</option>
            <option value="solid" ${wtype==='solid'?'selected':''}>\u5B9E\u4F53</option>
          </select></label>
          <label>\u89D2\u5EA6: <input type="number" class="prop-input" data-field="wangle" value="${angleDeg}" min="0" max="360" step="5"></label>
        </div>
        <div class="prop-row">
          <label>\u5BBD: <input type="number" class="prop-input" data-field="ww" value="${w.w||40}" min="20" max="200" step="2"></label>
          <label>\u9AD8: <input type="number" class="prop-input" data-field="wh" value="${w.h||10}" min="6" max="60" step="2"></label>
        </div>`;
    } else if (sel.kind === 'portal') {
      const p = ld.portals[sel.index];
      if (!p) { panel.innerHTML = ''; return; }
      html = `<div class="prop-row"><span>\u4F20\u9001\u95E8\u5BF9</span></div>
        <div class="prop-row"><label>\u84DD: (${Math.round(p.ax)}, ${Math.round(p.ay)})</label>
        <label>\u6A59: (${Math.round(p.bx)}, ${Math.round(p.by)})</label></div>`;
    }

    panel.innerHTML = html;

    // Wire up property inputs
    panel.querySelectorAll('.prop-input').forEach(input => {
      const handler = () => {
        if (!state.selected) return;
        const field = input.dataset.field;
        applyPropertyChange(ld, state.selected, field, input);
      };
      input.addEventListener('change', handler);
      input.addEventListener('input', handler);
    });
  }

  function applyPropertyChange(ld, sel, field, input) {
    if (sel.kind === 'player') {
      if (!ld.playerSpawn) ld.playerSpawn = { x: W / 2, y: H / 2 };
      if (field === 'px') ld.playerSpawn.x = parseInt(input.value) || W / 2;
      if (field === 'py') ld.playerSpawn.y = parseInt(input.value) || H / 2;
    } else if (sel.kind === 'enemy') {
      const e = ld.enemies[sel.index];
      if (!e) return;
      if (field === 'hp') e.hp = parseInt(input.value) || 1;
      if (field === 'canShoot') e.canShoot = input.checked;
      if (field === 'type') e.type = input.value;
    } else if (sel.kind === 'prism') {
      const p = ld.prisms[sel.index];
      if (!p) return;
      if (field === 'ptype') p.type = input.value;
      if (field === 'angle') p.angle = (parseInt(input.value) || 0) * Math.PI / 180;
      if (field === 'splitCount') p.splitCount = parseInt(input.value) || 2;
      if (field === 'segments') {
        const s = Math.max(1, Math.min(PRISM_MAX_SEGMENTS, parseInt(input.value) || 1));
        p.segments = s;
        p.w = s * PRISM_UNIT_W;
        updateProperties(); // refresh to toggle width read-only
      }
      if (field === 'pw') p.w = Math.max(20, Math.min(200, parseInt(input.value) || 40));
      if (field === 'ph') p.h = Math.max(6, Math.min(60, parseInt(input.value) || 12));
      if (field === 'php') p.hp = parseInt(input.value) || 3;
    } else if (sel.kind === 'wall') {
      const w = ld.walls[sel.index];
      if (!w) return;
      if (field === 'wtype') { w.type = input.value; updateProperties(); }
      if (field === 'wangle') w.angle = (parseInt(input.value) || 0) * Math.PI / 180;
      if (field === 'ww') w.w = Math.max(20, Math.min(200, parseInt(input.value) || 40));
      if (field === 'wh') w.h = Math.max(6, Math.min(60, parseInt(input.value) || 10));
    }
  }

  // Sync UI when level data changes externally
  function syncUI() {
    nameInput.value = state.levelData.name || '\u81EA\u5B9A\u4E49\u5173\u5361';
    shotsInput.value = state.levelData.shots || 10;
    updateProperties();
  }

  return { updateProperties, syncUI, setActiveTool };
}

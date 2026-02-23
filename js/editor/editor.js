/**
 * editor.js - Main editor controller: state, init, teardown, render loop
 */
import { W, H } from '../core/constants.js';
import { game } from '../core/state.js';
import { initStartDemo } from '../ui/startDemo.js';
import { startCustomLevel } from '../ui/screens.js';
import { BUILTIN_LEVELS } from '../levels.js';
import { materializeLevel } from '../levelLoader.js';
import { renderEditor } from './editorRender.js';
import { initEditorInput } from './editorInput.js';
import { initEditorUI } from './editorUI.js';
import { initHistory, pushSnapshot, undo, redo } from './editorHistory.js';
import { saveCustomLevel, getCustomLevels, deleteCustomLevel, exportLevelJSON, importLevelJSON } from './editorStorage.js';

// ---- Editor state ----

const state = {
  tool: 'select',
  enemySubtype: 'basic',
  prismSubtype: 'static',
  selected: null,
  gridSnap: true,
  gridSize: 32,
  cursorX: -1,
  cursorY: -1,
  snapX: 0,
  snapY: 0,
  portalPhase: 0,
  tempPortalA: null,
  levelData: null,
};

let editorCanvas = null;
let editorCtx = null;
let cleanupInput = null;
let uiApi = null;
let animFrameId = null;
let active = false;

// ---- Level data helpers ----

function createEmptyLevel() {
  return {
    id: null,
    name: '\u81EA\u5B9A\u4E49\u5173\u5361',
    shots: 10,
    playerSpawn: { x: W / 2, y: H / 2 },
    enemies: [],
    prisms: [],
    barrels: [],
    portals: [],
    apples: [],
  };
}

function cloneLevel(ld) {
  return JSON.parse(JSON.stringify(ld));
}

// ---- Level Picker (shown when clicking "关卡编辑") ----

export function showEditorLevelSelect() {
  // Hide other screens
  document.getElementById('startScreen').classList.add('hidden');
  document.getElementById('gameContainer').classList.add('hidden');
  document.getElementById('levelSelectScreen').classList.add('hidden');

  // Build or show the editor select screen
  let screen = document.getElementById('editorSelectScreen');
  if (!screen) {
    screen = document.createElement('div');
    screen.id = 'editorSelectScreen';
    screen.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;background:#0a0a12;z-index:100;color:#00ff88;text-align:center;gap:14px;';
    document.body.appendChild(screen);
  }
  screen.classList.remove('hidden');

  let html = '<div class="screen-title" style="font-size:20px;">\u5173\u5361\u7F16\u8F91</div>';
  html += '<div class="screen-subtitle">LEVEL EDITOR</div>';
  html += '<div style="font-size:8px;color:#557755;margin-bottom:4px;">\u9009\u62E9\u8981\u7F16\u8F91\u7684\u5173\u5361</div>';

  // Builtin levels grid
  html += '<div class="level-grid" style="max-width:400px;">';
  for (let i = 0; i < BUILTIN_LEVELS.length; i++) {
    const lvl = BUILTIN_LEVELS[i];
    html += `<button class="level-btn editor-lvl-btn" data-builtin="${i}" style="font-size:8px;">${lvl.name || (i + 1)}</button>`;
  }
  html += '</div>';

  // Custom levels section
  const customs = getCustomLevels();
  if (customs.length > 0) {
    html += '<div style="width:240px;height:2px;background:linear-gradient(90deg,transparent,#aa44ff,transparent);margin:4px 0;"></div>';
    html += '<div style="font-size:8px;color:#aa44ff;">\u81EA\u5B9A\u4E49\u5173\u5361</div>';
    html += '<div class="level-grid" style="max-width:400px;">';
    customs.forEach((cl, i) => {
      html += `<button class="level-btn editor-custom-btn" data-custom="${i}" style="border-color:#aa44ff;color:#aa44ff;font-size:7px;">${cl.name || '\u81EA\u5B9A\u4E49'}</button>`;
    });
    html += '</div>';
  }

  // New blank + back buttons
  html += '<div style="display:flex;gap:12px;margin-top:8px;">';
  html += '<button class="start-btn" id="editorNewBlankBtn" style="font-size:10px;border-color:#aa44ff;color:#aa44ff;">\u65B0\u5EFA\u7A7A\u767D</button>';
  html += '<button class="start-btn" id="editorSelectBackBtn" style="font-size:10px;">\u8FD4\u56DE</button>';
  html += '</div>';

  screen.innerHTML = html;

  // Wire builtin level buttons
  screen.querySelectorAll('.editor-lvl-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.builtin);
      const concrete = materializeLevel(BUILTIN_LEVELS[idx]);
      concrete.id = null; // Don't overwrite builtin
      screen.classList.add('hidden');
      openEditor(concrete);
    });
  });

  // Wire custom level buttons
  screen.querySelectorAll('.editor-custom-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.custom);
      screen.classList.add('hidden');
      openEditor(customs[idx]);
    });
  });

  // New blank
  document.getElementById('editorNewBlankBtn').addEventListener('click', () => {
    screen.classList.add('hidden');
    openEditor(null);
  });

  // Back
  document.getElementById('editorSelectBackBtn').addEventListener('click', () => {
    screen.classList.add('hidden');
    document.getElementById('startScreen').classList.remove('hidden');
    initStartDemo();
  });
}

// ---- Init / Teardown ----

export function openEditor(levelDataToEdit) {
  // Set level data
  if (levelDataToEdit) {
    state.levelData = cloneLevel(levelDataToEdit);
  } else {
    state.levelData = createEmptyLevel();
  }
  state.selected = null;
  state.tool = 'select';
  state.portalPhase = 0;
  state.tempPortalA = null;

  // Canvas
  editorCanvas = document.getElementById('editorCanvas');
  editorCanvas.width = W;
  editorCanvas.height = H;
  editorCtx = editorCanvas.getContext('2d');

  // Show editor screen, hide others
  document.getElementById('startScreen').classList.add('hidden');
  document.getElementById('gameContainer').classList.add('hidden');
  document.getElementById('levelSelectScreen').classList.add('hidden');
  const selScreen = document.getElementById('editorSelectScreen');
  if (selScreen) selScreen.classList.add('hidden');
  document.getElementById('editorScreen').classList.remove('hidden');

  // Stop game loop
  game.running = false;
  game.editorActive = true;

  // History
  initHistory(
    () => cloneLevel(state.levelData),
    (snap) => {
      state.levelData = snap;
      state.selected = null;
      if (uiApi) uiApi.syncUI();
    }
  );
  pushSnapshot();

  // Input
  if (cleanupInput) cleanupInput();
  cleanupInput = initEditorInput(editorCanvas, state, onUpdate);

  // UI
  uiApi = initEditorUI(state, {
    onToolChange: () => {},
    onNew: handleNew,
    onSave: handleSave,
    onLoad: handleLoad,
    onPlayTest: handlePlayTest,
    onCopyJSON: handleCopyJSON,
    onPasteJSON: handlePasteJSON,
    onUndo: handleUndo,
    onRedo: handleRedo,
    onBack: handleBack,
  });

  // Start render loop
  active = true;
  editorLoop();
}

export function closeEditor() {
  active = false;
  game.editorActive = false;
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
  if (cleanupInput) {
    cleanupInput();
    cleanupInput = null;
  }
  document.getElementById('editorScreen').classList.add('hidden');
}

// ---- Render loop ----

function editorLoop() {
  if (!active) return;
  renderEditor(editorCtx, state);
  animFrameId = requestAnimationFrame(editorLoop);
}

function onUpdate() {
  if (uiApi) uiApi.updateProperties();
}

// ---- Action handlers ----

function handleNew() {
  if (!confirm('\u65B0\u5EFA\u5173\u5361\uFF1F\u672A\u4FDD\u5B58\u7684\u66F4\u6539\u5C06\u4E22\u5931\u3002')) return;
  state.levelData = createEmptyLevel();
  state.selected = null;
  initHistory(
    () => cloneLevel(state.levelData),
    (snap) => { state.levelData = snap; state.selected = null; if (uiApi) uiApi.syncUI(); }
  );
  pushSnapshot();
  if (uiApi) uiApi.syncUI();
}

function handleSave() {
  const id = saveCustomLevel(cloneLevel(state.levelData));
  state.levelData.id = id;
  alert('\u5173\u5361\u5DF2\u4FDD\u5B58\uFF01');
}

function handleLoad() {
  const levels = getCustomLevels();
  if (levels.length === 0) {
    alert('\u6CA1\u6709\u4FDD\u5B58\u7684\u81EA\u5B9A\u4E49\u5173\u5361\u3002');
    return;
  }
  showLoadDialog(levels);
}

function showLoadDialog(levels) {
  let modal = document.getElementById('editorLoadModal');
  if (modal) modal.remove();
  modal = document.createElement('div');
  modal.id = 'editorLoadModal';
  modal.className = 'editor-modal';
  let html = '<div class="editor-modal-content">';
  html += '<div class="editor-modal-title">\u52A0\u8F7D\u81EA\u5B9A\u4E49\u5173\u5361</div>';
  html += '<div class="editor-load-list">';
  levels.forEach((l, i) => {
    const name = l.name || ('\u5173\u5361 ' + (i + 1));
    const enemies = (l.enemies || []).length;
    html += `<div class="editor-load-item">
      <span class="load-item-name">${name}</span>
      <span class="load-item-info">\u654C\u4EBA:${enemies} \u5F39\u836F:${l.shots||10}</span>
      <button class="load-item-btn load-btn-edit" data-idx="${i}">\u7F16\u8F91</button>
      <button class="load-item-btn load-btn-del" data-idx="${i}">\u5220\u9664</button>
    </div>`;
  });
  html += '</div>';
  html += '<button class="editor-modal-close">\u5173\u95ED</button>';
  html += '</div>';
  modal.innerHTML = html;
  document.getElementById('editorScreen').appendChild(modal);

  modal.querySelector('.editor-modal-close').addEventListener('click', () => modal.remove());
  modal.querySelectorAll('.load-btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      state.levelData = cloneLevel(levels[idx]);
      state.selected = null;
      initHistory(
        () => cloneLevel(state.levelData),
        (snap) => { state.levelData = snap; state.selected = null; if (uiApi) uiApi.syncUI(); }
      );
      pushSnapshot();
      if (uiApi) uiApi.syncUI();
      modal.remove();
    });
  });
  modal.querySelectorAll('.load-btn-del').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      if (!confirm('\u786E\u5B9A\u5220\u9664 "' + (levels[idx].name || '\u5173\u5361') + '"\uFF1F')) return;
      deleteCustomLevel(levels[idx].id);
      modal.remove();
      handleLoad();
    });
  });
}

function handlePlayTest() {
  const testData = cloneLevel(state.levelData);
  game.editorReturnData = cloneLevel(state.levelData);
  closeEditor();
  startCustomLevel(testData);
}

function handleCopyJSON() {
  const json = exportLevelJSON(state.levelData);
  navigator.clipboard.writeText(json).then(() => {
    alert('JSON\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F\uFF01');
  }).catch(() => {
    prompt('\u590D\u5236\u4EE5\u4E0B JSON:', json);
  });
}

async function handlePasteJSON() {
  let text = '';
  try {
    text = await navigator.clipboard.readText();
  } catch (e) {
    text = prompt('\u7C98\u8D34 JSON \u5173\u5361\u6570\u636E:') || '';
  }
  if (!text) return;
  const data = importLevelJSON(text);
  if (data) {
    state.levelData = data;
    state.selected = null;
    initHistory(
      () => cloneLevel(state.levelData),
      (snap) => { state.levelData = snap; state.selected = null; if (uiApi) uiApi.syncUI(); }
    );
    pushSnapshot();
    if (uiApi) uiApi.syncUI();
  }
}

function handleUndo() {
  undo();
  onUpdate();
}

function handleRedo() {
  redo();
  onUpdate();
}

function handleBack() {
  closeEditor();
  document.getElementById('startScreen').classList.remove('hidden');
  initStartDemo();
}

/** Called when returning from play-test */
export function returnToEditor() {
  if (game.editorReturnData) {
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('levelClearScreen').classList.add('hidden');
    document.getElementById('gameContainer').classList.add('hidden');
    openEditor(game.editorReturnData);
    game.editorReturnData = null;
    game.isPlayTest = false;
  }
}

// Register bridge for play-test return from dynamically-created buttons
window.__editorBridge = { returnToEditor };

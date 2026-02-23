/**
 * introScreen.js - Shows introduction cards for new game elements
 * when the player encounters them for the first time in a level.
 */
import { ctx, setCtx, drawPixelRect, drawPixelCircle } from '../core/render.js';
import { COLORS, ENEMY_COLORS, BARREL_COLORS, PRISM_COLORS, PORTAL_COLORS } from '../core/constants.js';
import { drawEnemy } from '../entities/enemies.js';
import { drawBarrel } from '../objects/barrels.js';
import { drawPrism } from '../objects/prism.js';
import { drawPortal } from '../objects/portals.js';
import { drawApple } from '../objects/apples.js';

const STORAGE_KEY = 'bounceLaser_seenIntros';

// ---- Introduction definitions ----

const INTRO_DEFS = {
  enemy_patrol: {
    name: '巡逻兵', nameEn: 'PATROL',
    color: ENEMY_COLORS.patrol.body,
    desc: '蓝色敌人，不会射击但会四处巡逻移动',
  },

  enemy_shooting: {
    name: '敌人射击', nameEn: 'FIRE',
    color: '#ff4466',
    desc: '敌人会向你射击！用右键护盾抵挡',
  },

  barrel: {
    name: '爆炸桶', nameEn: 'BARREL',
    color: BARREL_COLORS.body,
    desc: '击中后爆炸，造成范围伤害并可连锁引爆',
  },

  prism: {
    name: '棱镜', nameEn: 'PRISM',
    color: PRISM_COLORS.body,
    desc: '激光击中后会分裂成多束反射光',
  },

  enemy_tank: {
    name: '重型敌人', nameEn: 'TANK',
    color: ENEMY_COLORS.tank.body,
    desc: '紫色大型敌人，4点HP，防御力强',
  },

  enemy_sniper: {
    name: '狙击手', nameEn: 'SNIPER',
    color: ENEMY_COLORS.sniper.body,
    desc: '蓄力后发射高速子弹，注意红色瞄准线',
  },

  apple: {
    name: '苹果', nameEn: 'APPLE',
    color: '#ff3333',
    desc: '用激光射击拾取，恢复1点生命值',
  },

  portal: {
    name: '传送门', nameEn: 'PORTAL',
    color: PORTAL_COLORS.blue,
    desc: '子弹从一端进入，另一端飞出',
  },

  enemy_healer: {
    name: '医疗兵', nameEn: 'HEALER',
    color: '#44cc88',
    desc: '定期治愈附近敌人，优先击杀！',
  },

  enemy_ghost: {
    name: '幽灵', nameEn: 'GHOST',
    color: '#44ddcc',
    desc: '会隐形！只有显形时才能被击中',
  },
};

// ---- Draw preview using actual game draw functions ----

function drawGamePreview(previewCtx, id) {
  const prevCtx = ctx;
  setCtx(previewCtx);
  const cx = 40, cy = 40;

  const enemyBase = { flashTimer: 0, bobPhase: 0, moveVx: 1, moveVy: 0, charging: false, chargeTimer: 0, shootTimer: 999 };

  switch (id) {
    case 'enemy_patrol':
      drawEnemy({ ...enemyBase, type: 'patrol', x: cx, y: cy, size: 12, hp: 1, maxHp: 1, canShoot: false });
      break;
    case 'enemy_shooting':
      drawEnemy({ ...enemyBase, type: 'basic', x: cx - 8, y: cy, size: 12, hp: 1, maxHp: 1, canShoot: false });
      drawPixelRect(cx + 6, cy - 1, 6, 2, COLORS.enemyBullet);
      drawPixelRect(cx + 12, cy - 1, 4, 2, '#ff884488');
      drawPixelRect(cx + 2, cy - 2, 4, 4, '#ffcc44');
      break;
    case 'barrel':
      drawBarrel({ x: cx, y: cy, size: 10, glowPhase: 0, exploded: false });
      break;
    case 'prism':
      drawPrism({ x: cx, y: cy, w: 40, h: 12, angle: Math.PI / 6, type: 'static', hp: 3, maxHp: 3, flashTimer: 0, glowPhase: 0, rotSpeed: 0, splitCount: 2 });
      break;
    case 'enemy_tank':
      drawEnemy({ ...enemyBase, type: 'tank', x: cx, y: cy, size: 16, hp: 4, maxHp: 4, canShoot: true });
      break;
    case 'enemy_sniper':
      drawEnemy({ ...enemyBase, type: 'sniper', x: cx, y: cy, size: 10, hp: 1, maxHp: 1, canShoot: true });
      break;
    case 'apple':
      drawApple({ x: cx, y: cy, size: 8, bobPhase: 0 });
      break;
    case 'portal':
      drawPortal({ ax: cx - 16, ay: cy, bx: cx + 16, by: cy, radius: 14, spinPhase: 0 });
      break;
    case 'enemy_healer':
      drawEnemy({ ...enemyBase, type: 'healer', x: cx, y: cy, size: 11, hp: 2, maxHp: 2, canShoot: false, healTimer: 5, healRange: 120, healPulseTimer: 0 });
      break;
    case 'enemy_ghost':
      drawEnemy({ ...enemyBase, type: 'ghost', x: cx, y: cy, size: 11, hp: 2, maxHp: 2, canShoot: false, fadeAlpha: 0.7, visible: true, phaseTimer: 3 });
      break;
  }

  setCtx(prevCtx);
}

// ---- Level detection ----

function detectThingsInLevel(levelData) {
  const found = new Set();
  for (const e of (levelData.enemies || [])) {
    if (e.type === 'patrol') found.add('enemy_patrol');
    if (e.type === 'tank') found.add('enemy_tank');
    if (e.type === 'sniper') found.add('enemy_sniper');
    if (e.type === 'healer') found.add('enemy_healer');
    if (e.type === 'ghost') found.add('enemy_ghost');
    if (e.canShoot) found.add('enemy_shooting');
  }
  if ((levelData.barrels || []).length > 0) found.add('barrel');
  if ((levelData.prisms || []).length > 0) found.add('prism');
  if ((levelData.portals || []).length > 0) found.add('portal');
  if ((levelData.apples || []).length > 0) found.add('apple');
  return found;
}

// ---- localStorage persistence ----

function getSeenIntros() {
  try {
    const d = localStorage.getItem(STORAGE_KEY);
    return d ? new Set(JSON.parse(d)) : new Set();
  } catch (e) {
    return new Set();
  }
}

function markIntrosSeen(ids) {
  try {
    const seen = getSeenIntros();
    for (const id of ids) seen.add(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]));
  } catch (e) {}
}

// ---- Overlay rendering ----

function showIntroOverlay(newIds, onDone) {
  const screen = document.getElementById('introScreen');
  screen.innerHTML = '';
  screen.classList.remove('hidden');

  // Title
  const title = document.createElement('div');
  title.className = 'intro-title';
  title.textContent = '新要素';
  screen.appendChild(title);

  const subtitle = document.createElement('div');
  subtitle.className = 'intro-subtitle';
  subtitle.textContent = 'NEW ELEMENTS';
  screen.appendChild(subtitle);

  // Cards container
  const cardsDiv = document.createElement('div');
  cardsDiv.className = 'intro-cards';
  screen.appendChild(cardsDiv);

  const idArr = [...newIds];
  idArr.forEach((id, i) => {
    const def = INTRO_DEFS[id];
    if (!def) return;

    const card = document.createElement('div');
    card.className = 'intro-card';
    card.style.animationDelay = `${0.3 + i * 0.15}s`;

    // Preview canvas — use actual game draw functions
    const cvs = document.createElement('canvas');
    cvs.width = 80;
    cvs.height = 80;
    cvs.className = 'intro-preview';
    const c = cvs.getContext('2d');
    c.fillStyle = '#0a0a12';
    c.fillRect(0, 0, 80, 80);
    drawGamePreview(c, id);
    card.appendChild(cvs);

    // Name
    const nameEl = document.createElement('div');
    nameEl.className = 'intro-card-name';
    nameEl.style.color = def.color;
    nameEl.textContent = def.name;
    card.appendChild(nameEl);

    // English name
    const nameEn = document.createElement('div');
    nameEn.className = 'intro-card-name-en';
    nameEn.textContent = def.nameEn;
    card.appendChild(nameEn);

    // Description
    const descEl = document.createElement('div');
    descEl.className = 'intro-card-desc';
    descEl.textContent = def.desc;
    card.appendChild(descEl);

    cardsDiv.appendChild(card);
  });

  // Hint
  const hint = document.createElement('div');
  hint.className = 'intro-hint';
  hint.textContent = '点击或按任意键继续';
  screen.appendChild(hint);

  // Close handler with 300ms delay to prevent accidental dismiss
  let ready = false;
  setTimeout(() => { ready = true; }, 300);

  function close() {
    if (!ready) return;
    screen.classList.add('hidden');
    screen.innerHTML = '';
    document.removeEventListener('keydown', onKey);
    screen.removeEventListener('click', onClick);
    markIntrosSeen(idArr);
    onDone();
  }

  function onKey() { close(); }
  function onClick() { close(); }

  document.addEventListener('keydown', onKey, { once: false });
  screen.addEventListener('click', onClick, { once: false });
}

// ---- Main export ----

export function showIntroIfNeeded(levelData, onDone) {
  const found = detectThingsInLevel(levelData);
  const seen = getSeenIntros();
  const newThings = new Set();
  for (const id of found) {
    if (!seen.has(id)) newThings.add(id);
  }
  if (newThings.size === 0) {
    onDone();
    return;
  }
  showIntroOverlay(newThings, onDone);
}

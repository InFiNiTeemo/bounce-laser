/**
 * introScreen.js - Shows introduction cards for new game elements
 * when the player encounters them for the first time in a level.
 */
import { COLORS, ENEMY_COLORS, BARREL_COLORS, PRISM_COLORS, PORTAL_COLORS } from '../core/constants.js';

const PX = 2;
const STORAGE_KEY = 'bounceLaser_seenIntros';

// ---- Local pixel drawing helpers (accept ctx param) ----

function pxRect(c, x, y, w, h, color) {
  c.fillStyle = color;
  for (let i = 0; i < w; i += PX) {
    for (let j = 0; j < h; j += PX) {
      c.fillRect(Math.floor(x + i), Math.floor(y + j), PX, PX);
    }
  }
}

function pxCircle(c, cx, cy, r, color) {
  c.fillStyle = color;
  for (let x = -r; x <= r; x += PX) {
    for (let y = -r; y <= r; y += PX) {
      if (x * x + y * y <= r * r) {
        c.fillRect(Math.floor(cx + x), Math.floor(cy + y), PX, PX);
      }
    }
  }
}

// ---- Introduction definitions ----

const INTRO_DEFS = {
  enemy_patrol: {
    name: '巡逻兵', nameEn: 'PATROL',
    color: ENEMY_COLORS.patrol.body,
    desc: '蓝色敌人，不会射击但会四处巡逻移动',
    draw(c, cx, cy) {
      // Body
      pxCircle(c, cx, cy, 10, ENEMY_COLORS.patrol.dark);
      pxCircle(c, cx, cy, 8, ENEMY_COLORS.patrol.body);
      // Eye
      pxRect(c, cx - 2, cy - 2, 4, 4, '#ffffff');
      pxRect(c, cx, cy - 2, 2, 4, ENEMY_COLORS.patrol.eye);
      // Direction triangle
      c.fillStyle = ENEMY_COLORS.patrol.body;
      c.beginPath();
      c.moveTo(cx + 14, cy);
      c.lineTo(cx + 10, cy - 4);
      c.lineTo(cx + 10, cy + 4);
      c.closePath();
      c.fill();
    },
  },

  enemy_shooting: {
    name: '敌人射击', nameEn: 'FIRE',
    color: '#ff4466',
    desc: '敌人会向你射击！用右键护盾抵挡',
    draw(c, cx, cy) {
      // Enemy body
      pxCircle(c, cx - 6, cy, 8, COLORS.enemyDark);
      pxCircle(c, cx - 6, cy, 6, COLORS.enemy);
      // Eye
      pxRect(c, cx - 8, cy - 2, 4, 4, '#ffffff');
      pxRect(c, cx - 6, cy - 2, 2, 4, '#440000');
      // Bullet
      pxRect(c, cx + 6, cy - 1, 6, 2, COLORS.enemyBullet);
      pxRect(c, cx + 12, cy - 1, 4, 2, '#ff884488');
      // Muzzle flash
      pxRect(c, cx + 2, cy - 2, 4, 4, '#ffcc44');
    },
  },

  barrel: {
    name: '爆炸桶', nameEn: 'BARREL',
    color: BARREL_COLORS.body,
    desc: '击中后爆炸，造成范围伤害并可连锁引爆',
    draw(c, cx, cy) {
      // Barrel body
      pxCircle(c, cx, cy, 10, BARREL_COLORS.bodyDark);
      pxCircle(c, cx, cy, 8, BARREL_COLORS.body);
      // Band
      pxRect(c, cx - 8, cy - 2, 16, 4, BARREL_COLORS.band);
      // Danger symbol
      pxRect(c, cx - 2, cy - 2, 4, 4, BARREL_COLORS.danger);
      // Glow
      pxCircle(c, cx, cy - 14, 3, '#ff884466');
    },
  },

  prism: {
    name: '棱镜', nameEn: 'PRISM',
    color: PRISM_COLORS.body,
    desc: '激光击中后会分裂成多束反射光',
    draw(c, cx, cy) {
      // Prism body (rotated rectangle)
      c.save();
      c.translate(cx, cy);
      c.rotate(Math.PI / 6);
      pxRect(c, -18, -5, 36, 10, PRISM_COLORS.bodyDark);
      pxRect(c, -16, -3, 32, 6, PRISM_COLORS.body);
      // Glow line
      pxRect(c, -14, -1, 28, 2, PRISM_COLORS.glow);
      c.restore();
      // Split beams hint
      c.strokeStyle = '#00ffcc44';
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(cx + 8, cy - 2); c.lineTo(cx + 22, cy - 10); c.stroke();
      c.beginPath(); c.moveTo(cx + 8, cy + 2); c.lineTo(cx + 22, cy + 10); c.stroke();
    },
  },

  enemy_tank: {
    name: '重型敌人', nameEn: 'TANK',
    color: ENEMY_COLORS.tank.body,
    desc: '紫色大型敌人，4点HP，防御力强',
    draw(c, cx, cy) {
      // Body
      pxCircle(c, cx, cy, 14, ENEMY_COLORS.tank.dark);
      pxCircle(c, cx, cy, 12, ENEMY_COLORS.tank.body);
      // Armor bands
      pxRect(c, cx - 12, cy - 4, 24, 2, ENEMY_COLORS.tank.dark);
      pxRect(c, cx - 12, cy + 2, 24, 2, ENEMY_COLORS.tank.dark);
      // Eye
      pxRect(c, cx - 3, cy - 3, 6, 6, '#ffffff');
      pxRect(c, cx - 1, cy - 3, 4, 6, ENEMY_COLORS.tank.eye);
      // Gun barrel
      pxRect(c, cx + 12, cy - 3, 10, 6, ENEMY_COLORS.tank.dark);
    },
  },

  enemy_sniper: {
    name: '狙击手', nameEn: 'SNIPER',
    color: ENEMY_COLORS.sniper.body,
    desc: '蓄力后发射高速子弹，注意红色瞄准线',
    draw(c, cx, cy) {
      // Body
      pxCircle(c, cx, cy, 8, ENEMY_COLORS.sniper.dark);
      pxCircle(c, cx, cy, 6, ENEMY_COLORS.sniper.body);
      // Eye
      pxRect(c, cx - 2, cy - 2, 4, 4, '#ffffff');
      pxRect(c, cx, cy - 2, 2, 4, ENEMY_COLORS.sniper.eye);
      // Aim line
      c.strokeStyle = '#ff000088';
      c.lineWidth = 1;
      c.setLineDash([4, 3]);
      c.beginPath();
      c.moveTo(cx + 8, cy);
      c.lineTo(cx + 28, cy);
      c.stroke();
      c.setLineDash([]);
      // Charge glow
      pxCircle(c, cx, cy, 10, '#ffcc0022');
    },
  },

  apple: {
    name: '苹果', nameEn: 'APPLE',
    color: '#ff3333',
    desc: '用激光射击拾取，恢复1点生命值',
    draw(c, cx, cy) {
      // Apple body
      pxCircle(c, cx, cy + 2, 8, '#cc0000');
      pxCircle(c, cx, cy + 2, 6, '#ff3333');
      // Highlight
      pxRect(c, cx - 4, cy - 2, 2, 2, '#ff8888');
      // Stem
      pxRect(c, cx - 1, cy - 8, 2, 6, '#885522');
      // Leaf
      pxRect(c, cx + 1, cy - 8, 4, 2, '#44cc44');
      pxRect(c, cx + 3, cy - 10, 2, 2, '#44cc44');
    },
  },

  portal: {
    name: '传送门', nameEn: 'PORTAL',
    color: PORTAL_COLORS.blue,
    desc: '子弹从一端进入，另一端飞出',
    draw(c, cx, cy) {
      // Blue portal
      pxCircle(c, cx - 12, cy, 10, PORTAL_COLORS.blueGlow);
      pxCircle(c, cx - 12, cy, 8, PORTAL_COLORS.blue);
      pxCircle(c, cx - 12, cy, 4, PORTAL_COLORS.blueBright);
      // Orange portal
      pxCircle(c, cx + 12, cy, 10, PORTAL_COLORS.orangeGlow);
      pxCircle(c, cx + 12, cy, 8, PORTAL_COLORS.orange);
      pxCircle(c, cx + 12, cy, 4, PORTAL_COLORS.orangeBright);
      // Arrow
      c.strokeStyle = '#ffffff44';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(cx - 2, cy);
      c.lineTo(cx + 2, cy);
      c.moveTo(cx, cy - 2);
      c.lineTo(cx + 2, cy);
      c.lineTo(cx, cy + 2);
      c.stroke();
    },
  },
};

// ---- Level detection ----

function detectThingsInLevel(levelData) {
  const found = new Set();
  for (const e of (levelData.enemies || [])) {
    if (e.type === 'patrol') found.add('enemy_patrol');
    if (e.type === 'tank') found.add('enemy_tank');
    if (e.type === 'sniper') found.add('enemy_sniper');
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

    // Preview canvas
    const cvs = document.createElement('canvas');
    cvs.width = 64;
    cvs.height = 64;
    cvs.className = 'bestiary-preview';
    cvs.style.width = '64px';
    cvs.style.height = '64px';
    const c = cvs.getContext('2d');
    c.fillStyle = '#0a0a12';
    c.fillRect(0, 0, 64, 64);
    def.draw(c, 32, 32);
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

  // Self-cleanup: when close fires, listeners are removed above
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

import { getUnlockedLevel } from './levelUnlock.js';
import { initStartDemo } from './startDemo.js';

const CATEGORIES = [
  { id: 'enemy', name: '敌人' },
  { id: 'item', name: '道具' },
  { id: 'ability', name: '能力' },
];

const BESTIARY_DATA = [
  // 敌人
  { id: 'basic', category: 'enemy', name: '基础敌人', unlockLevel: 1, color: '#ff4466',
    desc: '最基本的敌人，在区域内随机游荡。受到攻击时会被击退。', drawPreview: drawBasicEnemy },
  { id: 'patrol', category: 'enemy', name: '巡逻敌人', unlockLevel: 2, color: '#4488ff',
    desc: '沿固定路线来回巡逻，移速较快。', drawPreview: drawPatrolEnemy },
  { id: 'tank', category: 'enemy', name: '坦克敌人', unlockLevel: 4, color: '#aa44ff',
    desc: '体型巨大，拥有4点生命值。发射紫色高伤害弹丸。', drawPreview: drawTankEnemy },
  { id: 'sniper', category: 'enemy', name: '狙击敌人', unlockLevel: 5, color: '#ffcc00',
    desc: '会瞄准玩家发射高速子弹，有红色激光瞄准线预警。', drawPreview: drawSniperEnemy },

  // 道具
  { id: 'barrel', category: 'item', name: '爆炸桶', unlockLevel: 3, color: '#ff8822',
    desc: '被击中会爆炸，对范围内所有敌人造成伤害。连锁爆炸！', drawPreview: drawBarrel },
  { id: 'prism', category: 'item', name: '棱镜', unlockLevel: 4, color: '#aa44ff',
    desc: '将激光分裂成多束。有静止、旋转、移动、可破坏四种类型。', drawPreview: drawPrism },
  { id: 'apple', category: 'item', name: '苹果', unlockLevel: 5, color: '#ff2222',
    desc: '击落后拾取可恢复1点生命值。', drawPreview: drawApple },
  { id: 'portal', category: 'item', name: '传送门', unlockLevel: 6, color: '#4488ff',
    desc: '成对出现。子弹进入一端会从另一端射出。', drawPreview: drawPortal },
  { id: 'piercing_pickup', category: 'item', name: '穿透拾取', unlockLevel: 4, color: '#ffaaff',
    desc: '击碎可破坏棱镜后掉落，拾取后获得穿透弹。', drawPreview: drawPiercingPickup },

  // 能力
  { id: 'laser', category: 'ability', name: '反弹激光', unlockLevel: 1, color: '#00ffcc',
    desc: '玩家的主要武器。激光子弹会在墙壁间反弹。', drawPreview: drawLaser },
  { id: 'piercing', category: 'ability', name: '穿透子弹', unlockLevel: 4, color: '#ff88ff',
    desc: '穿透子弹可穿过敌人继续飞行，一发打多个！', drawPreview: drawPiercing },
  { id: 'shield', category: 'ability', name: '全息护盾', unlockLevel: 1, color: '#00ccff',
    desc: '右键按住激活，消耗能量抵挡敌人子弹。过热后需冷却。', drawPreview: drawShield },
];

let currentCategory = 'enemy';

export function showBestiary() {
  document.getElementById('startScreen').classList.add('hidden');
  document.getElementById('gameContainer').classList.add('hidden');
  document.getElementById('bestiaryScreen').classList.remove('hidden');
  currentCategory = 'enemy';
  buildTabs();
  buildBestiaryGrid('enemy');
}

export function hideBestiary() {
  document.getElementById('bestiaryScreen').classList.add('hidden');
  document.getElementById('startScreen').classList.remove('hidden');
  initStartDemo();
}

function buildTabs() {
  const tabsEl = document.getElementById('bestiaryTabs');
  tabsEl.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'bestiary-tab' + (cat.id === currentCategory ? ' active' : '');
    btn.textContent = cat.name;
    btn.addEventListener('click', () => {
      currentCategory = cat.id;
      buildTabs();
      buildBestiaryGrid(cat.id);
    });
    tabsEl.appendChild(btn);
  });
}

function buildBestiaryGrid(category) {
  const grid = document.getElementById('bestiaryGrid');
  grid.innerHTML = '';
  const unlocked = getUnlockedLevel();
  const entries = BESTIARY_DATA.filter(e => e.category === category);

  entries.forEach(entry => {
    const isUnlocked = unlocked >= entry.unlockLevel;
    const card = document.createElement('div');
    card.className = 'bestiary-card' + (isUnlocked ? '' : ' locked');

    if (isUnlocked) {
      const cvs = document.createElement('canvas');
      cvs.className = 'bestiary-preview';
      cvs.width = 64;
      cvs.height = 64;
      card.appendChild(cvs);
      requestAnimationFrame(() => entry.drawPreview(cvs));

      const nameEl = document.createElement('div');
      nameEl.className = 'bestiary-name';
      nameEl.style.color = entry.color;
      nameEl.textContent = entry.name;
      card.appendChild(nameEl);

      const descEl = document.createElement('div');
      descEl.className = 'bestiary-desc';
      descEl.textContent = entry.desc;
      card.appendChild(descEl);

      const lvlEl = document.createElement('div');
      lvlEl.className = 'bestiary-level';
      lvlEl.textContent = `\u5173\u5361 ${entry.unlockLevel} \u8D77`;
      card.appendChild(lvlEl);
    } else {
      const lockIcon = document.createElement('div');
      lockIcon.className = 'bestiary-lock';
      lockIcon.textContent = '?';
      card.appendChild(lockIcon);

      const lvlEl = document.createElement('div');
      lvlEl.className = 'bestiary-level';
      lvlEl.textContent = `\u5173\u5361 ${entry.unlockLevel} \u89E3\u9501`;
      card.appendChild(lvlEl);
    }

    grid.appendChild(card);
  });
}

// --- Preview drawing helpers ---

function fc(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawBasicEnemy(cvs) {
  const c = cvs.getContext('2d');
  c.shadowColor = '#ff4466'; c.shadowBlur = 10;
  c.fillStyle = '#aa2244'; fc(c, 32, 32, 14);
  c.fillStyle = '#ff4466'; fc(c, 32, 32, 11);
  c.shadowBlur = 0;
  c.fillStyle = '#220011'; fc(c, 32, 30, 4);
  c.fillStyle = '#ffffff'; fc(c, 33, 29, 2);
}

function drawPatrolEnemy(cvs) {
  const c = cvs.getContext('2d');
  c.shadowColor = '#4488ff'; c.shadowBlur = 10;
  c.fillStyle = '#2255cc'; fc(c, 32, 32, 12);
  c.fillStyle = '#4488ff'; fc(c, 32, 32, 9);
  c.shadowBlur = 0;
  c.fillStyle = '#002266'; fc(c, 32, 30, 3);
  c.fillStyle = '#ffffff'; fc(c, 33, 29, 1.5);
  c.fillStyle = '#4488ff44';
  c.fillRect(8, 30, 10, 4);
  c.fillRect(46, 30, 10, 4);
}

function drawTankEnemy(cvs) {
  const c = cvs.getContext('2d');
  c.shadowColor = '#aa44ff'; c.shadowBlur = 12;
  c.fillStyle = '#6622cc'; fc(c, 32, 32, 18);
  c.fillStyle = '#aa44ff'; fc(c, 32, 32, 14);
  c.shadowBlur = 0;
  c.fillStyle = '#330066'; fc(c, 32, 30, 5);
  c.fillStyle = '#ffffff'; fc(c, 33, 29, 2.5);
  c.strokeStyle = '#6622cc'; c.lineWidth = 2;
  c.beginPath(); c.arc(32, 32, 17, -0.5, 0.5); c.stroke();
  c.beginPath(); c.arc(32, 32, 17, 2.6, 3.6); c.stroke();
}

function drawSniperEnemy(cvs) {
  const c = cvs.getContext('2d');
  c.shadowColor = '#ffcc00'; c.shadowBlur = 10;
  c.fillStyle = '#aa8800'; fc(c, 32, 32, 10);
  c.fillStyle = '#ffcc00'; fc(c, 32, 32, 7);
  c.shadowBlur = 0;
  c.fillStyle = '#664400'; fc(c, 32, 30, 3);
  c.fillStyle = '#ffffff'; fc(c, 33, 29, 1.5);
  c.shadowColor = '#ff0000'; c.shadowBlur = 6;
  c.strokeStyle = '#ff000088'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(42, 32); c.lineTo(62, 32); c.stroke();
  c.shadowBlur = 0;
}

function drawBarrel(cvs) {
  const c = cvs.getContext('2d');
  c.shadowColor = '#ff8822'; c.shadowBlur = 10;
  c.fillStyle = '#aa5511'; c.fillRect(20, 16, 24, 32);
  c.fillStyle = '#ff8822'; c.fillRect(22, 18, 20, 28);
  c.fillStyle = '#ffcc44';
  c.fillRect(20, 24, 24, 3);
  c.fillRect(20, 37, 24, 3);
  c.shadowBlur = 0;
  c.fillStyle = '#ff2200';
  c.font = 'bold 16px sans-serif'; c.textAlign = 'center';
  c.fillText('!', 32, 36);
}

function drawPrism(cvs) {
  const c = cvs.getContext('2d');
  c.shadowColor = '#aa44ff'; c.shadowBlur = 12;
  c.fillStyle = '#6622aa';
  c.beginPath(); c.moveTo(32, 10); c.lineTo(50, 32); c.lineTo(32, 54); c.lineTo(14, 32); c.closePath(); c.fill();
  c.fillStyle = '#aa44ff';
  c.beginPath(); c.moveTo(32, 14); c.lineTo(46, 32); c.lineTo(32, 50); c.lineTo(18, 32); c.closePath(); c.fill();
  c.shadowBlur = 0;
  c.strokeStyle = '#cc66ff88'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(50, 32); c.lineTo(62, 20); c.stroke();
  c.beginPath(); c.moveTo(50, 32); c.lineTo(62, 44); c.stroke();
}

function drawApple(cvs) {
  const c = cvs.getContext('2d');
  c.shadowColor = '#ff2222'; c.shadowBlur = 8;
  c.fillStyle = '#cc0000'; fc(c, 32, 35, 12);
  c.fillStyle = '#ff2222'; fc(c, 32, 35, 9);
  c.shadowBlur = 0;
  c.fillStyle = '#ff666644'; fc(c, 28, 30, 4);
  c.strokeStyle = '#44aa22'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(32, 23); c.lineTo(35, 17); c.stroke();
  c.fillStyle = '#22cc44';
  c.beginPath(); c.ellipse(38, 18, 5, 3, 0.5, 0, Math.PI * 2); c.fill();
}

function drawPortal(cvs) {
  const c = cvs.getContext('2d');
  c.shadowColor = '#4488ff'; c.shadowBlur = 8;
  c.strokeStyle = '#4488ff'; c.lineWidth = 3;
  c.beginPath(); c.arc(20, 32, 10, 0, Math.PI * 2); c.stroke();
  c.fillStyle = '#2266dd44'; fc(c, 20, 32, 8);
  c.shadowColor = '#ff8844';
  c.strokeStyle = '#ff8844';
  c.beginPath(); c.arc(44, 32, 10, 0, Math.PI * 2); c.stroke();
  c.fillStyle = '#dd662244'; fc(c, 44, 32, 8);
  c.shadowBlur = 0;
  c.strokeStyle = '#ffffff22'; c.lineWidth = 1;
  c.setLineDash([3, 3]);
  c.beginPath(); c.moveTo(30, 32); c.lineTo(34, 32); c.stroke();
  c.setLineDash([]);
}

function drawPiercingPickup(cvs) {
  const c = cvs.getContext('2d');
  c.shadowColor = '#ffaaff'; c.shadowBlur = 12;
  c.fillStyle = '#ff88ff'; fc(c, 32, 32, 8);
  c.fillStyle = '#ffccff'; fc(c, 32, 32, 4);
  c.shadowBlur = 0;
  c.fillStyle = '#ffaaff88';
  fc(c, 22, 24, 2); fc(c, 42, 22, 1.5);
  fc(c, 24, 42, 1.5); fc(c, 44, 40, 2);
}

function drawLaser(cvs) {
  const c = cvs.getContext('2d');
  c.shadowColor = '#00ffcc'; c.shadowBlur = 8;
  c.strokeStyle = '#00ffcc'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(4, 48); c.lineTo(30, 16); c.lineTo(58, 38); c.lineTo(40, 56); c.stroke();
  c.fillStyle = '#00ffcc'; fc(c, 4, 48, 3);
  c.shadowBlur = 0;
}

function drawPiercing(cvs) {
  const c = cvs.getContext('2d');
  c.shadowColor = '#ff88ff'; c.shadowBlur = 10;
  c.strokeStyle = '#ff88ff'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(8, 32); c.lineTo(56, 32); c.stroke();
  c.fillStyle = '#ff88ff'; fc(c, 56, 32, 4);
  c.fillStyle = '#ffccff'; fc(c, 56, 32, 2);
  c.shadowBlur = 0;
  c.fillStyle = '#ff446644'; fc(c, 20, 32, 6);
  c.fillStyle = '#ff446644'; fc(c, 38, 32, 6);
}

function drawShield(cvs) {
  const c = cvs.getContext('2d');
  c.fillStyle = '#00ff88'; fc(c, 32, 32, 5);
  c.shadowColor = '#00ccff'; c.shadowBlur = 10;
  c.strokeStyle = '#00ccff'; c.lineWidth = 2;
  c.beginPath(); c.arc(32, 32, 18, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = '#00ccff66'; c.lineWidth = 3;
  c.beginPath(); c.arc(32, 32, 18, -0.8, 0.8); c.stroke();
  c.beginPath(); c.arc(32, 32, 18, 2.3, 3.9); c.stroke();
  c.shadowBlur = 0;
}

import { getUnlockedLevel } from './levelUnlock.js';
import { initStartDemo } from './startDemo.js';
import { getSprite } from '../sprites/spriteLoader.js';
import { SPRITE_DEFS } from '../sprites/spriteData.js';
import { PORTAL_COLORS, PRISM_COLORS } from '../core/constants.js';

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
  { id: 'healer', category: 'enemy', name: '医疗兵', unlockLevel: 13, color: '#44cc88',
    desc: '绿色敌人，定期治愈附近盟友。不会射击但非常烦人。', drawPreview: drawHealerEnemy },
  { id: 'ghost', category: 'enemy', name: '幽灵', unlockLevel: 15, color: '#44ddcc',
    desc: '会在显形与隐形之间切换，隐形时无敌。', drawPreview: drawGhostEnemy },

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

/** Draw a sprite centered on 64x64 canvas with glow. Returns the 2d context. */
function drawSpritePreview(cvs, spriteKey, glowColor) {
  const c = cvs.getContext('2d');
  const sprite = getSprite(spriteKey);
  const def = SPRITE_DEFS[spriteKey];
  if (!sprite || !def) return c;
  const x = Math.floor((64 - def.w) / 2);
  const y = Math.floor((64 - def.h) / 2);
  c.shadowColor = glowColor;
  c.shadowBlur = 12;
  c.drawImage(sprite, x, y, def.w, def.h);
  c.shadowBlur = 0;
  return c;
}

function drawBasicEnemy(cvs) {
  drawSpritePreview(cvs, 'enemy_basic', '#ff4466');
}

function drawPatrolEnemy(cvs) {
  const c = drawSpritePreview(cvs, 'enemy_patrol', '#4488ff');
  // Patrol direction arrows
  c.fillStyle = '#4488ff66';
  const arrowY = 32;
  c.beginPath(); c.moveTo(4, arrowY); c.lineTo(10, arrowY - 4); c.lineTo(10, arrowY + 4); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(60, arrowY); c.lineTo(54, arrowY - 4); c.lineTo(54, arrowY + 4); c.closePath(); c.fill();
}

function drawTankEnemy(cvs) {
  drawSpritePreview(cvs, 'enemy_tank', '#aa44ff');
}

function drawSniperEnemy(cvs) {
  const c = drawSpritePreview(cvs, 'enemy_sniper', '#ffcc00');
  // Laser sight line
  c.shadowColor = '#ff0000';
  c.shadowBlur = 6;
  c.strokeStyle = '#ff000088';
  c.lineWidth = 1;
  c.beginPath(); c.moveTo(46, 32); c.lineTo(64, 32); c.stroke();
  c.shadowBlur = 0;
}

function drawHealerEnemy(cvs) {
  drawSpritePreview(cvs, 'enemy_healer', '#44cc88');
}

function drawGhostEnemy(cvs) {
  const c = cvs.getContext('2d');
  const sprite = getSprite('enemy_ghost');
  const def = SPRITE_DEFS.enemy_ghost;
  if (!sprite || !def) return;
  const x = Math.floor((64 - def.w) / 2);
  const y = Math.floor((64 - def.h) / 2);
  // Semi-transparent to show ghostly nature
  c.globalAlpha = 0.65;
  c.shadowColor = '#44ddcc';
  c.shadowBlur = 14;
  c.drawImage(sprite, x, y, def.w, def.h);
  c.shadowBlur = 0;
  c.globalAlpha = 1;
  // Dashed visibility circle
  c.strokeStyle = '#44ddcc44';
  c.lineWidth = 1;
  c.setLineDash([3, 3]);
  c.beginPath(); c.arc(32, 32, 28, 0, Math.PI * 2); c.stroke();
  c.setLineDash([]);
}

function drawBarrel(cvs) {
  drawSpritePreview(cvs, 'barrel', '#ff8822');
}

function drawPrism(cvs) {
  const c = drawSpritePreview(cvs, 'prism_normal', PRISM_COLORS.glow);
  // Split ray indicators showing light splitting effect
  c.shadowColor = PRISM_COLORS.glow;
  c.shadowBlur = 4;
  c.strokeStyle = '#cc66ff88';
  c.lineWidth = 1;
  // Incoming ray
  c.beginPath(); c.moveTo(2, 32); c.lineTo(14, 32); c.stroke();
  // Split outgoing rays
  c.beginPath(); c.moveTo(50, 32); c.lineTo(62, 22); c.stroke();
  c.beginPath(); c.moveTo(50, 32); c.lineTo(62, 32); c.stroke();
  c.beginPath(); c.moveTo(50, 32); c.lineTo(62, 42); c.stroke();
  c.shadowBlur = 0;
}

function drawApple(cvs) {
  drawSpritePreview(cvs, 'apple', '#ff4444');
}

function drawPortal(cvs) {
  const c = cvs.getContext('2d');
  // Blue portal (left) — particle ring style matching in-game rendering
  _drawPortalRing(c, 20, 32, 'blue');
  // Orange portal (right)
  _drawPortalRing(c, 44, 32, 'orange');
  // Connection indicator
  c.strokeStyle = '#ffffff22';
  c.lineWidth = 1;
  c.setLineDash([2, 2]);
  c.beginPath(); c.moveTo(29, 32); c.lineTo(35, 32); c.stroke();
  c.setLineDash([]);
}

function _drawPortalRing(c, cx, cy, type) {
  const colors = type === 'blue'
    ? [PORTAL_COLORS.blue, PORTAL_COLORS.blueBright, PORTAL_COLORS.blueGlow]
    : [PORTAL_COLORS.orange, PORTAL_COLORS.orangeBright, PORTAL_COLORS.orangeGlow];
  c.save();
  c.shadowColor = colors[0];
  c.shadowBlur = 8;
  for (let layer = 0; layer < 3; layer++) {
    const r = 3 + layer * 3;
    const count = 5 + layer * 2;
    const alpha = 0.9 - layer * 0.25;
    const size = 2.5 - layer * 0.5;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      c.globalAlpha = alpha;
      c.fillStyle = layer === 0 ? colors[1] : colors[0];
      c.fillRect(Math.floor(px - size / 2), Math.floor(py - size / 2), size, size);
    }
  }
  // Center glow
  c.globalAlpha = 0.9;
  c.fillStyle = colors[1];
  fc(c, cx, cy, 3);
  c.fillStyle = '#ffffff';
  fc(c, cx, cy, 1.5);
  c.globalAlpha = 1;
  c.shadowBlur = 0;
  c.restore();
}

function drawPiercingPickup(cvs) {
  const c = drawSpritePreview(cvs, 'pickup_piercing', '#ffaaff');
  // Sparkle particles around the pickup
  c.fillStyle = '#ffaaff66';
  fc(c, 18, 22, 1.5); fc(c, 46, 20, 1.5);
  fc(c, 20, 44, 1.5); fc(c, 44, 42, 1.5);
}

function drawLaser(cvs) {
  const c = cvs.getContext('2d');
  c.shadowColor = '#00ffcc'; c.shadowBlur = 8;
  c.strokeStyle = '#00ffcc'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(4, 48); c.lineTo(30, 16); c.lineTo(58, 38); c.lineTo(40, 56); c.stroke();
  // Bounce points
  c.fillStyle = '#00ffcc'; fc(c, 30, 16, 3); fc(c, 58, 38, 3);
  // Bullet head
  c.fillStyle = '#ffffff'; fc(c, 4, 48, 2);
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
  // Pierced enemies (X marks)
  c.strokeStyle = '#ff446666'; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(16, 26); c.lineTo(24, 38); c.moveTo(24, 26); c.lineTo(16, 38); c.stroke();
  c.beginPath(); c.moveTo(34, 26); c.lineTo(42, 38); c.moveTo(42, 26); c.lineTo(34, 38); c.stroke();
}

function drawShield(cvs) {
  const c = cvs.getContext('2d');
  // Player dot
  c.fillStyle = '#00ff88'; fc(c, 32, 32, 5);
  // Shield ring with glow
  c.shadowColor = '#00ccff'; c.shadowBlur = 10;
  c.strokeStyle = '#00ccff'; c.lineWidth = 2;
  c.beginPath(); c.arc(32, 32, 18, 0, Math.PI * 2); c.stroke();
  // Highlight arcs
  c.strokeStyle = '#00ccff66'; c.lineWidth = 3;
  c.beginPath(); c.arc(32, 32, 18, -0.8, 0.8); c.stroke();
  c.beginPath(); c.arc(32, 32, 18, 2.3, 3.9); c.stroke();
  c.shadowBlur = 0;
}

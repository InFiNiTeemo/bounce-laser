/**
 * tutorial.js - Interactive new player tutorial system
 */
import { ctx } from '../core/render.js';
import { W, H } from '../core/constants.js';
import { game, player, initGameState } from '../core/state.js';
import { loadLevelData } from '../levelLoader.js';
import { BUILTIN_LEVELS } from '../levels.js';

const TUTORIAL_LEVEL = {
  id: 'tutorial', name: '教程', shots: 99,
  enemies: [
    { type: 'basic', hp: 1, canShoot: false, x: 200, y: 150 },
    { type: 'basic', hp: 1, canShoot: false, x: 450, y: 330 },
    { type: 'basic', hp: 1, canShoot: true, x: 500, y: 100 },
  ],
  prisms: [], barrels: [], portals: [], apples: [],
};

const STEPS = [
  { title: '瞄准', text: '移动鼠标 瞄准敌人' },
  { title: '射击', text: '左键点击 发射激光' },
  { title: '反弹', text: '子弹碰墙会反弹！消灭更多敌人' },
  { title: '护盾', text: '按住右键 激活护盾挡住敌弹' },
  { title: '完成', text: '教程完成！准备开始冒险！' },
];

const LS_KEY = 'bounceLaser_tutorialDone';

export function isTutorialDone() {
  try { return localStorage.getItem(LS_KEY) === '1'; } catch (e) { return false; }
}

function markTutorialDone() {
  try { localStorage.setItem(LS_KEY, '1'); } catch (e) {}
}

export function resetTutorialFlag() {
  try { localStorage.removeItem(LS_KEY); } catch (e) {}
}

function hideScreensForTutorial() {
  ['startScreen', 'gameOverScreen', 'levelClearScreen', 'levelSelectScreen', 'pauseScreen'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  const bs = document.getElementById('bestiaryScreen');
  if (bs) bs.classList.add('hidden');
  game.paused = false;
  document.getElementById('gameContainer').classList.remove('hidden');
}

function hideHUD() {
  document.getElementById('ui-overlay').style.display = 'none';
  document.getElementById('bounceControl').style.display = 'none';
}

function restoreHUD() {
  document.getElementById('ui-overlay').style.display = '';
  document.getElementById('bounceControl').style.display = '';
}

export function startTutorial() {
  initGameState(1, 0, 99, 3);
  game.bulletDamage = 1;
  game.shieldRegenRate = 15;
  game.playerMaxHp = 3;
  game.playerHp = 3;
  loadLevelData(TUTORIAL_LEVEL);
  // Make the shooting enemy not shoot yet
  for (const e of game.enemies) {
    if (e.canShoot) e.shootTimer = 999;
  }
  game.tutorialActive = true;
  game.tutorialStep = 0;
  game.tutorialStepTimer = 0;
  game.tutorialShieldTime = 0;
  hideScreensForTutorial();
  hideHUD();
  game.running = true;
}

function advanceStep() {
  game.tutorialStep++;
  game.tutorialStepTimer = 0;
}

function startRealGame() {
  restoreHUD();
  initGameState(1, 0, 10, 3);
  game.bulletDamage = 1;
  game.shieldRegenRate = 15;
  game.playerMaxHp = 3;
  game.playerHp = 3;
  loadLevelData(BUILTIN_LEVELS[0]);
  hideScreensForTutorial();
  game.running = true;
}

function completeTutorial() {
  game.tutorialActive = false;
  markTutorialDone();
  startRealGame();
}

export function skipTutorial() {
  game.tutorialActive = false;
  markTutorialDone();
  startRealGame();
}

// Normalize angle to [-PI, PI]
function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

export function updateTutorial(dt) {
  const step = game.tutorialStep;
  game.tutorialStepTimer += dt;

  if (step === 0) {
    for (const e of game.enemies) {
      const angleToEnemy = Math.atan2(e.y - player.y, e.x - player.x);
      if (angleDiff(game.gunAngle, angleToEnemy) < 0.26) {
        advanceStep();
        return;
      }
    }
  } else if (step === 1) {
    if (game.killedEnemies >= 1) advanceStep();
  } else if (step === 2) {
    if (game.killedEnemies >= 2) {
      for (const e of game.enemies) {
        if (e.canShoot) e.shootTimer = 2;
      }
      advanceStep();
    }
  } else if (step === 3) {
    if (game.shieldActive) game.tutorialShieldTime += dt;
    if (game.tutorialShieldTime >= 1.0) advanceStep();
  } else if (step === 4) {
    if (game.tutorialStepTimer >= 1.5) completeTutorial();
  }
}

export function drawTutorialOverlay() {
  const step = game.tutorialStep;
  const info = STEPS[step];
  if (!info) return;

  ctx.save();

  // Step 4: fade everything out
  if (step === 4) {
    ctx.globalAlpha = Math.max(0, 1 - game.tutorialStepTimer / 1.5);
  }

  // === In-game visual hints (arrows, shield pulse) ===
  if (step === 0) {
    let nearest = null;
    let nearDist = Infinity;
    for (const e of game.enemies) {
      const d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d < nearDist) { nearDist = d; nearest = e; }
    }
    if (nearest) {
      const a = Math.atan2(nearest.y - player.y, nearest.x - player.x);
      const r = 50;
      const ax = player.x + Math.cos(a) * r;
      const ay = player.y + Math.sin(a) * r;
      const pulse = 0.5 + Math.sin(Date.now() / 200) * 0.3;
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(player.x + Math.cos(a) * 30, player.y + Math.sin(a) * 30);
      ctx.lineTo(ax, ay);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#00ff88';
      ctx.beginPath();
      ctx.moveTo(ax + Math.cos(a) * 8, ay + Math.sin(a) * 8);
      ctx.lineTo(ax + Math.cos(a + 2.5) * 6, ay + Math.sin(a + 2.5) * 6);
      ctx.lineTo(ax + Math.cos(a - 2.5) * 6, ay + Math.sin(a - 2.5) * 6);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  } else if (step === 3) {
    const pulse = 0.15 + Math.sin(Date.now() / 400) * 0.1;
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = '#00ccff';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(player.x, player.y, 40, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = step === 4 ? Math.max(0, 1 - game.tutorialStepTimer / 1.5) : 1;
  }

  // === Bottom floating panel ===
  const px = 70, py = 340, pw = 500, ph = 90;

  // Panel background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
  ctx.fillRect(px, py, pw, ph);
  // Border
  ctx.strokeStyle = '#00ff8844';
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
  // Top highlight line
  ctx.fillStyle = '#00ff8833';
  ctx.fillRect(px + 1, py, pw - 2, 1);

  // Step title: "▸ 步骤 1/5  瞄准"
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '9px "Press Start 2P"';
  ctx.fillStyle = '#557755';
  ctx.fillText('\u25B8 \u6B65\u9AA4 ' + (step + 1) + '/' + STEPS.length + '  ' + info.title, W / 2, py + 20);

  // Main instruction text
  ctx.font = '14px "Press Start 2P"';
  ctx.fillStyle = '#00ff88';
  ctx.shadowColor = '#00ff88';
  ctx.shadowBlur = 10;
  ctx.fillText(info.text, W / 2, py + 48);
  ctx.shadowBlur = 0;

  // Progress dots
  const dotY = py + 74;
  const dotSpacing = 16;
  const dotStartX = W / 2 - (STEPS.length - 1) * dotSpacing / 2;
  for (let i = 0; i < STEPS.length; i++) {
    const dx = dotStartX + i * dotSpacing;
    ctx.beginPath();
    ctx.arc(dx, dotY, 4, 0, Math.PI * 2);
    if (i < step) {
      ctx.fillStyle = '#00ff88';
      ctx.fill();
    } else if (i === step) {
      ctx.fillStyle = '#00ff88';
      ctx.fill();
      // Pulse ring on current dot
      ctx.beginPath();
      ctx.arc(dx, dotY, 4 + Math.sin(Date.now() / 300) * 2, 0, Math.PI * 2);
      ctx.strokeStyle = '#00ff8888';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      ctx.fillStyle = '#223322';
      ctx.fill();
    }
  }

  // Skip hint below panel
  if (step < 4) {
    ctx.font = '8px "Press Start 2P"';
    ctx.fillStyle = '#446644';
    ctx.fillText('ESC \u8DF3\u8FC7\u6559\u7A0B', W / 2, py + ph + 18);
  }

  ctx.restore();
}

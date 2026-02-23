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
  ['startScreen','gameOverScreen','levelClearScreen','levelSelectScreen','pauseScreen'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  const bs = document.getElementById('bestiaryScreen');
  if (bs) bs.classList.add('hidden');
  game.paused = false;
  document.getElementById('gameContainer').classList.remove('hidden');
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
  game.running = true;
}

function advanceStep() {
  game.tutorialStep++;
  game.tutorialStepTimer = 0;
}

function startRealGame() {
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
    // Check if gun is aiming at any enemy
    for (const e of game.enemies) {
      const angleToEnemy = Math.atan2(e.y - player.y, e.x - player.x);
      if (angleDiff(game.gunAngle, angleToEnemy) < 0.26) {
        advanceStep();
        return;
      }
    }
  } else if (step === 1) {
    if (game.killedEnemies >= 1) {
      advanceStep();
    }
  } else if (step === 2) {
    if (game.killedEnemies >= 2) {
      // Activate the shooting enemy
      for (const e of game.enemies) {
        if (e.canShoot) e.shootTimer = 2;
      }
      advanceStep();
    }
  } else if (step === 3) {
    if (game.shieldActive) {
      game.tutorialShieldTime += dt;
    }
    if (game.tutorialShieldTime >= 1.0) {
      advanceStep();
    }
  } else if (step === 4) {
    if (game.tutorialStepTimer >= 1.5) {
      completeTutorial();
    }
  }
}

export function drawTutorialOverlay() {
  const step = game.tutorialStep;
  const info = STEPS[step];
  if (!info) return;

  ctx.save();

  // Top bar background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(0, 0, W, 44);
  ctx.fillStyle = '#00ff8833';
  ctx.fillRect(0, 43, W, 1);

  // Title + text
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '12px "Press Start 2P"';
  ctx.fillStyle = '#00ff88';
  ctx.shadowColor = '#00ff88';
  ctx.shadowBlur = 8;
  ctx.fillText(info.text, W / 2, 22);
  ctx.shadowBlur = 0;

  // Progress dots
  const dotY = 38;
  const dotSpacing = 14;
  const startX = W / 2 - (STEPS.length - 1) * dotSpacing / 2;
  for (let i = 0; i < STEPS.length; i++) {
    const dx = startX + i * dotSpacing;
    ctx.beginPath();
    ctx.arc(dx, dotY, 3, 0, Math.PI * 2);
    if (i < step) {
      ctx.fillStyle = '#00ff88';
      ctx.fill();
    } else if (i === step) {
      ctx.fillStyle = '#00ff88';
      ctx.fill();
      // Pulse current dot
      ctx.beginPath();
      ctx.arc(dx, dotY, 3 + Math.sin(Date.now() / 300) * 1.5, 0, Math.PI * 2);
      ctx.strokeStyle = '#00ff8888';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#335544';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // Step-specific visuals
  if (step === 0) {
    // Draw arrow pointing to nearest enemy
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
      // Arrowhead
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
    // Pulse shield area hint
    const pulse = 0.15 + Math.sin(Date.now() / 400) * 0.1;
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = '#00ccff';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(player.x, player.y, 40, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  } else if (step === 4) {
    // Fade out effect
    const alpha = Math.max(0, 1 - game.tutorialStepTimer / 1.5);
    ctx.globalAlpha = alpha;
  }

  // Bottom skip hint
  if (step < 4) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, H - 20, W, 20);
    ctx.textAlign = 'center';
    ctx.font = '7px "Press Start 2P"';
    ctx.fillStyle = '#335544';
    ctx.globalAlpha = 0.8;
    ctx.fillText('ESC 跳过教程', W / 2, H - 9);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

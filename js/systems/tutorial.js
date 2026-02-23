/**
 * tutorial.js - Interactive new player tutorial system
 * Text rendered via DOM overlay (#tutorialOverlay) for crisp resolution.
 * Visual effects (arrows, shield circles) drawn on canvas.
 */
import { ctx } from '../core/render.js';
import { W, H } from '../core/constants.js';
import { game, player, initGameState } from '../core/state.js';
import { loadLevelData } from '../levelLoader.js';
import { BUILTIN_LEVELS } from '../levels.js';

const TUTORIAL_LEVEL = {
  id: 'tutorial', name: '\u6559\u7A0B', shots: 99,
  enemies: [
    { type: 'basic', hp: 1, canShoot: false, x: 200, y: 150 },
    { type: 'basic', hp: 1, canShoot: false, x: 450, y: 330 },
    { type: 'basic', hp: 1, canShoot: true, x: 500, y: 100 },
  ],
  prisms: [], barrels: [], portals: [], apples: [],
};

const STEPS = [
  { title: '\u7784\u51C6', text: '\u79FB\u52A8\u9F20\u6807 \u7784\u51C6\u654C\u4EBA' },
  { title: '\u5C04\u51FB', text: '\u5DE6\u952E\u70B9\u51FB \u53D1\u5C04\u6FC0\u5149' },
  { title: '\u53CD\u5F39', text: '\u5C06\u5B50\u5F39\u5F39\u5899\u540E\u51FB\u6740\u654C\u4EBA\uFF01' },
  { title: '\u62A4\u76FE\u53CD\u5F39', text: '\u6309\u4F4F\u53F3\u952E \u53CD\u5F39\u81EA\u5DF1\u7684\u5B50\u5F39' },
  { title: '\u62A4\u76FE', text: '\u6309\u4F4F\u53F3\u952E \u6FC0\u6D3B\u62A4\u76FE\u6321\u4F4F\u654C\u5F39' },
  { title: '\u62B5\u6321', text: '\u7528\u5B50\u5F39\u62B5\u6321\u654C\u4EBA\u7684\u5B50\u5F39' },
  { title: '\u5B8C\u6210', text: '\u6559\u7A0B\u5B8C\u6210\uFF01\u51C6\u5907\u5F00\u59CB\u5192\u9669\uFF01' },
];

const LS_KEY = 'bounceLaser_tutorialDone';
const TYPEWRITER_SPEED = 0.06;
const STEP_READY_DELAY = 1.0;

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

// ---- DOM Tutorial Panel ----
function initTutorialDots() {
  const dotsEl = document.getElementById('tutorialDots');
  dotsEl.innerHTML = '';
  for (let i = 0; i < STEPS.length; i++) {
    const dot = document.createElement('div');
    dot.className = 'tut-dot';
    dotsEl.appendChild(dot);
  }
}

function showTutorialPanel() {
  const overlay = document.getElementById('tutorialOverlay');
  overlay.classList.remove('hidden', 'fade-out');
  initTutorialDots();
  syncTutorialPanel(0);
}

function hideTutorialPanel() {
  document.getElementById('tutorialOverlay').classList.add('hidden');
}

function syncTutorialPanel(step) {
  const info = STEPS[step];
  if (!info) return;
  document.getElementById('tutorialStepLabel').textContent =
    '\u25B8 \u6B65\u9AA4 ' + (step + 1) + '/' + STEPS.length + '  ' + info.title;
  // Update dots
  const dots = document.getElementById('tutorialDots').children;
  for (let i = 0; i < dots.length; i++) {
    dots[i].className = 'tut-dot' +
      (i < step ? ' done' : i === step ? ' current' : '');
  }
  // Skip hint visibility
  document.getElementById('tutorialSkip').style.display =
    step >= STEPS.length - 1 ? 'none' : '';
}

// Typewriter helpers
function getVisibleText(fullText, elapsed) {
  const chars = Math.floor(elapsed / TYPEWRITER_SPEED);
  return fullText.substring(0, Math.min(chars, fullText.length));
}

/** Check if typewriter finished + delay elapsed */
function isStepReady(stepIndex, elapsed) {
  return elapsed >= STEPS[stepIndex].text.length * TYPEWRITER_SPEED + STEP_READY_DELAY;
}

function updateTypewriterDOM() {
  const step = game.tutorialStep;
  const info = STEPS[step];
  if (!info) return;
  let text = getVisibleText(info.text, game.tutorialStepTimer);
  // Show counter for shield defense step (step 4)
  if (step === 4 && isStepReady(4, game.tutorialStepTimer)) {
    const sec = Math.min(Math.floor(game.tutorialShieldTime), 1);
    text += '  (' + sec + '/1)';
  }
  // Show counter for bullet counter step (step 5)
  if (step === 5 && isStepReady(5, game.tutorialStepTimer)) {
    const count = Math.min(game.tutorialBulletCounters, 3);
    text += '  (' + count + '/3)';
  }
  document.getElementById('tutorialMainText').textContent = text;
}

// ---- Tutorial lifecycle ----
export function startTutorial() {
  initGameState(1, 0, 99, 3);
  game.bulletDamage = 1;
  game.shieldRegenRate = 15;
  game.playerMaxHp = 3;
  game.playerHp = 3;
  game.killedEnemies = 0;
  game.bounceKills = 0;
  game.shieldReflectKills = 0;
  game.tutorialShieldReflects = 0;
  game.tutorialBulletCounters = 0;
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
  showTutorialPanel();
  game.running = true;
}

function advanceStep() {
  game.tutorialStep++;
  game.tutorialStepTimer = 0;
  syncTutorialPanel(game.tutorialStep);
  // Fade out on final step
  if (game.tutorialStep === STEPS.length - 1) {
    document.getElementById('tutorialOverlay').classList.add('fade-out');
  }
}

function spawnTutorialEnemy(canShoot) {
  let x, y, attempts = 0;
  do {
    x = 80 + Math.random() * (W - 160);
    y = 80 + Math.random() * (H - 160);
    attempts++;
  } while (attempts < 50 && Math.hypot(x - player.x, y - player.y) < 120);
  game.enemies.push({
    type: 'basic', x, y, size: 12, hp: 1, maxHp: 1,
    canShoot, shootTimer: canShoot ? (2 + Math.random() * 2) : 999,
    flashTimer: 0, bobPhase: Math.random() * Math.PI * 2,
  });
  game.levelEnemies = game.enemies.length;
}

function startRealGame() {
  restoreHUD();
  hideTutorialPanel();
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

  // Update typewriter text in DOM each frame
  updateTypewriterDOM();

  if (step === 0) {
    if (!isStepReady(0, game.tutorialStepTimer)) return;
    for (const e of game.enemies) {
      const angleToEnemy = Math.atan2(e.y - player.y, e.x - player.x);
      if (angleDiff(game.gunAngle, angleToEnemy) < 0.26) {
        advanceStep();
        return;
      }
    }
  } else if (step === 1) {
    if (!isStepReady(1, game.tutorialStepTimer)) return;
    if (game.killedEnemies >= 1) advanceStep();
  } else if (step === 2) {
    if (!isStepReady(2, game.tutorialStepTimer)) return;
    // Respawn if all killed without bounce kill
    if (game.enemies.length === 0 && game.bounceKills < 1) {
      spawnTutorialEnemy(false);
    }
    if (game.bounceKills >= 1) {
      if (game.enemies.length === 0) spawnTutorialEnemy(false);
      advanceStep();
    }
  } else if (step === 3) {
    if (!isStepReady(3, game.tutorialStepTimer)) return;
    // Shield reflect: reflect own bullet with shield
    if (game.enemies.length === 0) spawnTutorialEnemy(false);
    if (game.tutorialShieldReflects >= 1) {
      // Set up shooting enemies for shield defense step
      for (const e of game.enemies) {
        e.canShoot = true;
        e.shootTimer = 2 + Math.random() * 2;
      }
      if (game.enemies.length < 2) {
        const need = 2 - game.enemies.length;
        for (let i = 0; i < need; i++) spawnTutorialEnemy(true);
      }
      // Reset shield for defense step
      game.shieldEnergy = game.shieldMaxEnergy;
      game.shieldCooldown = false;
      advanceStep();
    }
  } else if (step === 4) {
    if (!isStepReady(4, game.tutorialStepTimer)) return;
    // Shield defense: block enemy bullets
    if (game.enemies.length === 0) {
      spawnTutorialEnemy(true);
      spawnTutorialEnemy(true);
    }
    if (game.shieldActive) game.tutorialShieldTime += dt;
    if (game.tutorialShieldTime >= 1.0) advanceStep();
  } else if (step === 5) {
    if (!isStepReady(5, game.tutorialStepTimer)) return;
    // Bullet counter: use own bullet to destroy enemy bullet
    if (game.enemies.length === 0) {
      spawnTutorialEnemy(true);
      spawnTutorialEnemy(true);
    }
    // Ensure enemies are shooting
    for (const e of game.enemies) {
      if (e.canShoot && e.shootTimer > 3) e.shootTimer = 2;
    }
    if (game.tutorialBulletCounters >= 3) advanceStep();
  } else if (step === 6) {
    if (game.tutorialStepTimer >= 1.5) completeTutorial();
  }
}

// Only draws canvas visual effects (arrows, shield circles).
// Text panel is rendered via DOM overlay for crisp resolution.
export function drawTutorialOverlay() {
  const step = game.tutorialStep;
  if (step >= STEPS.length) return;

  ctx.save();

  // === In-game visual hints ===
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
  } else if (step === 2) {
    // Bounce trajectory hint: player -> wall -> enemy
    if (game.enemies.length > 0) {
      const pulse = 0.3 + Math.sin(Date.now() / 300) * 0.2;
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      const nearest = game.enemies[0];
      const wallY = 6;
      const midX = (player.x + nearest.x) / 2;
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(midX, wallY);
      ctx.lineTo(nearest.x, nearest.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
  } else if (step === 3) {
    // Shield reflect hint: shield circle + outward arrow
    const pulse = 0.2 + Math.sin(Date.now() / 300) * 0.15;
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = '#00ccff';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(player.x, player.y, 40, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    if (game.enemies.length > 0) {
      const e = game.enemies[0];
      const a = Math.atan2(e.y - player.y, e.x - player.x);
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(player.x + Math.cos(a) * 44, player.y + Math.sin(a) * 44);
      ctx.lineTo(player.x + Math.cos(a) * 80, player.y + Math.sin(a) * 80);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
  } else if (step === 4 || step === 5) {
    // Shield / bullet counter hint: pulsing shield circle
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
  }

  ctx.restore();
}

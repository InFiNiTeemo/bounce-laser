/**
 * combo.js - Combo kill system: tracking, multiplier, visuals, milestones.
 */
import { ctx } from '../core/render.js';
import { W, H } from '../core/constants.js';
import { game, player } from '../core/state.js';
import { spawnParticles } from './particles.js';
import { playSound } from './audio.js';

// --- Ephemeral visual state (not serialized) ---
const floatingTexts = [];
let milestoneFlash = null;
let comboBreakFade = 0;
let comboPulse = 0;
let slowMoTimer = 0;
let lastComboForBreak = 0;

// --- Constants ---
const COMBO_WINDOW = 3.0;
const FLOATING_TEXT_DURATION = 1.0;
const MILESTONE_FLASH_DURATION = 1.5;
const MAX_FLOATING_TEXTS = 20;

// --- Multiplier ---
function getMultiplier(combo) {
  if (combo >= 8) return 3.0;
  if (combo >= 5) return 2.0;
  if (combo >= 3) return 1.5;
  return 1.0;
}

// --- Combo tier color ---
function getComboColor(combo) {
  if (combo >= 8) return '#ff44ff';
  if (combo >= 5) return '#ffdd44';
  if (combo >= 3) return '#00ffcc';
  return '#ffffff';
}

// --- Public API ---

/**
 * Called on every enemy kill. Increments combo, awards bonus score,
 * spawns floating text, and checks milestones.
 */
export function registerKill(x, y, baseScore) {
  if (game.tutorialActive) return;

  game.combo++;
  game.comboTimer = COMBO_WINDOW;
  game.comboMultiplier = getMultiplier(game.combo);
  comboPulse = 1.0;

  if (game.combo > game.comboBestThisLevel) {
    game.comboBestThisLevel = game.combo;
  }

  // Award bonus score (multiplier portion above x1)
  const bonusScore = Math.floor(baseScore * (game.comboMultiplier - 1));
  if (bonusScore > 0) {
    game.score += bonusScore;
    game.comboTotalThisLevel += bonusScore;
  }

  // Spawn floating score text
  const totalShown = baseScore + bonusScore;
  const isMultiplied = game.comboMultiplier > 1;
  if (floatingTexts.length >= MAX_FLOATING_TEXTS) floatingTexts.shift();
  floatingTexts.push({
    x, y,
    text: '+' + totalShown,
    color: isMultiplied ? '#ffdd44' : '#00ff88',
    life: FLOATING_TEXT_DURATION,
    maxLife: FLOATING_TEXT_DURATION,
    vy: -40,
  });

  // Escalating particle effects
  if (game.combo >= 8) {
    spawnParticles(x, y, '#ff44ff', 10);
    spawnParticles(x, y, '#ffffff', 6);
  } else if (game.combo >= 5) {
    spawnParticles(x, y, '#ffdd44', 8);
  } else if (game.combo >= 3) {
    spawnParticles(x, y, '#00ffcc', 6);
  }

  // Combo sound (pitch rises with combo)
  if (game.combo >= 2) {
    playSound('combo_hit', { combo: game.combo });
  }

  // Check milestones (only trigger on exact threshold)
  checkMilestones();
}

function checkMilestones() {
  if (game.combo === 3) {
    milestoneFlash = {
      text: '\u8FDE\u51FB!',
      color: '#00ffcc',
      life: MILESTONE_FLASH_DURATION,
      maxLife: MILESTONE_FLASH_DURATION,
      fontSize: 18,
    };
    spawnParticles(player.x, player.y, '#00ffcc', 20);
    playSound('combo_milestone');
  } else if (game.combo === 5) {
    milestoneFlash = {
      text: '\u8D85\u7EA7\u8FDE\u51FB!',
      color: '#ffdd44',
      life: MILESTONE_FLASH_DURATION,
      maxLife: MILESTONE_FLASH_DURATION,
      fontSize: 20,
    };
    spawnParticles(player.x, player.y, '#ffdd44', 24);
    spawnParticles(player.x, player.y, '#ffffff', 12);
    playSound('combo_super');
    slowMoTimer = 0.5;
  } else if (game.combo === 8) {
    milestoneFlash = {
      text: '\u75AF\u72C2\u8FDE\u51FB!',
      color: '#ff44ff',
      life: MILESTONE_FLASH_DURATION,
      maxLife: MILESTONE_FLASH_DURATION,
      fontSize: 24,
    };
    spawnParticles(player.x, player.y, '#ff44ff', 28);
    spawnParticles(player.x, player.y, '#ffffff', 16);
    spawnParticles(player.x, player.y, '#ffaa00', 12);
    playSound('combo_super');
    game.shots += 3;
    game.screenShake = Math.max(game.screenShake, 0.4);
  }
}

/**
 * Update combo timer, animations, and slow-mo.
 * @param {number} rawDt - Real (unscaled) delta time
 */
export function updateCombo(rawDt) {
  // Slow-mo timer always uses real time
  if (slowMoTimer > 0) {
    slowMoTimer -= rawDt;
    if (slowMoTimer < 0) slowMoTimer = 0;
  }

  // Combo timer uses game-scaled time so slow-mo extends the window
  const gameDt = rawDt * getSlowMoFactor();

  if (game.combo > 0) {
    game.comboTimer -= gameDt;
    if (game.comboTimer <= 0) {
      // Combo breaks
      lastComboForBreak = game.combo;
      comboBreakFade = 1.0;
      game.combo = 0;
      game.comboTimer = 0;
      game.comboMultiplier = 1.0;
      if (lastComboForBreak >= 3) {
        playSound('combo_break');
      }
    }
  }

  // Decay visual timers
  comboPulse = Math.max(0, comboPulse - rawDt * 4);
  comboBreakFade = Math.max(0, comboBreakFade - rawDt * 2);

  // Update floating texts
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.y += ft.vy * rawDt;
    ft.life -= rawDt;
    if (ft.life <= 0) floatingTexts.splice(i, 1);
  }

  // Update milestone flash
  if (milestoneFlash) {
    milestoneFlash.life -= rawDt;
    if (milestoneFlash.life <= 0) milestoneFlash = null;
  }
}

/**
 * Returns the current slow-mo time scale factor.
 */
export function getSlowMoFactor() {
  return slowMoTimer > 0 ? 0.35 : 1.0;
}

/**
 * Draw all combo UI elements onto the canvas.
 */
export function drawCombo() {
  // --- Slow-mo overlay ---
  if (slowMoTimer > 0) {
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#000044';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // --- Floating score texts ---
  for (const ft of floatingTexts) {
    const alpha = ft.life / ft.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '10px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.shadowColor = ft.color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // --- Combo counter (only show at x2+) --- right side
  if (game.combo >= 2) {
    const color = getComboColor(game.combo);
    const scale = 1 + comboPulse * 0.3;
    const fontSize = Math.round(16 * scale);
    const cx = W - 50;
    const cy = H / 2 - 20;

    ctx.save();
    ctx.font = fontSize + 'px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = color;
    ctx.shadowBlur = 12 + comboPulse * 8;
    ctx.fillStyle = color;
    ctx.fillText('x' + game.combo, cx, cy);

    // Multiplier sub-text
    if (game.comboMultiplier > 1) {
      ctx.font = '9px "Press Start 2P"';
      ctx.shadowBlur = 6;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.8;
      ctx.fillText('\u00d7' + game.comboMultiplier.toFixed(1), cx, cy + 16);
    }

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();

    // --- Combo timer bar (vertical, right side) ---
    const barW = 4;
    const barH = 60;
    const barX = cx + 30;
    const barY = cy - barH / 2;
    const fill = game.comboTimer / COMBO_WINDOW;

    ctx.save();
    // Background
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(barX, barY, barW, barH);
    // Fill (bottom-up)
    const timerColor = fill > 0.3 ? color : '#ff4444';
    ctx.shadowColor = timerColor;
    ctx.shadowBlur = 6;
    ctx.fillStyle = timerColor;
    const fillH = barH * fill;
    ctx.fillRect(barX, barY + barH - fillH, barW, fillH);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // --- Combo break fade --- right side
  if (comboBreakFade > 0 && lastComboForBreak >= 2) {
    const color = getComboColor(lastComboForBreak);
    ctx.save();
    ctx.globalAlpha = comboBreakFade * 0.5;
    ctx.font = '14px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText('x' + lastComboForBreak, W - 50, H / 2 - 20 - comboBreakFade * 10);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // --- Milestone flash ---
  if (milestoneFlash) {
    const mf = milestoneFlash;
    const alpha = Math.min(mf.life / mf.maxLife * 1.5, 1);
    const scale = 1.2 - (1 - mf.life / mf.maxLife) * 0.2;
    const fontSize = Math.round(mf.fontSize * Math.max(scale, 1));

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = fontSize + 'px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = mf.color;
    ctx.shadowBlur = 20 + (1 - alpha) * 10;
    ctx.fillStyle = mf.color;
    ctx.fillText(mf.text, W / 2, H / 2 - 60);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

/**
 * Reset all combo state. Called on level start.
 */
export function resetCombo() {
  game.combo = 0;
  game.comboTimer = 0;
  game.comboMultiplier = 1.0;
  game.comboBestThisLevel = 0;
  game.comboTotalThisLevel = 0;
  floatingTexts.length = 0;
  milestoneFlash = null;
  comboBreakFade = 0;
  comboPulse = 0;
  slowMoTimer = 0;
  lastComboForBreak = 0;
}

/**
 * Returns combo stats for display on level-clear / game-over screens.
 */
export function getComboStats() {
  return {
    bestCombo: game.comboBestThisLevel,
    comboBonus: game.comboTotalThisLevel,
  };
}

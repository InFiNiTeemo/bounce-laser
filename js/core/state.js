/**
 * state.js - Game state management and save/load
 */
import { W, H } from './constants.js';

// Game State
export const game = {
  running: false,
  level: 1,
  shots: 10,
  maxBounces: 3,
  score: 0,
  playerAlive: true,
  gunAngle: 0,
  mouseX: W / 2,
  mouseY: 0,
  bullets: [],
  enemies: [],
  enemyBullets: [],
  particles: [],
  screenShake: 0,
  levelEnemies: 0,
  killedEnemies: 0,
  bounceKills: 0,
  shieldReflectKills: 0,
  shieldActive: false,
  shieldEnergy: 100,
  shieldMaxEnergy: 100,
  shieldCooldown: false,
  prisms: [],
  barrels: [],
  pickups: [],
  portals: [],
  piercingCount: 0,
  playerHp: 3,
  playerMaxHp: 3,
  bulletDamage: 1,
  shieldRegenRate: 15,
  walls: [],
  apples: [],
  gravityWells: [],
  amplifiers: [],
  paused: false,
  isPlayTest: false,
  customLevelData: null,
  editorActive: false,
  editorReturnData: null,
  tutorialActive: false,
  tutorialStep: 0,
  tutorialStepTimer: 0,
  tutorialShieldTime: 0,
  tutorialShieldReflects: 0,
  tutorialBulletCounters: 0,
  shieldCounter: false,
  secondLife: false,
  secondLifeUsed: false,
  ammoRecoveryChance: 0,
  scatterLevel: 0,
  magnetLevel: 0,
  explosiveLevel: 0,
  chainLevel: 0,
  critChance: 0,
  chainLightnings: [],
  bulletLifeBonus: 0,
  ammoRecoveryBonus: 0,
  shieldDrainMult: 1.0,
  explosionDmgBonus: 0,
  explosionRadiusMult: 1.0,
  prismSplitBonus: 0,
  prismPiercing: false,
  heavyBullets: false,
  secondLifeRing: null,
  secondLifeFlash: 0,
  // Combo system
  combo: 0,
  comboTimer: 0,
  comboMultiplier: 1.0,
  comboBestThisLevel: 0,
  comboTotalThisLevel: 0,
  // Boss system
  boss: null,
  bossDeathSequence: false,
};

export const player = {
  x: W / 2,
  y: H / 2,
  size: 14,
  gunLength: 22,
  invincibleTimer: 0,
};

// ---- SAVE/LOAD GAME PROGRESS ----
export function saveGameProgress() {
  try {
    localStorage.setItem('bounceLaser_save', JSON.stringify({
      level: game.level + 1,
      score: game.score,
      shots: game.shots + 5,
      playerHp: game.playerHp,
      playerMaxHp: game.playerMaxHp,
      piercingCount: game.piercingCount,
      bulletDamage: game.bulletDamage,
      shieldRegenRate: game.shieldRegenRate,
      shieldCounter: game.shieldCounter,
      secondLife: game.secondLife,
      ammoRecoveryChance: game.ammoRecoveryChance,
      scatterLevel: game.scatterLevel,
      magnetLevel: game.magnetLevel,
      explosiveLevel: game.explosiveLevel,
      chainLevel: game.chainLevel,
      critChance: game.critChance,
      bulletLifeBonus: game.bulletLifeBonus,
      ammoRecoveryBonus: game.ammoRecoveryBonus,
      shieldDrainMult: game.shieldDrainMult,
      explosionDmgBonus: game.explosionDmgBonus,
      explosionRadiusMult: game.explosionRadiusMult,
      prismSplitBonus: game.prismSplitBonus,
      prismPiercing: game.prismPiercing,
      heavyBullets: game.heavyBullets,
      maxBounces: game.maxBounces,
      shieldMaxEnergy: game.shieldMaxEnergy,
    }));
  } catch (e) {}
}

export function loadGameProgress() {
  try {
    const d = localStorage.getItem('bounceLaser_save');
    return d ? JSON.parse(d) : null;
  } catch (e) {
    return null;
  }
}

export function hasSaveData() {
  return loadGameProgress() !== null;
}

export function updateContinueButton() {
  const btn = document.getElementById('continueBtn');
  const info = document.getElementById('saveInfo');
  const save = loadGameProgress();
  if (save && save.level > 1) {
    btn.disabled = false;
    info.textContent = '\u5B58\u6863: \u5173\u5361 ' + save.level + ' | \u5F97\u5206 ' + save.score;
  } else {
    btn.disabled = true;
    info.textContent = '';
  }
}

export function initGameState(lvl, score, shots, hp) {
  game.level = lvl;
  game.score = score;
  game.shots = shots;
  game.playerAlive = true;
  game.bullets = [];
  game.enemyBullets = [];
  game.particles = [];
  game.screenShake = 0;
  game.shieldActive = false;
  game.shieldEnergy = 100;
  game.shieldCooldown = false;
  game.playerHp = hp;
  game.prisms = [];
  game.barrels = [];
  game.portals = [];
  game.pickups = [];
  game.apples = [];
  game.gravityWells = [];
  game.amplifiers = [];
  game.walls = [];
  game.piercingCount = 0;
  game.secondLifeUsed = false;
  game.chainLightnings = [];
  game.boss = null;
  game.bossDeathSequence = false;
  // Combo reset
  game.combo = 0;
  game.comboTimer = 0;
  game.comboMultiplier = 1.0;
  game.comboBestThisLevel = 0;
  game.comboTotalThisLevel = 0;
  player.invincibleTimer = 1;
}

export function resetGameState() {
  initGameState(1, 0, 10, game.playerMaxHp);
  game.bulletDamage = 1;
  game.shieldRegenRate = 15;
  game.playerMaxHp = 3;
  game.playerHp = 3;
  game.shieldCounter = false;
  game.secondLife = false;
  game.secondLifeUsed = false;
  game.ammoRecoveryChance = 0;
  game.scatterLevel = 0;
  game.magnetLevel = 0;
  game.explosiveLevel = 0;
  game.chainLevel = 0;
  game.critChance = 0;
  game.bulletLifeBonus = 0;
  game.ammoRecoveryBonus = 0;
  game.shieldDrainMult = 1.0;
  game.explosionDmgBonus = 0;
  game.explosionRadiusMult = 1.0;
  game.prismSplitBonus = 0;
  game.prismPiercing = false;
  game.heavyBullets = false;
  game.maxBounces = 3;
  game.shieldMaxEnergy = 100;
}

export function resetForNextLevel() {
  game.level++;
  game.bullets = [];
  game.enemyBullets = [];
  game.particles = [];
  game.prisms = [];
  game.barrels = [];
  game.pickups = [];
  game.portals = [];
  game.apples = [];
  game.gravityWells = [];
  game.amplifiers = [];
  game.walls = [];
  game.shots += 1;
  game.playerAlive = true;
  game.shieldActive = false;
  game.shieldEnergy = game.shieldMaxEnergy;
  game.shieldCooldown = false;
  game.secondLifeUsed = false;
  game.boss = null;
  game.bossDeathSequence = false;
  player.invincibleTimer = 1;
}

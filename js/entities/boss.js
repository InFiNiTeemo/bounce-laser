/**
 * boss.js - Boss entity system: state machine, AI, rendering, HP bar.
 * First boss: Mirror Guardian (镜像守卫) — prism-themed, 3-phase fight.
 */
import { ctx, drawPixelCircle } from '../core/render.js';
import { W, H, BOSS_COLORS } from '../core/constants.js';
import { game, player } from '../core/state.js';
import { spawnParticles } from '../systems/particles.js';
import { playSound } from '../systems/audio.js';
import { damagePlayer } from '../systems/damage.js';

// ---- Build ----

export function buildBoss(def) {
  const hp = def.hp || 30;
  return {
    type: def.type || 'mirror_guardian',
    name: '\u955C\u50CF\u5B88\u536B',
    x: 320, y: 60,
    size: 36,
    hitboxRadius: 36,
    hp, maxHp: hp,

    // Phase system
    phase: 1,
    phaseThresholds: [20, 10, 0],
    phaseTransitioning: false,
    phaseTransitionTimer: 0,
    invulnerable: false,
    stunTimer: 0,

    // Elliptical orbit
    moveAngle: -Math.PI / 2,
    moveSpeed: 0.3,
    orbitRadiusX: 200,
    orbitRadiusY: 150,

    // Attack
    attackTimer: 2.5,
    lastAttack: null,

    // Phase 1: shield prisms
    shieldPrisms: [
      { angle: 0, distance: 54, w: 30, h: 8 },
      { angle: Math.PI * 2 / 3, distance: 54, w: 30, h: 8 },
      { angle: Math.PI * 4 / 3, distance: 54, w: 30, h: 8 },
    ],

    // Phase 2: clones
    clones: [],
    cloneRespawnTimer: 0,

    // Phase 3: controlled prisms + beam
    controlledPrisms: [],
    beamChargeTimer: 0,
    beamFiring: false,
    beamFireTimer: 0,
    beamAngle: 0,

    // Visual
    bobPhase: Math.random() * Math.PI * 2,
    glowPhase: 0,
    bodyAngle: 0,
    damageFlashTimer: 0,
    deathTimer: 0,
    deathDuration: 3.0,
  };
}

// ---- Queries ----

export function isBossAlive() {
  return game.boss && game.boss.hp > 0 && game.boss.deathTimer <= 0;
}

export function getBossVirtualPrisms() {
  const boss = game.boss;
  if (!boss || boss.phase !== 3 || boss.deathTimer > 0) return [];
  return boss.controlledPrisms.map(cp => ({
    x: W / 2 + Math.cos(cp.angle) * cp.distance,
    y: H / 2 + Math.sin(cp.angle) * cp.distance,
    w: cp.w, h: cp.h,
    angle: cp.prismAngle,
    type: 'static', splitCount: 2,
    hp: -1, maxHp: -1, flashTimer: 0, glowPhase: 0,
    rotSpeed: 0, segments: 1,
    _bossControlled: true,
  }));
}

// ---- Damage ----

export function damageBoss(dmg, bullet) {
  const boss = game.boss;
  if (!boss || boss.invulnerable || boss.phaseTransitioning || boss.deathTimer > 0) return;

  // Phase 1: check shield prism block
  if (boss.phase === 1 && bullet) {
    for (const sp of boss.shieldPrisms) {
      const spx = boss.x + Math.cos(sp.angle) * sp.distance;
      const spy = boss.y + Math.sin(sp.angle) * sp.distance;
      const dx = bullet.x - spx, dy = bullet.y - spy;
      const r = sp.w / 2 + 6;
      if (dx * dx + dy * dy < r * r) {
        // Blocked by shield prism - bounce bullet instead
        spawnParticles(spx, spy, BOSS_COLORS.shield, 6);
        playSound('bounce');
        return; // Don't damage boss
      }
    }
  }

  boss.hp -= dmg;
  boss.damageFlashTimer = 0.15;
  game.screenShake = Math.max(game.screenShake, 0.2);

  if (boss.hp <= 0) {
    boss.hp = 0;
    startDeathSequence(boss);
    return;
  }

  // Check phase transition
  if (boss.phase === 1 && boss.hp <= boss.phaseThresholds[0]) {
    startPhaseTransition(boss, 2);
  } else if (boss.phase === 2 && boss.hp <= boss.phaseThresholds[1]) {
    startPhaseTransition(boss, 3);
  }
}

// ---- Phase transitions ----

function startPhaseTransition(boss, newPhase) {
  boss.phaseTransitioning = true;
  boss.invulnerable = true;
  boss.phaseTransitionTimer = 2.0;
  boss.attackTimer = 2.0;
  boss.lastAttack = null;

  // Clear boss bullets
  game.enemyBullets = game.enemyBullets.filter(eb => eb.bulletType !== 'boss' && eb.bulletType !== 'boss_wide');

  game.screenShake = 0.5;
  spawnParticles(boss.x, boss.y, '#ffffff', 30);
  spawnParticles(boss.x, boss.y, BOSS_COLORS.body, 20);
  playSound('boss_phase');

  if (newPhase === 2) {
    boss.shieldPrisms = [];
    spawnClones(boss);
  } else if (newPhase === 3) {
    boss.clones = [];
    boss.cloneRespawnTimer = 0;
    spawnControlledPrisms(boss);
    // Add a repel gravity well
    game.gravityWells.push({
      x: W / 2 + (Math.random() - 0.5) * 100,
      y: H / 2 + (Math.random() - 0.5) * 80,
      type: 'repel', hp: -1, maxHp: -1,
      flashTimer: 0, glowPhase: Math.random() * Math.PI * 2,
      orbitPhase: Math.random() * Math.PI * 2,
      pulseTimer: 0, currentStrength: -0.6,
    });
  }
}

function updatePhaseTransition(boss, dt) {
  boss.phaseTransitionTimer -= dt;
  if (boss.phaseTransitionTimer <= 0) {
    boss.phase++;
    boss.phaseTransitioning = false;
    boss.invulnerable = false;
    boss.attackTimer = 1.5;
    spawnParticles(boss.x, boss.y, '#ffffff', 16);
    playSound('boss_phase');
  }
}

// ---- Clone system (Phase 2) ----

function spawnClones(boss) {
  boss.clones = [];
  for (let i = 0; i < 2; i++) {
    const offsetAngle = boss.moveAngle + (i + 1) * (Math.PI * 2 / 3);
    boss.clones.push({
      x: W / 2 + Math.cos(offsetAngle) * 190,
      y: H / 2 + Math.sin(offsetAngle) * 140,
      size: 29,
      hp: 3, maxHp: 3,
      moveAngle: offsetAngle,
      flashTimer: 0,
      bobPhase: Math.random() * Math.PI * 2,
      bodyAngle: Math.random() * Math.PI * 2,
      shootTimer: 2.5 + Math.random() * 1.5,
      alpha: 0.55,
    });
  }
  playSound('boss_clone');
}

function updateClones(boss, dt) {
  let aliveCount = 0;
  for (const clone of boss.clones) {
    if (clone.hp <= 0) continue;
    aliveCount++;

    // Orbit movement
    clone.moveAngle += boss.moveSpeed * 1.2 * dt;
    clone.x = W / 2 + Math.cos(clone.moveAngle) * 190;
    clone.y = H / 2 + Math.sin(clone.moveAngle) * 140;
    clone.x = Math.max(clone.size + 10, Math.min(W - clone.size - 10, clone.x));
    clone.y = Math.max(clone.size + 10, Math.min(H - clone.size - 10, clone.y));
    clone.bobPhase += dt * 2;
    clone.bodyAngle += dt * 0.6;
    if (clone.flashTimer > 0) clone.flashTimer -= dt;

    // Clone shoots
    clone.shootTimer -= dt;
    if (clone.shootTimer <= 0) {
      clone.shootTimer = 2.5 + Math.random() * 1.5;
      const angle = Math.atan2(player.y - clone.y, player.x - clone.x);
      game.enemyBullets.push({
        x: clone.x, y: clone.y,
        vx: Math.cos(angle) * 3, vy: Math.sin(angle) * 3,
        life: 200, lastPortal: null, bulletType: 'boss',
      });
      playSound('boss_shoot');
    }
  }

  // Respawn clones if all dead
  if (aliveCount === 0 && boss.stunTimer <= 0) {
    boss.cloneRespawnTimer -= dt;
    if (boss.cloneRespawnTimer <= 0) {
      spawnClones(boss);
      boss.cloneRespawnTimer = 6.0;
    }
  }
}

// ---- Controlled prisms (Phase 3) ----

function spawnControlledPrisms(boss) {
  boss.controlledPrisms = [];
  for (let i = 0; i < 4; i++) {
    boss.controlledPrisms.push({
      angle: (Math.PI / 2) * i,
      distance: 120,
      w: 35, h: 10,
      prismAngle: Math.random() * Math.PI,
      rotSpeed: 0.4 + Math.random() * 0.2,
    });
  }
}

function syncControlledPrisms(boss) {
  // Remove old boss-controlled prisms
  game.prisms = game.prisms.filter(p => !p._bossControlled);

  if (boss.phase !== 3 || boss.deathTimer > 0) return;

  // Add current controlled prisms as virtual prism objects
  for (const cp of boss.controlledPrisms) {
    const px = W / 2 + Math.cos(cp.angle) * cp.distance;
    const py = H / 2 + Math.sin(cp.angle) * cp.distance;
    game.prisms.push({
      x: px, y: py,
      w: cp.w, h: cp.h,
      angle: cp.prismAngle,
      type: 'static', splitCount: 2,
      hp: -1, maxHp: -1, flashTimer: 0, glowPhase: 0,
      rotSpeed: 0, segments: 1,
      originX: px, originY: py,
      moveVx: 0, moveVy: 0, moveRange: 0,
      _bossControlled: true,
    });
  }
}

// ---- Death sequence ----

function startDeathSequence(boss) {
  boss.deathTimer = boss.deathDuration;
  boss.invulnerable = true;
  game.bossDeathSequence = true;

  game.enemyBullets = game.enemyBullets.filter(eb => eb.bulletType !== 'boss' && eb.bulletType !== 'boss_wide');
  boss.clones = [];
  boss.controlledPrisms = [];
  game.prisms = game.prisms.filter(p => !p._bossControlled);

  playSound('boss_death');
}

function updateDeathSequence(boss, dt) {
  boss.deathTimer -= dt;
  const progress = 1 - boss.deathTimer / boss.deathDuration;

  // Staggered explosions
  if (Math.random() < 0.3 + progress * 0.5) {
    const ex = boss.x + (Math.random() - 0.5) * boss.size * 2;
    const ey = boss.y + (Math.random() - 0.5) * boss.size * 2;
    spawnParticles(ex, ey, BOSS_COLORS.body, 6);
    spawnParticles(ex, ey, '#ffffff', 3);
    if (Math.random() < 0.3) {
      game.screenShake = Math.max(game.screenShake, 0.1 + progress * 0.3);
    }
  }

  if (boss.deathTimer <= 0) {
    // Final explosion
    game.screenShake = 0.8;
    spawnParticles(boss.x, boss.y, BOSS_COLORS.body, 40);
    spawnParticles(boss.x, boss.y, '#ffffff', 20);
    spawnParticles(boss.x, boss.y, '#ffdd44', 16);

    game.score += 1000 * game.level;
    game.shots += 10;

    game.boss = null;
    game.bossDeathSequence = false;
  }
}

// ---- AI per phase ----

function updateMovement(boss, dt) {
  if (boss.stunTimer > 0 || boss.phaseTransitioning || boss.deathTimer > 0) return;
  if (boss.beamChargeTimer > 0) return; // Freeze during beam charge

  const speedMult = boss.phase === 3 ? 1.8 : boss.phase === 2 ? 1.3 : 1.0;
  boss.moveAngle += boss.moveSpeed * speedMult * dt;

  boss.x = W / 2 + Math.cos(boss.moveAngle) * boss.orbitRadiusX;
  boss.y = H / 2 + Math.sin(boss.moveAngle) * boss.orbitRadiusY;
  boss.x = Math.max(boss.size + 10, Math.min(W - boss.size - 10, boss.x));
  boss.y = Math.max(boss.size + 10, Math.min(H - boss.size - 10, boss.y));
}

function updatePhase1AI(boss, dt) {
  // Update shield prism orbits
  for (const sp of boss.shieldPrisms) {
    sp.angle += 0.8 * dt;
  }

  if (boss.stunTimer > 0) return;

  boss.attackTimer -= dt;
  if (boss.attackTimer <= 0) {
    const angle = Math.atan2(player.y - boss.y, player.x - boss.x);

    if (!boss.lastAttack || boss.lastAttack === 'wide') {
      // Triple shot
      const spread = 0.3;
      for (let i = -1; i <= 1; i++) {
        const a = angle + i * spread;
        game.enemyBullets.push({
          x: boss.x, y: boss.y,
          vx: Math.cos(a) * 2.5, vy: Math.sin(a) * 2.5,
          life: 200, lastPortal: null, bulletType: 'boss',
        });
      }
      playSound('boss_shoot');
      boss.lastAttack = 'triple';
      boss.attackTimer = 3.0;
    } else {
      // Slow wide bullet
      game.enemyBullets.push({
        x: boss.x, y: boss.y,
        vx: Math.cos(angle) * 1.5, vy: Math.sin(angle) * 1.5,
        life: 300, lastPortal: null, bulletType: 'boss_wide', damage: 2,
      });
      playSound('boss_shoot');
      boss.lastAttack = 'wide';
      boss.attackTimer = 5.0;
    }
  }
}

function updatePhase2AI(boss, dt) {
  updateClones(boss, dt);

  if (boss.stunTimer > 0) return;

  boss.attackTimer -= dt;
  if (boss.attackTimer <= 0) {
    boss.attackTimer = 2.0 + Math.random();
    const angle = Math.atan2(player.y - boss.y, player.x - boss.x);

    // 5-bullet spread
    const count = 5;
    const totalSpread = Math.PI * 0.6;
    for (let i = 0; i < count; i++) {
      const a = angle - totalSpread / 2 + (totalSpread / (count - 1)) * i;
      game.enemyBullets.push({
        x: boss.x, y: boss.y,
        vx: Math.cos(a) * 2.5, vy: Math.sin(a) * 2.5,
        life: 200, lastPortal: null, bulletType: 'boss',
      });
    }
    playSound('boss_shoot');
  }
}

function updatePhase3AI(boss, dt) {
  // Update controlled prism rotation
  for (const cp of boss.controlledPrisms) {
    cp.angle += cp.rotSpeed * dt;
    cp.prismAngle += dt * 0.3;
  }

  // Beam attack
  updateBeamAttack(boss, dt);

  if (boss.stunTimer > 0) return;

  boss.attackTimer -= dt;
  if (boss.attackTimer <= 0) {
    boss.attackTimer = 1.2 + Math.random() * 0.5;

    const roll = Math.random();
    if (roll < 0.3 && !boss.beamFiring && boss.beamChargeTimer <= 0) {
      // Beam attack
      boss.beamChargeTimer = 2.0;
      boss.beamAngle = Math.atan2(player.y - boss.y, player.x - boss.x);
      playSound('boss_beam_charge');
    } else if (roll < 0.6) {
      // Radial burst (8 bullets)
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 / 8) * i + boss.bodyAngle;
        game.enemyBullets.push({
          x: boss.x, y: boss.y,
          vx: Math.cos(a) * 3, vy: Math.sin(a) * 3,
          life: 180, lastPortal: null, bulletType: 'boss',
        });
      }
      playSound('boss_shoot');
    } else {
      // Aimed double shot
      const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
      for (let k = 0; k < 2; k++) {
        game.enemyBullets.push({
          x: boss.x, y: boss.y,
          vx: Math.cos(angle) * (3.5 + k * 0.5),
          vy: Math.sin(angle) * (3.5 + k * 0.5),
          life: 200, lastPortal: null, bulletType: 'boss',
        });
      }
      playSound('boss_shoot');
    }
  }
}

function updateBeamAttack(boss, dt) {
  if (boss.beamChargeTimer > 0) {
    boss.beamChargeTimer -= dt;
    // Slowly track player during charge
    const targetAngle = Math.atan2(player.y - boss.y, player.x - boss.x);
    let diff = targetAngle - boss.beamAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    boss.beamAngle += Math.sign(diff) * Math.min(Math.abs(diff), 0.5 * dt);

    if (boss.beamChargeTimer <= 0) {
      boss.beamFiring = true;
      boss.beamFireTimer = 0.8;
      playSound('boss_beam_fire');
    }
  }

  if (boss.beamFiring) {
    boss.beamFireTimer -= dt;

    // Check player in beam path
    const toPlayerAngle = Math.atan2(player.y - boss.y, player.x - boss.x);
    let angleDiff = toPlayerAngle - boss.beamAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    if (Math.abs(angleDiff) < 0.15 && player.invincibleTimer <= 0) {
      if (game.shieldActive) {
        game.shieldEnergy -= 40 * dt;
        spawnParticles(player.x, player.y, BOSS_COLORS.beam, 4);
        if (game.shieldEnergy <= 0) {
          game.shieldEnergy = 0;
          game.shieldActive = false;
          game.shieldCooldown = true;
        }
      } else {
        damagePlayer('\u88AB\u955C\u50CF\u5B88\u536B\u7684\u5149\u675F\u51FB\u6740\u4E86!', 2);
      }
    }

    if (boss.beamFireTimer <= 0) {
      boss.beamFiring = false;
    }
  }
}

// ---- Main update ----

export function updateBoss(dt) {
  const boss = game.boss;
  if (!boss) return;

  // Sync controlled prisms to game.prisms for collision
  syncControlledPrisms(boss);

  // Visual timers
  boss.bobPhase += dt * 2;
  boss.glowPhase += dt * 3;
  boss.bodyAngle += dt * 0.5;
  if (boss.damageFlashTimer > 0) boss.damageFlashTimer -= dt;
  if (boss.stunTimer > 0) boss.stunTimer -= dt;

  // Death sequence
  if (boss.deathTimer > 0) {
    updateDeathSequence(boss, dt);
    return;
  }

  // Phase transition
  if (boss.phaseTransitioning) {
    updatePhaseTransition(boss, dt);
    return;
  }

  // Movement
  updateMovement(boss, dt);

  // Phase AI
  if (boss.phase === 1) updatePhase1AI(boss, dt);
  else if (boss.phase === 2) updatePhase2AI(boss, dt);
  else if (boss.phase === 3) updatePhase3AI(boss, dt);
}

// ---- Rendering ----

export function drawBoss() {
  const boss = game.boss;
  if (!boss) return;

  // Draw phase-specific elements first (behind boss body)
  if (boss.phase === 1) drawShieldPrisms(boss);
  if (boss.phase === 2) {
    for (const c of boss.clones) {
      if (c.hp > 0) drawClone(c);
    }
  }
  if (boss.phase === 3) {
    drawControlledPrisms(boss);
    drawBeam(boss);
  }

  // Death sequence rendering
  if (boss.deathTimer > 0) {
    drawDeathEffect(boss);
    drawBossHpBar(boss);
    return;
  }

  // Boss body
  drawBossBody(boss);

  // HP bar (always on top)
  drawBossHpBar(boss);
}

function drawBossBody(boss) {
  const bob = Math.sin(boss.bobPhase) * 3;
  const x = boss.x, y = boss.y + bob;
  const s = boss.size;

  ctx.save();

  // Stun flicker
  if (boss.stunTimer > 0 && Math.floor(boss.stunTimer * 10) % 2 === 0) {
    ctx.globalAlpha = 0.4;
  }

  // Phase transition glow
  if (boss.phaseTransitioning) {
    const prog = 1 - boss.phaseTransitionTimer / 2.0;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 20 + prog * 30;
  } else {
    ctx.shadowColor = BOSS_COLORS.glow;
    ctx.shadowBlur = 15 + Math.sin(boss.glowPhase) * 5;
  }

  if (boss.damageFlashTimer > 0) {
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 25;
  }

  // Diamond body
  ctx.translate(x, y);
  ctx.rotate(boss.bodyAngle);

  const fillColor = boss.damageFlashTimer > 0 ? '#ffffff' : BOSS_COLORS.bodyDark;
  ctx.fillStyle = fillColor;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(s * 0.7, 0);
  ctx.lineTo(0, s);
  ctx.lineTo(-s * 0.7, 0);
  ctx.closePath();
  ctx.fill();

  // Inner diamond
  const innerFill = boss.damageFlashTimer > 0 ? '#ffffff' : BOSS_COLORS.body;
  ctx.fillStyle = innerFill;
  ctx.beginPath();
  ctx.moveTo(0, -s + 6);
  ctx.lineTo(s * 0.7 - 6, 0);
  ctx.lineTo(0, s - 6);
  ctx.lineTo(-s * 0.7 + 6, 0);
  ctx.closePath();
  ctx.fill();

  // Core eye - pulsing
  const phaseColor = boss.phase === 3 ? BOSS_COLORS.phase3 :
                     boss.phase === 2 ? BOSS_COLORS.phase2 :
                     BOSS_COLORS.phase1;
  const coreR = 6 + Math.sin(boss.glowPhase * 2) * 2;
  ctx.beginPath();
  ctx.arc(0, 0, coreR, 0, Math.PI * 2);
  ctx.fillStyle = phaseColor;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, coreR * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Facet lines
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const a = (Math.PI / 2) * i + boss.bodyAngle * 0.3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * s * 0.6, Math.sin(a) * s * 0.6);
    ctx.stroke();
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.restore();

  // White particle trail for real boss (visual distinction from clones)
  if (boss.phase === 2 && Math.random() < 0.3) {
    spawnParticles(boss.x, boss.y, '#ffffff', 1);
  }
}

function drawShieldPrisms(boss) {
  for (const sp of boss.shieldPrisms) {
    const px = boss.x + Math.cos(sp.angle) * sp.distance;
    const py = boss.y + Math.sin(sp.angle) * sp.distance;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(sp.angle + boss.bodyAngle);

    ctx.shadowColor = BOSS_COLORS.shield;
    ctx.shadowBlur = 8;

    const hw = sp.w / 2, hh = sp.h / 2;
    ctx.fillStyle = BOSS_COLORS.bodyDark;
    ctx.fillRect(-hw, -hh, sp.w, sp.h);
    ctx.fillStyle = BOSS_COLORS.shield;
    ctx.fillRect(-hw + 2, -hh + 2, sp.w - 4, sp.h - 4);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(-hw + 4, -1, sp.w - 8, 2);

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

function drawClone(clone) {
  const bob = Math.sin(clone.bobPhase) * 2;
  const x = clone.x, y = clone.y + bob;

  ctx.save();
  const shimmer = 0.45 + Math.sin(Date.now() / 200 + clone.moveAngle) * 0.1;
  ctx.globalAlpha = clone.flashTimer > 0 ? 1 : shimmer;

  ctx.shadowColor = BOSS_COLORS.glow;
  ctx.shadowBlur = 8;

  ctx.translate(x, y);
  ctx.rotate(clone.bodyAngle);

  const s = clone.size;
  ctx.fillStyle = clone.flashTimer > 0 ? '#ffffff' : BOSS_COLORS.bodyDark;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(s * 0.7, 0);
  ctx.lineTo(0, s);
  ctx.lineTo(-s * 0.7, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = clone.flashTimer > 0 ? '#ffffff' : BOSS_COLORS.body;
  ctx.beginPath();
  ctx.moveTo(0, -s + 4);
  ctx.lineTo(s * 0.7 - 4, 0);
  ctx.lineTo(0, s - 4);
  ctx.lineTo(-s * 0.7 + 4, 0);
  ctx.closePath();
  ctx.fill();

  // Dim static core (no pulse — distinguishing feature)
  ctx.fillStyle = '#555555';
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.restore();

  // HP bar
  if (clone.maxHp > 1) {
    const bw = 20, ratio = clone.hp / clone.maxHp;
    ctx.fillStyle = '#330033';
    ctx.fillRect(clone.x - bw / 2, clone.y - clone.size - 10 + bob, bw, 3);
    ctx.fillStyle = '#cc88ff';
    ctx.fillRect(clone.x - bw / 2, clone.y - clone.size - 10 + bob, bw * ratio, 3);
  }
}

function drawControlledPrisms(boss) {
  for (const cp of boss.controlledPrisms) {
    const px = W / 2 + Math.cos(cp.angle) * cp.distance;
    const py = H / 2 + Math.sin(cp.angle) * cp.distance;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(cp.prismAngle);

    ctx.shadowColor = BOSS_COLORS.glow;
    ctx.shadowBlur = 8;

    const hw = cp.w / 2, hh = cp.h / 2;
    ctx.fillStyle = BOSS_COLORS.bodyDark;
    ctx.fillRect(-hw, -hh, cp.w, cp.h);
    ctx.fillStyle = BOSS_COLORS.body;
    ctx.fillRect(-hw + 2, -hh + 2, cp.w - 4, cp.h - 4);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(-hw + 4, -1, cp.w - 8, 2);

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

function drawBeam(boss) {
  const len = Math.hypot(W, H);

  if (boss.beamChargeTimer > 0) {
    const chargeProg = 1 - boss.beamChargeTimer / 2.0;
    ctx.save();
    ctx.strokeStyle = BOSS_COLORS.beam;
    ctx.lineWidth = 1 + chargeProg * 2;
    ctx.setLineDash([4, 4]);
    ctx.globalAlpha = 0.3 + chargeProg * 0.4;
    ctx.shadowColor = BOSS_COLORS.beamGlow;
    ctx.shadowBlur = 5 + chargeProg * 15;

    ctx.beginPath();
    ctx.moveTo(boss.x, boss.y);
    ctx.lineTo(boss.x + Math.cos(boss.beamAngle) * len,
               boss.y + Math.sin(boss.beamAngle) * len);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();

    // Warning pulse at core
    const pulse = Math.sin(Date.now() / (80 / (1 + chargeProg))) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(255,68,255,${pulse * 0.5})`;
    ctx.beginPath();
    ctx.arc(boss.x, boss.y, boss.size * (0.8 + chargeProg * 0.3), 0, Math.PI * 2);
    ctx.fill();
  }

  if (boss.beamFiring) {
    const fireProg = 1 - boss.beamFireTimer / 0.8;
    const beamWidth = 12 * (1 - fireProg * 0.5);

    ctx.save();
    // Outer glow
    ctx.strokeStyle = 'rgba(255,68,255,0.3)';
    ctx.lineWidth = beamWidth * 3;
    ctx.shadowColor = BOSS_COLORS.beamGlow;
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.moveTo(boss.x, boss.y);
    ctx.lineTo(boss.x + Math.cos(boss.beamAngle) * len,
               boss.y + Math.sin(boss.beamAngle) * len);
    ctx.stroke();

    // Main beam
    ctx.strokeStyle = BOSS_COLORS.beam;
    ctx.lineWidth = beamWidth;
    ctx.stroke();

    // White core
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = beamWidth * 0.3;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

function drawDeathEffect(boss) {
  const progress = 1 - boss.deathTimer / boss.deathDuration;

  ctx.save();
  ctx.globalAlpha = 1 - progress * 0.7;

  // White flash pulses
  if (Math.sin(Date.now() / 50) > 0) {
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 30 + progress * 40;
    ctx.beginPath();
    ctx.arc(boss.x, boss.y, boss.size * (1 + progress * 0.3), 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Expanding ring
  ctx.strokeStyle = `rgba(204,102,255,${1 - progress})`;
  ctx.lineWidth = 2 + progress * 4;
  ctx.beginPath();
  ctx.arc(boss.x, boss.y, boss.size + progress * 100, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawBossHpBar(boss) {
  if (boss.deathTimer > 0 && boss.deathTimer < 0.5) return; // Hide near end of death

  const barW = 200, barH = 8;
  const bx = (W - barW) / 2;
  const by = 16;

  // Background
  ctx.fillStyle = BOSS_COLORS.hpBarBg;
  ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);

  // HP fill
  const ratio = Math.max(0, boss.hp / boss.maxHp);
  const fillColor = boss.phase === 3 ? BOSS_COLORS.phase3 :
                    boss.phase === 2 ? BOSS_COLORS.phase2 :
                    BOSS_COLORS.phase1;
  ctx.fillStyle = fillColor;
  ctx.fillRect(bx, by, barW * ratio, barH);

  // Glow
  ctx.shadowColor = fillColor;
  ctx.shadowBlur = 8;
  ctx.fillRect(bx, by, barW * ratio, barH);
  ctx.shadowBlur = 0;

  // Phase divider lines
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(bx + barW * (20 / 30), by, 2, barH);
  ctx.fillRect(bx + barW * (10 / 30), by, 2, barH);

  // Boss name
  ctx.font = '8px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.fillStyle = BOSS_COLORS.body;
  ctx.shadowColor = BOSS_COLORS.glow;
  ctx.shadowBlur = 6;
  ctx.fillText(boss.name, W / 2, by - 4);
  ctx.shadowBlur = 0;

  // Phase dots
  for (let i = 0; i < 3; i++) {
    const dotX = W / 2 - 12 + i * 12;
    const dotY = by + barH + 6;
    ctx.fillStyle = i < boss.phase ? fillColor : '#222222';
    ctx.beginPath();
    ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Status text
  if (boss.stunTimer > 0) {
    ctx.font = '10px "Press Start 2P"';
    ctx.fillStyle = '#ffdd44';
    ctx.shadowColor = '#ffdd44';
    ctx.shadowBlur = 10;
    ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 100) * 0.5;
    ctx.fillText('STUNNED', W / 2, by + barH + 20);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  if (boss.phaseTransitioning) {
    ctx.font = '10px "Press Start 2P"';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 12;
    ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 80) * 0.5;
    ctx.fillText('\u76F8\u53D8\u4E2D...', W / 2, by + barH + 20);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  ctx.textAlign = 'left'; // Reset
}

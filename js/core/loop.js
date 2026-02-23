/**
 * loop.js - Main game loop (update + draw)
 */
import { ctx } from './render.js';
import { W, H, COLORS } from './constants.js';
import { game, player } from './state.js';
import { drawBackground } from './render.js';
import { drawPlayer } from '../entities/player.js';
import { drawShield } from '../systems/shield.js';
import { drawEnemy, updateEnemyAI } from '../entities/enemies.js';
import { updateBullets, drawBullet, updateChainLightnings, drawChainLightnings } from '../entities/bullets.js';
import { updateEnemyBullets, drawEnemyBullet } from '../entities/enemyBullets.js';
import { updateParticles, drawParticles } from '../systems/particles.js';
import { updatePrisms, drawPrism, updatePickups, drawPickup } from '../objects/prism.js';
import { updatePortals, drawPortal } from '../objects/portals.js';
import { updateBarrels, drawBarrel } from '../objects/barrels.js';
import { updateApples, drawApple } from '../objects/apples.js';
import { updateGravityWells, drawGravityWell } from '../objects/gravityWells.js';
import { updateAmplifiers, drawAmplifier } from '../objects/amplifiers.js';
import { updateStartDemo, drawStartDemo } from '../ui/startDemo.js';
import { showGameOver, showLevelClear, updateUI } from '../ui/screens.js';
import { updateTutorial, drawTutorialOverlay } from '../systems/tutorial.js';

let lastTime = 0;

export function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  // Skip game loop when editor is active
  if (game.editorActive) {
    requestAnimationFrame(gameLoop);
    return;
  }

  if (!game.running && !game.paused) {
    updateStartDemo(dt);
    drawStartDemo();
  }

  if (game.running) {
    game.gunAngle = Math.atan2(game.mouseY - player.y, game.mouseX - player.x);

    if (player.invincibleTimer > 0) {
      player.invincibleTimer -= dt;
    }

    // Shield energy management
    if (game.shieldActive) {
      game.shieldEnergy -= 25 * game.shieldDrainMult * dt;
      if (game.shieldEnergy <= 0) {
        game.shieldEnergy = 0;
        game.shieldActive = false;
        game.shieldCooldown = true;
      }
    } else {
      game.shieldEnergy = Math.min(
        game.shieldMaxEnergy,
        game.shieldEnergy + game.shieldRegenRate * dt
      );
      if (game.shieldCooldown && game.shieldEnergy >= 20) {
        game.shieldCooldown = false;
      }
    }

    // Update enemies
    game.enemies.forEach(e => {
      e.bobPhase += dt * 2;
      if (e.flashTimer > 0) e.flashTimer -= dt;
      updateEnemyAI(e, dt);
    });

    updatePrisms(dt);
    updatePortals(dt);
    updatePickups(dt);
    updateApples(dt);
    updateGravityWells(dt);
    updateAmplifiers(dt);
    updateBullets(dt);
    updateEnemyBullets(dt);
    updateBarrels(dt);
    updateChainLightnings(dt);
    updateParticles(dt);

    if (game.screenShake > 0) {
      game.screenShake -= dt;
    }

    // 二次生命特效更新
    if (game.secondLifeRing) {
      const r = game.secondLifeRing;
      r.life -= dt;
      r.radius = r.maxRadius * (1 - r.life / r.maxLife);
      if (r.life <= 0) game.secondLifeRing = null;
    }
    if (game.secondLifeFlash > 0) {
      game.secondLifeFlash -= dt * 1.2;
      if (game.secondLifeFlash < 0) game.secondLifeFlash = 0;
    }

    if (game.tutorialActive) {
      updateTutorial(dt);
    }

    if (game.enemies.length === 0 && game.playerAlive && !game.tutorialActive) {
      showLevelClear();
    }

    if (game.shots <= 0 && game.bullets.length === 0 && game.enemies.length > 0 && game.playerAlive && !game.tutorialActive) {
      showGameOver('\u5F39\u836F\u8017\u5C3D!');
    }
  }

  // ---- Draw ----
  ctx.save();
  if (game.screenShake > 0) {
    ctx.translate(
      (Math.random() - 0.5) * game.screenShake * 12,
      (Math.random() - 0.5) * game.screenShake * 12
    );
  }

  drawBackground();

  game.portals.forEach(p => drawPortal(p));
  game.gravityWells.forEach(gw => drawGravityWell(gw));
  game.prisms.forEach(p => drawPrism(p));
  game.barrels.forEach(b => drawBarrel(b));
  game.amplifiers.forEach(a => drawAmplifier(a));
  game.pickups.forEach(pk => drawPickup(pk));
  game.apples.forEach(a => drawApple(a));
  game.enemies.forEach(e => drawEnemy(e));
  game.enemyBullets.forEach(eb => drawEnemyBullet(eb));
  game.bullets.forEach(b => drawBullet(b));
  drawChainLightnings();

  if (game.playerAlive) drawPlayer();
  if (game.playerAlive && game.shieldActive) drawShield();

  drawParticles();

  // 二次生命触发特效：扩散冲击波环
  if (game.secondLifeRing) {
    const r = game.secondLifeRing;
    const alpha = r.life / r.maxLife;
    ctx.save();
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,221,68,${alpha * 0.8})`;
    ctx.lineWidth = 3 + alpha * 3;
    ctx.shadowColor = '#ffdd44';
    ctx.shadowBlur = 20 * alpha;
    ctx.stroke();
    // 内圈
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius * 0.6, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.5})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // 二次生命触发文字："二次生命!"
  if (game.secondLifeFlash > 0) {
    ctx.save();
    ctx.font = '14px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.globalAlpha = Math.min(game.secondLifeFlash, 1);
    ctx.shadowColor = '#ffdd44';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#ffdd44';
    ctx.fillText('\u4E8C\u6B21\u751F\u547D!', W / 2, H / 2 - 40);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Low ammo warning
  if (game.shots <= 2 && game.shots > 0 && game.running) {
    ctx.fillStyle = COLORS.warning;
    ctx.font = '10px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 200) * 0.5;
    ctx.fillText('\u5F39\u836F\u4E0D\u8DB3!', W / 2, H - 30);
    ctx.globalAlpha = 1;
  }

  if (game.tutorialActive) drawTutorialOverlay();

  ctx.restore();
  updateUI();
  requestAnimationFrame(gameLoop);
}

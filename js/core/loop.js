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
import { updateBullets, drawBullet } from '../entities/bullets.js';
import { updateEnemyBullets, drawEnemyBullet } from '../entities/enemyBullets.js';
import { updateParticles, drawParticles } from '../systems/particles.js';
import { updatePrisms, drawPrism, updatePickups, drawPickup } from '../objects/prism.js';
import { updatePortals, drawPortal } from '../objects/portals.js';
import { updateBarrels, drawBarrel } from '../objects/barrels.js';
import { updateApples, drawApple } from '../objects/apples.js';
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
      game.shieldEnergy -= 25 * dt;
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
    updateBullets(dt);
    updateEnemyBullets(dt);
    updateBarrels(dt);
    updateParticles(dt);

    if (game.screenShake > 0) {
      game.screenShake -= dt;
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
  game.prisms.forEach(p => drawPrism(p));
  game.barrels.forEach(b => drawBarrel(b));
  game.pickups.forEach(pk => drawPickup(pk));
  game.apples.forEach(a => drawApple(a));
  game.enemies.forEach(e => drawEnemy(e));
  game.enemyBullets.forEach(eb => drawEnemyBullet(eb));
  game.bullets.forEach(b => drawBullet(b));

  if (game.playerAlive) drawPlayer();
  if (game.playerAlive && game.shieldActive) drawShield();

  drawParticles();

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

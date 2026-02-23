import { game, player } from '../core/state.js';
import { COLORS } from '../core/constants.js';
import { spawnParticles } from './particles.js';
import { showGameOver } from '../ui/screens.js';

export function damagePlayer(reason){game.playerHp--;game.screenShake=0.3;spawnParticles(player.x,player.y,COLORS.player,12);if(game.playerHp<=0){game.playerAlive=false;game.screenShake=0.5;spawnParticles(player.x,player.y,COLORS.player,24);showGameOver(reason);return true;}player.invincibleTimer=1.5;return false;}

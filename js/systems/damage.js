import { game, player } from '../core/state.js';
import { COLORS } from '../core/constants.js';
import { spawnParticles } from './particles.js';
import { showGameOver } from '../ui/screens.js';

export function damagePlayer(reason,dmg){game.playerHp-=(dmg||1);game.screenShake=0.3;spawnParticles(player.x,player.y,COLORS.player,12);if(game.playerHp<=0){if(game.secondLife&&!game.secondLifeUsed){game.secondLifeUsed=true;game.playerHp=1;player.invincibleTimer=2.5;game.screenShake=0.6;spawnParticles(player.x,player.y,'#ffdd44',24);spawnParticles(player.x,player.y,'#ffffff',12);spawnParticles(player.x,player.y,'#ffaa00',16);game.secondLifeRing={x:player.x,y:player.y,radius:0,maxRadius:120,life:0.8,maxLife:0.8};game.secondLifeFlash=1.0;return false;}game.playerAlive=false;game.screenShake=0.5;spawnParticles(player.x,player.y,COLORS.player,24);showGameOver(reason);return true;}player.invincibleTimer=1.5;return false;}

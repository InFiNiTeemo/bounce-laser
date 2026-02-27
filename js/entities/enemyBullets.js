import { ctx, drawPixelCircle } from '../core/render.js';
import { W, H, COLORS, SHIELD_RADIUS } from '../core/constants.js';
import { game, player } from '../core/state.js';
import { spawnParticles } from '../systems/particles.js';
import { damagePlayer } from '../systems/damage.js';
import { checkBulletPortalCollision } from '../objects/portals.js';
import { applyGravityToVelocity } from '../objects/gravityWells.js';
import { checkBulletAmplifier } from '../objects/amplifiers.js';
import { playSound } from '../systems/audio.js';
import { queryNearby } from '../systems/spatialGrid.js';

const SHIELD_R2 = SHIELD_RADIUS * SHIELD_RADIUS;

export function updateEnemyBullets(dt){for(let i=game.enemyBullets.length-1;i>=0;i--){const eb=game.enemyBullets[i];eb.x+=eb.vx;eb.y+=eb.vy;eb.life--;if(eb.x<-10||eb.x>W+10||eb.y<-10||eb.y>H+10||eb.life<=0){game.enemyBullets.splice(i,1);continue;}applyGravityToVelocity(eb);checkBulletAmplifier(eb);checkBulletPortalCollision(eb);const ampMult=eb.amplified?1.5:1;
const sdx=eb.x-player.x,sdy=eb.y-player.y,sd2=sdx*sdx+sdy*sdy;
if(game.shieldActive&&sd2<SHIELD_R2){spawnParticles(eb.x,eb.y,COLORS.shield,6);playSound('shield_reflect');game.shieldEnergy=Math.max(0,game.shieldEnergy-Math.round(5*game.shieldDrainMult*ampMult));if(game.shieldCounter){const sp=5,nx=-eb.vx,ny=-eb.vy,len=Math.hypot(nx,ny)||1;game.bullets.push({x:eb.x,y:eb.y,vx:nx/len*sp,vy:ny/len*sp,bounces:1,maxBounces:game.maxBounces,life:180,trail:[],piercing:false,piercingUsed:false,fromPrism:false,shieldReflected:true,lastPortal:null});spawnParticles(eb.x,eb.y,'#00eeff',8);}game.enemyBullets.splice(i,1);game.score+=10;continue;}
const pr=player.size+3;if(player.invincibleTimer<=0&&sd2<pr*pr){const ebDmg=(eb.damage||1)+(eb.ampDmg||0);game.enemyBullets.splice(i,1);if(damagePlayer('\u88AB\u654C\u4EBA\u7684\u5B50\u5F39\u51FB\u6740\u4E86!',ebDmg))return;continue;}
// Spatial grid: enemy bullet vs player bullets
const nearby=queryNearby(eb.x,eb.y);for(let ni=0;ni<nearby.length;ni++){const pb=nearby[ni];if(pb._gt!==4)continue;const dx=eb.x-pb.x,dy=eb.y-pb.y;if(dx*dx+dy*dy<64){spawnParticles(eb.x,eb.y,COLORS.warning,6);const ebHp=eb.hp||1,pbHp=pb.counterHp||1;eb.hp=ebHp-pbHp;pb.counterHp=pbHp-ebHp;if(pb.counterHp<=0){const pi=game.bullets.indexOf(pb);if(pi!==-1)game.bullets.splice(pi,1);}if(eb.hp<=0){game.enemyBullets.splice(i,1);game.score+=25;if(game.tutorialActive)game.tutorialBulletCounters++;}else{spawnParticles(eb.x,eb.y,'#ffaa44',4);}break;}}}}

export function drawEnemyBullet(eb){
if(eb.bulletType==='boss'){
ctx.shadowColor='#cc66ff';ctx.shadowBlur=12;drawPixelCircle(eb.x,eb.y,5,'#8833cc');drawPixelCircle(eb.x,eb.y,3,'#cc66ff');drawPixelCircle(eb.x,eb.y,1.5,'#ffffff');ctx.shadowBlur=0;
}else if(eb.bulletType==='boss_wide'){
ctx.shadowColor='#ff44ff';ctx.shadowBlur=15;drawPixelCircle(eb.x,eb.y,7,'#8833cc');drawPixelCircle(eb.x,eb.y,5,'#ff44ff');drawPixelCircle(eb.x,eb.y,2,'#ffffff');ctx.shadowBlur=0;
}else if(eb.bulletType==='tank'){
ctx.shadowColor='#aa44ff';ctx.shadowBlur=10;drawPixelCircle(eb.x,eb.y,5,'#6622cc');drawPixelCircle(eb.x,eb.y,3,'#aa44ff');drawPixelCircle(eb.x,eb.y,1.5,'#ffffff');ctx.shadowBlur=0;
}else if(eb.bulletType==='sniper'){
const a=Math.atan2(eb.vy,eb.vx);ctx.save();ctx.translate(eb.x,eb.y);ctx.rotate(a);ctx.shadowColor='#ffcc00';ctx.shadowBlur=8;ctx.fillStyle='#ffcc00';ctx.fillRect(-6,-1.5,12,3);ctx.fillStyle='#ffffff';ctx.fillRect(-3,-1,6,2);ctx.shadowBlur=0;ctx.restore();
}else if(eb.bulletType==='ghost'){
ctx.globalAlpha=0.7;ctx.shadowColor='#44ddcc';ctx.shadowBlur=10;drawPixelCircle(eb.x,eb.y,4,'#228877');drawPixelCircle(eb.x,eb.y,2,'#44ddcc');ctx.shadowBlur=0;ctx.globalAlpha=1;
}else{
ctx.shadowColor=COLORS.enemyBullet;ctx.shadowBlur=10;drawPixelCircle(eb.x,eb.y,5,COLORS.enemyBullet);drawPixelCircle(eb.x,eb.y,2.5,'#ffffff');ctx.shadowBlur=0;
}}

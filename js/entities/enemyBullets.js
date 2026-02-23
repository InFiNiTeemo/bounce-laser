import { ctx, drawPixelCircle } from '../core/render.js';
import { W, H, COLORS, SHIELD_RADIUS } from '../core/constants.js';
import { game, player } from '../core/state.js';
import { spawnParticles } from '../systems/particles.js';
import { damagePlayer } from '../systems/damage.js';
import { checkBulletPortalCollision } from '../objects/portals.js';
import { applyGravityToVelocity } from '../objects/gravityWells.js';
import { checkBulletAmplifier } from '../objects/amplifiers.js';

export function updateEnemyBullets(dt){for(let i=game.enemyBullets.length-1;i>=0;i--){const eb=game.enemyBullets[i];eb.x+=eb.vx;eb.y+=eb.vy;eb.life--;if(eb.x<-10||eb.x>W+10||eb.y<-10||eb.y>H+10||eb.life<=0){game.enemyBullets.splice(i,1);continue;}applyGravityToVelocity(eb);checkBulletAmplifier(eb);checkBulletPortalCollision(eb);const ampMult=eb.amplified?1.5:1;if(game.shieldActive&&Math.hypot(eb.x-player.x,eb.y-player.y)<SHIELD_RADIUS){spawnParticles(eb.x,eb.y,COLORS.shield,6);game.shieldEnergy=Math.max(0,game.shieldEnergy-Math.round(5*game.shieldDrainMult*ampMult));if(game.shieldCounter){const sp=5,nx=-eb.vx,ny=-eb.vy,len=Math.hypot(nx,ny)||1;game.bullets.push({x:eb.x,y:eb.y,vx:nx/len*sp,vy:ny/len*sp,bounces:1,maxBounces:game.maxBounces,life:180,trail:[],piercing:false,piercingUsed:false,fromPrism:false,shieldReflected:true,lastPortal:null});spawnParticles(eb.x,eb.y,'#00eeff',8);}game.enemyBullets.splice(i,1);game.score+=10;continue;}if(player.invincibleTimer<=0&&Math.hypot(eb.x-player.x,eb.y-player.y)<player.size+3){const ebDmg=(eb.damage||1)+(eb.ampDmg||0);game.enemyBullets.splice(i,1);if(damagePlayer('\u88AB\u654C\u4EBA\u7684\u5B50\u5F39\u51FB\u6740\u4E86!',ebDmg))return;continue;}for(let j=game.bullets.length-1;j>=0;j--){const pb=game.bullets[j];if(Math.hypot(eb.x-pb.x,eb.y-pb.y)<8){spawnParticles(eb.x,eb.y,COLORS.warning,6);const ebHp=eb.hp||1,pbHp=pb.counterHp||1;eb.hp=ebHp-pbHp;pb.counterHp=pbHp-ebHp;if(pb.counterHp<=0)game.bullets.splice(j,1);if(eb.hp<=0){game.enemyBullets.splice(i,1);game.score+=25;if(game.tutorialActive)game.tutorialBulletCounters++;}else{spawnParticles(eb.x,eb.y,'#ffaa44',4);}break;}}}}

export function drawEnemyBullet(eb){
if(eb.bulletType==='tank'){
ctx.shadowColor='#aa44ff';ctx.shadowBlur=10;drawPixelCircle(eb.x,eb.y,5,'#6622cc');drawPixelCircle(eb.x,eb.y,3,'#aa44ff');drawPixelCircle(eb.x,eb.y,1.5,'#ffffff');ctx.shadowBlur=0;
}else if(eb.bulletType==='sniper'){
const a=Math.atan2(eb.vy,eb.vx);ctx.save();ctx.translate(eb.x,eb.y);ctx.rotate(a);ctx.shadowColor='#ffcc00';ctx.shadowBlur=8;ctx.fillStyle='#ffcc00';ctx.fillRect(-6,-1.5,12,3);ctx.fillStyle='#ffffff';ctx.fillRect(-3,-1,6,2);ctx.shadowBlur=0;ctx.restore();
}else if(eb.bulletType==='ghost'){
ctx.globalAlpha=0.7;ctx.shadowColor='#44ddcc';ctx.shadowBlur=10;drawPixelCircle(eb.x,eb.y,4,'#228877');drawPixelCircle(eb.x,eb.y,2,'#44ddcc');ctx.shadowBlur=0;ctx.globalAlpha=1;
}else{
ctx.shadowColor=COLORS.enemyBullet;ctx.shadowBlur=10;drawPixelCircle(eb.x,eb.y,5,COLORS.enemyBullet);drawPixelCircle(eb.x,eb.y,2.5,'#ffffff');ctx.shadowBlur=0;
}}

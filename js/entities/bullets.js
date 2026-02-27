import { ctx, drawPixelCircle } from '../core/render.js';
import { W, H, COLORS, SHIELD_RADIUS } from '../core/constants.js';
import { game, player } from '../core/state.js';
import { spawnParticles } from '../systems/particles.js';
import { damagePlayer } from '../systems/damage.js';
import { checkBulletPrismCollisions } from '../objects/prism.js';
import { checkBulletPortalCollision } from '../objects/portals.js';
import { explodeBarrel } from '../objects/barrels.js';
import { applyGravityToVelocity, damageGravityWell } from '../objects/gravityWells.js';
import { checkBulletAmplifier } from '../objects/amplifiers.js';
import { checkBulletWallCollisions } from '../objects/walls.js';
import { playSound } from '../systems/audio.js';
import { registerKill } from '../systems/combo.js';
import { queryNearby } from '../systems/spatialGrid.js';
import { damageBoss, isBossAlive } from './boss.js';

const explosionRings = [];

function makeBullet(x,y,vx,vy,ip,crit){
return{x,y,vx,vy,bounces:0,maxBounces:game.maxBounces,life:Math.round(300*(1+game.bulletLifeBonus)),trail:[],piercing:ip,piercingUsed:false,fromPrism:false,shieldReflected:false,lastPortal:null,portalGrace:0,crit:crit||false,counterHp:game.heavyBullets?2:1,amplified:false,ampDmg:0};}

export function fireBullet(){if(game.shots<=0)return;
const speed=6,gx=player.x+Math.cos(game.gunAngle)*player.gunLength,gy=player.y+Math.sin(game.gunAngle)*player.gunLength;
if(game.ammoRecoveryChance>0&&Math.random()<game.ammoRecoveryChance){spawnParticles(gx,gy,'#00ff88',4);}else{game.shots-=game.bulletDamage;}
const ip=game.piercingCount>0;if(ip)game.piercingCount--;
const count=game.scatterLevel+1;
const spread=game.scatterLevel*0.28;
for(let k=0;k<count;k++){
let a;
if(count===1){a=game.gunAngle;}
else{a=game.gunAngle-spread/2+(spread*k/(count-1));}
const crit=game.critChance>0&&Math.random()<game.critChance;
game.bullets.push(makeBullet(gx,gy,Math.cos(a)*speed,Math.sin(a)*speed,ip,crit));}
if(count>1)spawnParticles(gx,gy,'#44ffcc',count*3);
playSound('shoot');}

/** Helper: award kill rewards for an enemy */
function killEnemy(e,bounces,shieldReflected){
playSound('enemy_death');
spawnParticles(e.x,e.y,'#ffcc44',16);
if(game.playerHp<game.playerMaxHp&&Math.random()<0.25){game.apples.push({x:e.x,y:e.y,size:8,bobPhase:0});}
const idx=game.enemies.indexOf(e);
if(idx!==-1)game.enemies.splice(idx,1);
game.killedEnemies++;
if(bounces>0)game.bounceKills++;
if(shieldReflected)game.shieldReflectKills++;
game.shots+=e.maxHp+game.ammoRecoveryBonus;
const baseScore=(e.type==='tank'?200:100)*game.level;
game.score+=baseScore;
registerKill(e.x,e.y,baseScore);
const shakeBoost=game.combo>=8?2.0:game.combo>=5?1.5:1.0;
game.screenShake=Math.max(game.screenShake,0.2*shakeBoost);
triggerChainLightning(e);}

/** Chain lightning on enemy kill */
function triggerChainLightning(deadEnemy){
if(game.chainLevel<=0)return;
const probs=[0,0.40,0.60,0.80];
const ranges=[0,80,100,130];
const prob=probs[game.chainLevel];
const range=ranges[game.chainLevel];
if(Math.random()>=prob)return;
// 触发时始终显示起点放电效果
spawnParticles(deadEnemy.x,deadEnemy.y,'#aaccff',12);
spawnParticles(deadEnemy.x,deadEnemy.y,'#ffffff',6);
game.screenShake=Math.max(game.screenShake,0.1);
const target=findNearestEnemy(deadEnemy.x,deadEnemy.y,range);
if(!target){
  // 无目标：向随机方向发射3条短电弧（纯视觉）
  for(let k=0;k<3;k++){
    const a=Math.random()*Math.PI*2,dist=40+Math.random()*50;
    game.chainLightnings.push({x1:deadEnemy.x,y1:deadEnemy.y,
      x2:deadEnemy.x+Math.cos(a)*dist,y2:deadEnemy.y+Math.sin(a)*dist,
      life:0.35,maxLife:0.35,fizzle:true});
  }
  return;
}
const dmg=game.bulletDamage;
target.hp-=dmg;target.flashTimer=0.15;
spawnParticles(target.x,target.y,'#aaccff',14);
spawnParticles(target.x,target.y,'#ffffff',6);
game.chainLightnings.push({x1:deadEnemy.x,y1:deadEnemy.y,x2:target.x,y2:target.y,life:0.5,maxLife:0.5});
game.screenShake=Math.max(game.screenShake,0.15);
playSound('chain_lightning');
if(target.hp<=0){
killEnemy(target,0,false);
// Level 3: 30% chance secondary chain
if(game.chainLevel>=3&&Math.random()<0.30){
const t2=findNearestEnemy(target.x,target.y,range);
if(t2){t2.hp-=dmg;t2.flashTimer=0.15;spawnParticles(t2.x,t2.y,'#aaccff',12);spawnParticles(t2.x,t2.y,'#ffffff',4);
game.chainLightnings.push({x1:target.x,y1:target.y,x2:t2.x,y2:t2.y,life:0.5,maxLife:0.5});
if(t2.hp<=0)killEnemy(t2,0,false);}else{
  // 二次链无目标也显示散射电弧
  for(let k=0;k<2;k++){
    const a=Math.random()*Math.PI*2,dist=30+Math.random()*40;
    game.chainLightnings.push({x1:target.x,y1:target.y,
      x2:target.x+Math.cos(a)*dist,y2:target.y+Math.sin(a)*dist,
      life:0.3,maxLife:0.3,fizzle:true});
  }
}}}}

function findNearestEnemy(x,y,range){
let best=null,bestD=Infinity;
for(const e of game.enemies){if(e.type==='ghost'&&!e.visible)continue;const d=Math.hypot(e.x-x,e.y-y);if(d<range&&d<bestD){bestD=d;best=e;}}
return best;}

/** Explosive bullet detonation */
function explodeBullet(bx,by){
const radii=[0,50,70,90];
const damages=[0,1,1,2];
const radius=radii[game.explosiveLevel];
const damage=damages[game.explosiveLevel]+game.explosionDmgBonus;
const finalRadius=Math.round(radius*game.explosionRadiusMult);
// Particles
spawnParticles(bx,by,'#ff4444',12);spawnParticles(bx,by,'#ff8844',10);spawnParticles(bx,by,'#ffcc44',8);
game.screenShake=Math.max(game.screenShake,0.2);
// Expanding ring visual
explosionRings.push({x:bx,y:by,radius:0,maxRadius:finalRadius,life:0.4,maxLife:0.4});
playSound('bullet_explode');
// Damage enemies
for(let j=game.enemies.length-1;j>=0;j--){
const e=game.enemies[j];
if(e.type==='ghost'&&!e.visible)continue;
{const edx=bx-e.x,edy=by-e.y;if(edx*edx+edy*edy<finalRadius*finalRadius){
e.hp-=damage;e.flashTimer=0.15;spawnParticles(e.x,e.y,COLORS.enemy,6);
if(e.hp<=0)killEnemy(e,0,false);}}}
// Chain barrels
const fr2=finalRadius*finalRadius;
for(let j=game.barrels.length-1;j>=0;j--){
const barrel=game.barrels[j];
if(!barrel.exploded){const bdx=bx-barrel.x,bdy=by-barrel.y;if(bdx*bdx+bdy*bdy<fr2)explodeBarrel(barrel);}}
// Clear enemy bullets
for(let j=game.enemyBullets.length-1;j>=0;j--){
const eb=game.enemyBullets[j];
const ebdx=bx-eb.x,ebdy=by-eb.y;if(ebdx*ebdx+ebdy*ebdy<fr2){spawnParticles(eb.x,eb.y,COLORS.warning,4);game.enemyBullets.splice(j,1);}}}

export function updateBullets(dt){for(let i=game.bullets.length-1;i>=0;i--){const b=game.bullets[i];
b.trail.push({x:b.x,y:b.y});if(b.trail.length>12)b.trail.shift();
b.x+=b.vx;b.y+=b.vy;b.life--;
// Magnetic tracking (after bounce only)
if(game.magnetLevel>0&&b.bounces>0){
const mRanges=[0,150,200,250],mCurves=[0,0.025,0.05,0.08];
const ne=findNearestEnemy(b.x,b.y,mRanges[game.magnetLevel]);
if(ne){const toA=Math.atan2(ne.y-b.y,ne.x-b.x),curA=Math.atan2(b.vy,b.vx);
let diff=toA-curA;while(diff>Math.PI)diff-=Math.PI*2;while(diff<-Math.PI)diff+=Math.PI*2;
const curve=mCurves[game.magnetLevel];
const c=Math.sign(diff)*Math.min(Math.abs(diff),curve);
const spd=Math.hypot(b.vx,b.vy),na=curA+c;
b.vx=Math.cos(na)*spd;b.vy=Math.sin(na)*spd;}}
applyGravityToVelocity(b);
checkBulletAmplifier(b);
for(let gj=game.gravityWells.length-1;gj>=0;gj--){const gw=game.gravityWells[gj];if(gw.hp<0)continue;const gdx=b.x-gw.x,gdy=b.y-gw.y;if(gdx*gdx+gdy*gdy<144){damageGravityWell(gw,b.crit?game.bulletDamage*2:game.bulletDamage);game.bullets.splice(i,1);break;}}
if(!game.bullets[i])continue;
if(checkBulletPrismCollisions(i))continue;
if(checkBulletWallCollisions(i))continue;
checkBulletPortalCollision(b);
if(b.x<=6||b.x>=W-6){if(b.piercing&&!b.piercingUsed){b.piercingUsed=true;b.x=b.x<=6?W-8:8;spawnParticles(b.x,b.y,'#ffaaff',6);}else{b.vx*=-1;b.x=b.x<=6?6:W-6;b.bounces++;spawnParticles(b.x,b.y,COLORS.laserGlow,4);playSound('bounce',{pitch:0.9+Math.random()*0.2});}}
if(b.y<=6||b.y>=H-6){if(b.piercing&&!b.piercingUsed){b.piercingUsed=true;b.y=b.y<=6?H-8:8;spawnParticles(b.x,b.y,'#ffaaff',6);}else{b.vy*=-1;b.y=b.y<=6?6:H-6;b.bounces++;spawnParticles(b.x,b.y,COLORS.laserGlow,4);playSound('bounce',{pitch:0.9+Math.random()*0.2});}}
// Boss collision
if(game.boss&&isBossAlive()){
const boss=game.boss;
if(!boss.invulnerable&&!boss.phaseTransitioning&&boss.deathTimer<=0){
const bdx=b.x-boss.x,bdy=b.y-boss.y,brr=boss.hitboxRadius+4;
if(bdx*bdx+bdy*bdy<brr*brr){
const dmg=(b.crit?game.bulletDamage*2:game.bulletDamage)+(b.ampDmg||0);
damageBoss(dmg,b);
spawnParticles(boss.x,boss.y,'#cc66ff',10);
playSound(b.crit?'crit_hit':'enemy_hit');
if(b.crit){spawnParticles(boss.x,boss.y,'#ffdd44',12);game.screenShake=Math.max(game.screenShake,0.15);}
game.bullets.splice(i,1);continue;}}
// Clone collision
let cloneHit=false;
for(const clone of(boss.clones||[])){
if(clone.hp<=0)continue;
const cdx=b.x-clone.x,cdy=b.y-clone.y,crr=clone.size+4;
if(cdx*cdx+cdy*cdy<crr*crr){
const dmg=(b.crit?game.bulletDamage*2:game.bulletDamage)+(b.ampDmg||0);
clone.hp-=dmg;clone.flashTimer=0.15;
spawnParticles(clone.x,clone.y,'#cc88ff',8);
playSound('enemy_hit');
if(clone.hp<=0){boss.stunTimer=2.0;spawnParticles(clone.x,clone.y,'#ffffff',20);playSound('boss_stun');game.screenShake=Math.max(game.screenShake,0.3);}
game.bullets.splice(i,1);cloneHit=true;break;}}
if(cloneHit)continue;}
{ // Spatial grid collision: enemies, apples, barrels
const nearby=queryNearby(b.x,b.y);let hit=false;
for(let ni=0;ni<nearby.length;ni++){const ent=nearby[ni];
if(ent._gt===1){// enemy
const dx=b.x-ent.x,dy=b.y-ent.y,rr=ent.size+4;
if(dx*dx+dy*dy<rr*rr){
const dmg=(b.crit?game.bulletDamage*2:game.bulletDamage)+(b.ampDmg||0);
ent.hp-=dmg;ent.flashTimer=0.15;spawnParticles(ent.x,ent.y,COLORS.enemy,8);
playSound(b.crit?'crit_hit':'enemy_hit');
if(b.crit){spawnParticles(ent.x,ent.y,'#ffdd44',12);game.screenShake=Math.max(game.screenShake,0.15);}
if(ent.hp<=0){killEnemy(ent,b.bounces,b.shieldReflected);}
game.bullets.splice(i,1);hit=true;break;}}
else if(ent._gt===2){// apple
const dx=b.x-ent.x,dy=b.y-ent.y,rr=ent.size+4;
if(dx*dx+dy*dy<rr*rr){spawnParticles(ent.x,ent.y,'#ff4444',12);spawnParticles(ent.x,ent.y,'#44dd22',6);const ai=game.apples.indexOf(ent);if(ai!==-1)game.apples.splice(ai,1);if(game.playerHp<game.playerMaxHp){game.playerHp++;}game.score+=50;game.screenShake=0.1;playSound('apple_pickup');game.bullets.splice(i,1);hit=true;break;}}
else if(ent._gt===3){// barrel
if(ent.exploded)continue;const dx=b.x-ent.x,dy=b.y-ent.y,rr=ent.size+4;
if(dx*dx+dy*dy<rr*rr){explodeBarrel(ent);game.bullets.splice(i,1);hit=true;break;}}}
if(hit)continue;}
if(!game.bullets[i])continue;
if((b.bounces>0||b.fromPrism)&&game.shieldActive){const dist=Math.hypot(b.x-player.x,b.y-player.y);
if(dist<SHIELD_RADIUS&&dist>0){const nx=(b.x-player.x)/dist,ny=(b.y-player.y)/dist,dot=b.vx*nx+b.vy*ny;
b.vx-=2*dot*nx;b.vy-=2*dot*ny;b.x=player.x+nx*(SHIELD_RADIUS+2);b.y=player.y+ny*(SHIELD_RADIUS+2);
b.bounces++;b.shieldReflected=true;if(game.tutorialActive)game.tutorialShieldReflects++;
game.shieldEnergy=Math.max(0,game.shieldEnergy-Math.round(8*game.shieldDrainMult));spawnParticles(b.x,b.y,COLORS.shield,6);playSound('shield_reflect');
if(game.shieldEnergy<=0){game.shieldActive=false;game.shieldCooldown=true;}continue;}}
if(b.portalGrace>0)b.portalGrace--;
if((b.bounces>0||b.fromPrism)&&player.invincibleTimer<=0&&b.portalGrace<=0){
{const pdx=b.x-player.x,pdy=b.y-player.y,pr=player.size+3;if(pdx*pdx+pdy*pdy<pr*pr){game.bullets.splice(i,1);if(damagePlayer('\u88AB\u81EA\u5DF1\u7684\u6FC0\u5149\u51FB\u6740\u4E86!'))return;continue;}}}
if(b.bounces>b.maxBounces||b.life<=0){
if(game.explosiveLevel>0){explodeBullet(b.x,b.y);}else{spawnParticles(b.x,b.y,COLORS.bullet,3);}
game.bullets.splice(i,1);}}}

export function updateChainLightnings(dt){
for(let i=game.chainLightnings.length-1;i>=0;i--){game.chainLightnings[i].life-=dt;if(game.chainLightnings[i].life<=0)game.chainLightnings.splice(i,1);}
for(let i=explosionRings.length-1;i>=0;i--){const r=explosionRings[i];r.life-=dt;r.radius=r.maxRadius*(1-r.life/r.maxLife);if(r.life<=0)explosionRings.splice(i,1);}}

export function drawChainLightnings(){
// Explosion rings
for(const r of explosionRings){
const alpha=r.life/r.maxLife;
ctx.save();
ctx.globalAlpha=alpha;
ctx.strokeStyle='#ff8844';ctx.lineWidth=3;ctx.shadowColor='#ff4444';ctx.shadowBlur=15;
ctx.beginPath();ctx.arc(r.x,r.y,r.radius,0,Math.PI*2);ctx.stroke();
ctx.strokeStyle='#ffcc44';ctx.lineWidth=1.5;
ctx.beginPath();ctx.arc(r.x,r.y,r.radius*0.7,0,Math.PI*2);ctx.stroke();
ctx.shadowBlur=0;ctx.globalAlpha=1;ctx.restore();}
// Chain lightning bolts
for(const cl of game.chainLightnings){
const alpha=cl.life/cl.maxLife;
const isFizzle=cl.fizzle;
ctx.save();ctx.globalAlpha=alpha;
// 外层粗光芒
ctx.strokeStyle=isFizzle?`rgba(100,150,255,${alpha*0.4})`:`rgba(100,150,255,${alpha*0.6})`;
ctx.lineWidth=isFizzle?4:6;ctx.shadowColor='#4488ff';ctx.shadowBlur=isFizzle?15:25;
ctx.beginPath();ctx.moveTo(cl.x1,cl.y1);
const segs=isFizzle?4:7+Math.floor(Math.random()*3);
const jitter=isFizzle?6:12;
for(let s=1;s<segs;s++){const t=s/segs;
const mx=cl.x1+(cl.x2-cl.x1)*t,my=cl.y1+(cl.y2-cl.y1)*t;
const j=jitter*(1-Math.abs(t-0.5)*2);
ctx.lineTo(mx+(Math.random()-0.5)*j*2,my+(Math.random()-0.5)*j*2);}
ctx.lineTo(cl.x2,cl.y2);ctx.stroke();
// 中层明亮线
ctx.strokeStyle=isFizzle?`rgba(170,204,255,${alpha*0.7})`:`rgba(170,220,255,${alpha*0.9})`;
ctx.lineWidth=isFizzle?2:3;ctx.stroke();
// 内层白色芯
ctx.strokeStyle=`rgba(255,255,255,${alpha*0.8})`;
ctx.lineWidth=isFizzle?0.8:1.5;ctx.stroke();
// 命中点闪光
if(!isFizzle&&alpha>0.3){
ctx.beginPath();ctx.arc(cl.x2,cl.y2,6+alpha*8,0,Math.PI*2);
ctx.fillStyle=`rgba(170,204,255,${alpha*0.5})`;ctx.shadowBlur=20;ctx.fill();
ctx.beginPath();ctx.arc(cl.x2,cl.y2,3,0,Math.PI*2);
ctx.fillStyle=`rgba(255,255,255,${alpha*0.7})`;ctx.fill();}
// 起点光点
ctx.beginPath();ctx.arc(cl.x1,cl.y1,3+alpha*4,0,Math.PI*2);
ctx.fillStyle=`rgba(170,204,255,${alpha*0.4})`;ctx.shadowBlur=12;ctx.fill();
ctx.shadowBlur=0;ctx.globalAlpha=1;ctx.restore();}}

export function drawBullet(b){
const ip=b.piercing&&!b.piercingUsed;
const isCrit=b.crit;
const isMag=game.magnetLevel>0&&b.bounces>0;
const isExp=game.explosiveLevel>0;
const isScat=game.scatterLevel>0;
const isHeavy=b.counterHp>=2;
const isAmp=b.amplified;

// Determine bullet visual style
let trailColor,glowColor,bodyColor,bodyR=4,blur=12;
if(ip){trailColor='rgba(255,170,255,';glowColor='#ffaaff';bodyColor='#ff88ff';}
else if(isAmp){trailColor='rgba(255,200,68,';glowColor='#ffc844';bodyColor='#ffcc44';bodyR=5;blur=14;}
else if(isCrit){trailColor='rgba(255,221,68,';glowColor='#ffdd44';bodyColor='#ffdd44';bodyR=5;blur=16;}
else if(isHeavy){trailColor='rgba(255,102,68,';glowColor='#ff6644';bodyColor='#ff4422';bodyR=5;blur=14;}
else if(isExp){trailColor='rgba(255,136,68,';glowColor='#ff8844';bodyColor='#ff6622';bodyR=5;blur=14;}
else if(isMag){trailColor='rgba(68,170,255,';glowColor='#44aaff';bodyColor='#66bbff';}
else if(isScat){trailColor='rgba(68,255,204,';glowColor='#44ffcc';bodyColor='#44ffcc';}
else{trailColor='rgba(0,255,200,';glowColor=COLORS.laserGlow;bodyColor=COLORS.bullet;}

// Trail
for(let i=0;i<b.trail.length;i++){const a=i/b.trail.length,s=2+a*2;
ctx.fillStyle=trailColor+(ip?a*0.5:isCrit?a*0.6:a*0.5)+')';
ctx.fillRect(Math.floor(b.trail[i].x-s/2),Math.floor(b.trail[i].y-s/2),s,s);}

// Glow + body
ctx.shadowColor=glowColor;ctx.shadowBlur=blur;
drawPixelCircle(b.x,b.y,bodyR,bodyColor);
drawPixelCircle(b.x,b.y,2,'#ffffff');

// Explosive: outer orange ring indicator
if(isExp&&!ip){
ctx.shadowColor='#ff4400';ctx.shadowBlur=6;
ctx.strokeStyle='#ff884488';ctx.lineWidth=1;
ctx.beginPath();ctx.arc(b.x,b.y,bodyR+3,0,Math.PI*2);ctx.stroke();}

// Heavy: outer red-orange ring indicator
if(isHeavy&&!ip){
ctx.shadowColor='#ff4400';ctx.shadowBlur=8;
ctx.strokeStyle='#ff664488';ctx.lineWidth=1.5;
ctx.beginPath();ctx.arc(b.x,b.y,bodyR+3,0,Math.PI*2);ctx.stroke();
ctx.strokeStyle='#ff884444';ctx.lineWidth=1;
ctx.beginPath();ctx.arc(b.x,b.y,bodyR+5,0,Math.PI*2);ctx.stroke();}

// Magnetic: blue spark trail after bounce
if(isMag&&!ip&&!isCrit&&Math.random()<0.3){
ctx.fillStyle='#44aaff';
const sx=b.x-b.vx*0.5+(Math.random()-0.5)*6;
const sy=b.y-b.vy*0.5+(Math.random()-0.5)*6;
ctx.fillRect(Math.floor(sx)-1,Math.floor(sy)-1,2,2);}

ctx.shadowBlur=0;}

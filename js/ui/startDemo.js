import { DW, DH, COLORS } from '../core/constants.js';
import { game, updateContinueButton } from '../core/state.js';

let demoCtx;
let highScore=parseInt(localStorage.getItem('bouncelaser_highscore')||'0');
const startDemo={bullets:[],particles:[],spawnTimer:0};

function spawnDemoBullet(){const a=Math.random()*Math.PI*2,s=2+Math.random()*2;startDemo.bullets.push({x:20+Math.random()*(DW-40),y:20+Math.random()*(DH-40),vx:Math.cos(a)*s,vy:Math.sin(a)*s,trail:[],life:400+Math.random()*400});}

function spawnDemoParticles(x,y,count){for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=1+Math.random()*2;startDemo.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:0.3+Math.random()*0.3,maxLife:0.3+Math.random()*0.3,size:2+Math.random()*2});}}

export function initStartDemo(){const demoCanvas=document.getElementById('demoCanvas');demoCtx=demoCanvas.getContext('2d');startDemo.bullets=[];startDemo.particles=[];startDemo.spawnTimer=0;for(let i=0;i<3;i++)spawnDemoBullet();updateHighScoreDisplay();updateContinueButton();}

export function updateStartDemo(dt){startDemo.spawnTimer+=dt;if(startDemo.spawnTimer>2.5&&startDemo.bullets.length<5){startDemo.spawnTimer=0;spawnDemoBullet();}for(let i=startDemo.bullets.length-1;i>=0;i--){const b=startDemo.bullets[i];b.trail.push({x:b.x,y:b.y});if(b.trail.length>15)b.trail.shift();b.x+=b.vx;b.y+=b.vy;b.life--;if(b.x<=4||b.x>=DW-4){b.vx*=-1;b.x=b.x<=4?4:DW-4;spawnDemoParticles(b.x,b.y,4);}if(b.y<=4||b.y>=DH-4){b.vy*=-1;b.y=b.y<=4?4:DH-4;spawnDemoParticles(b.x,b.y,4);}if(b.life<=0){spawnDemoParticles(b.x,b.y,3);startDemo.bullets.splice(i,1);}}for(let i=startDemo.particles.length-1;i>=0;i--){const p=startDemo.particles[i];p.x+=p.vx;p.y+=p.vy;p.vx*=0.95;p.vy*=0.95;p.life-=dt;if(p.life<=0)startDemo.particles.splice(i,1);}}

export function drawStartDemo(){const dc=demoCtx;dc.fillStyle=COLORS.bg;dc.fillRect(0,0,DW,DH);dc.strokeStyle=COLORS.grid;dc.lineWidth=1;for(let x=0;x<DW;x+=32){dc.beginPath();dc.moveTo(x,0);dc.lineTo(x,DH);dc.stroke();}for(let y=0;y<DH;y+=32){dc.beginPath();dc.moveTo(0,y);dc.lineTo(DW,y);dc.stroke();}dc.shadowColor='#00ff8844';dc.shadowBlur=6;dc.fillStyle='#1a3a2e';dc.fillRect(0,0,DW,2);dc.fillRect(0,DH-2,DW,2);dc.fillRect(0,0,2,DH);dc.fillRect(DW-2,0,2,DH);dc.shadowBlur=0;startDemo.bullets.forEach(b=>{for(let i=0;i<b.trail.length;i++){const a=i/b.trail.length,s=2+a*2;dc.fillStyle=`rgba(0,255,200,${a*0.3})`;dc.fillRect(Math.floor(b.trail[i].x-s/2),Math.floor(b.trail[i].y-s/2),s,s);}dc.shadowColor=COLORS.laserGlow;dc.shadowBlur=10;dc.fillStyle=COLORS.bullet;dc.beginPath();dc.arc(b.x,b.y,3,0,Math.PI*2);dc.fill();dc.fillStyle='#ffffff';dc.beginPath();dc.arc(b.x,b.y,1.5,0,Math.PI*2);dc.fill();dc.shadowBlur=0;});startDemo.particles.forEach(p=>{dc.globalAlpha=p.life/p.maxLife;dc.fillStyle=COLORS.laserGlow;dc.fillRect(Math.floor(p.x-p.size/2),Math.floor(p.y-p.size/2),p.size,p.size);});dc.globalAlpha=1;}

function updateHighScoreDisplay(){const el=document.getElementById('highScoreDisplay');if(el)el.textContent=highScore>0?`BEST: ${highScore}`:'';}

export function saveHighScore(){if(game.score>highScore){highScore=game.score;localStorage.setItem('bouncelaser_highscore',highScore.toString());}}

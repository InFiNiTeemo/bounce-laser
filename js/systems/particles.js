import { ctx } from '../core/render.js';
import { game } from '../core/state.js';

export function spawnParticles(x,y,color,count){if(game.particles.length>200)return;for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=1+Math.random()*3;game.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:0.4+Math.random()*0.4,maxLife:0.4+Math.random()*0.4,color,size:2+Math.random()*3});}}

export function updateParticles(dt){for(let i=game.particles.length-1;i>=0;i--){const p=game.particles[i];p.x+=p.vx;p.y+=p.vy;p.vx*=0.96;p.vy*=0.96;p.life-=dt;if(p.life<=0)game.particles.splice(i,1);}}

export function drawParticles(){for(let i=0;i<game.particles.length;i++){const p=game.particles[i];ctx.globalAlpha=p.life/p.maxLife;ctx.fillStyle=p.color;ctx.fillRect(Math.floor(p.x-p.size/2),Math.floor(p.y-p.size/2),p.size,p.size);}ctx.globalAlpha=1;}

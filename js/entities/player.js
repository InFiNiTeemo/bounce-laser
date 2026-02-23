import { ctx, drawPixelRect, drawPixelCircle } from '../core/render.js';
import { COLORS } from '../core/constants.js';
import { game, player } from '../core/state.js';

export function drawPlayer() { const p=player; if(p.invincibleTimer>0&&Math.floor(p.invincibleTimer*10)%2===0)return; const s=p.size;
// 二次生命光环（未使用时显示金色脉冲环）
if(game.secondLife&&!game.secondLifeUsed){const pulse=0.4+Math.sin(Date.now()/300)*0.3;const r=s+6+Math.sin(Date.now()/400)*2;ctx.save();ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.strokeStyle=`rgba(255,221,68,${pulse})`;ctx.lineWidth=1.5;ctx.shadowColor='#ffdd44';ctx.shadowBlur=10;ctx.stroke();ctx.shadowBlur=0;ctx.restore();}
drawPixelCircle(p.x,p.y+s+2,s*0.6,'rgba(0,0,0,0.3)'); drawPixelCircle(p.x,p.y,s,COLORS.playerDark); drawPixelCircle(p.x,p.y,s-3,COLORS.player); const ex=Math.cos(game.gunAngle)*4,ey=Math.sin(game.gunAngle)*4; drawPixelRect(p.x-4+ex,p.y-3+ey,3,3,'#003322'); drawPixelRect(p.x+2+ex,p.y-3+ey,3,3,'#003322'); const gx=p.x+Math.cos(game.gunAngle)*p.gunLength,gy=p.y+Math.sin(game.gunAngle)*p.gunLength; ctx.strokeStyle=COLORS.gun; ctx.lineWidth=4; ctx.shadowColor=COLORS.laserGlow; ctx.shadowBlur=6; ctx.beginPath(); ctx.moveTo(p.x+Math.cos(game.gunAngle)*s,p.y+Math.sin(game.gunAngle)*s); ctx.lineTo(gx,gy); ctx.stroke(); ctx.shadowBlur=0; drawPixelCircle(gx,gy,3,COLORS.laserGlow); }

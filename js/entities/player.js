import { ctx, drawPixelRect, drawPixelCircle } from '../core/render.js';
import { COLORS } from '../core/constants.js';
import { game, player } from '../core/state.js';

export function drawPlayer() { const p=player; if(p.invincibleTimer>0&&Math.floor(p.invincibleTimer*10)%2===0)return; const s=p.size; drawPixelCircle(p.x,p.y+s+2,s*0.6,'rgba(0,0,0,0.3)'); drawPixelCircle(p.x,p.y,s,COLORS.playerDark); drawPixelCircle(p.x,p.y,s-3,COLORS.player); const ex=Math.cos(game.gunAngle)*4,ey=Math.sin(game.gunAngle)*4; drawPixelRect(p.x-4+ex,p.y-3+ey,3,3,'#003322'); drawPixelRect(p.x+2+ex,p.y-3+ey,3,3,'#003322'); const gx=p.x+Math.cos(game.gunAngle)*p.gunLength,gy=p.y+Math.sin(game.gunAngle)*p.gunLength; ctx.strokeStyle=COLORS.gun; ctx.lineWidth=4; ctx.shadowColor=COLORS.laserGlow; ctx.shadowBlur=6; ctx.beginPath(); ctx.moveTo(p.x+Math.cos(game.gunAngle)*s,p.y+Math.sin(game.gunAngle)*s); ctx.lineTo(gx,gy); ctx.stroke(); ctx.shadowBlur=0; drawPixelCircle(gx,gy,3,COLORS.laserGlow); }

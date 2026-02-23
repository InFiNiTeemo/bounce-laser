import { game, player, initGameState, saveGameProgress, loadGameProgress, updateContinueButton } from '../core/state.js';
import { MAX_LEVEL } from '../core/constants.js';
import { spawnEnemies } from '../entities/enemies.js';
import { spawnPrisms } from '../objects/prism.js';
import { spawnPortals } from '../objects/portals.js';
import { spawnBarrels } from '../objects/barrels.js';
import { spawnApples } from '../objects/apples.js';
import { saveHighScore, initStartDemo } from './startDemo.js';
import { getUnlockedLevel, unlockLevel } from './levelUnlock.js';
import { showUpgradePanel } from '../systems/upgrades.js';

export function hideAllScreens(){document.getElementById('startScreen').classList.add('hidden');document.getElementById('gameOverScreen').classList.add('hidden');document.getElementById('levelClearScreen').classList.add('hidden');document.getElementById('levelSelectScreen').classList.add('hidden');document.getElementById('pauseScreen').classList.add('hidden');game.paused=false;document.getElementById('gameContainer').classList.remove('hidden');}

export function showMainMenu(){game.running=false;hideAllScreens();document.getElementById('gameContainer').classList.add('hidden');document.getElementById('startScreen').classList.remove('hidden');initStartDemo();}

export function showGameOver(reason){game.running=false;saveHighScore();document.getElementById('deathReason').textContent=reason;document.getElementById('finalScore').textContent=`\u5F97\u5206: ${game.score}`;document.getElementById('gameOverScreen').classList.remove('hidden');}

export function showLevelClear(){game.running=false;saveHighScore();unlockLevel(game.level+1);saveGameProgress();document.getElementById('levelScore').textContent=`\u5F97\u5206: ${game.score} | \u5269\u4F59\u5F39\u836F: ${game.shots}`;document.getElementById('upgradePanel').innerHTML='';document.getElementById('levelClearScreen').classList.remove('hidden');requestAnimationFrame(()=>showUpgradePanel());}

export function startGame(){initGameState(1,0,10,game.playerMaxHp);game.bulletDamage=1;game.shieldRegenRate=15;game.playerMaxHp=3;game.playerHp=3;spawnEnemies();spawnPrisms();spawnPortals();spawnBarrels();spawnApples();hideAllScreens();game.running=true;}

export function continueGame(){const save=loadGameProgress();if(!save)return;game.playerMaxHp=save.playerMaxHp||3;initGameState(save.level,save.score,save.shots,save.playerHp||game.playerMaxHp);game.piercingCount=save.piercingCount||0;game.bulletDamage=save.bulletDamage||1;game.shieldRegenRate=save.shieldRegenRate||15;spawnEnemies();spawnPrisms();spawnPortals();spawnBarrels();spawnApples();hideAllScreens();game.running=true;}

export function startFromLevel(lvl){initGameState(lvl,0,10+(lvl-1)*5,game.playerMaxHp);game.bulletDamage=1;game.shieldRegenRate=15;spawnEnemies();spawnPrisms();spawnPortals();spawnBarrels();spawnApples();hideAllScreens();game.running=true;}

export function retryLevel(){initGameState(game.level,game.score,10+(game.level-1)*5,game.playerMaxHp);spawnEnemies();spawnPrisms();spawnPortals();spawnBarrels();spawnApples();hideAllScreens();game.running=true;}

export function nextLevel(){game.level++;game.bullets=[];game.enemyBullets=[];game.particles=[];game.prisms=[];game.barrels=[];game.pickups=[];game.portals=[];game.apples=[];game.shots+=5;game.playerAlive=true;game.shieldActive=false;game.shieldEnergy=game.shieldMaxEnergy;game.shieldCooldown=false;player.invincibleTimer=1;spawnEnemies();spawnPrisms();spawnPortals();spawnBarrels();spawnApples();document.getElementById('levelClearScreen').classList.add('hidden');game.running=true;}

export function buildLevelGrid(){const grid=document.getElementById('levelGrid');grid.innerHTML='';const unlocked=getUnlockedLevel();for(let i=1;i<=MAX_LEVEL;i++){const btn=document.createElement('button');btn.className='level-btn';btn.textContent=i;if(i>unlocked){btn.classList.add('locked');btn.textContent='?';}else if(i<unlocked)btn.classList.add('cleared');if(i<=unlocked){const level=i;btn.addEventListener('click',function(){startFromLevel(level);});}grid.appendChild(btn);}}

export function showLevelSelect(){game.running=false;buildLevelGrid();document.getElementById('startScreen').classList.add('hidden');document.getElementById('gameContainer').classList.add('hidden');document.getElementById('levelSelectScreen').classList.remove('hidden');}

export function updateUI(){const hearts='\u2665'.repeat(game.playerHp)+'\u2661'.repeat(game.playerMaxHp-game.playerHp);const hpEl=document.getElementById('hpDisplay');hpEl.textContent=`HP: ${hearts}`;hpEl.style.color=game.playerHp<=1?'#ff4444':'#00ff88';hpEl.style.borderColor=game.playerHp<=1?'#ff4444':'#00ff88';hpEl.style.textShadow=game.playerHp<=1?'0 0 8px #ff4444':'0 0 8px #00ff88';document.getElementById('levelDisplay').textContent=`\u5173\u5361 ${game.level}`;document.getElementById('shotsDisplay').textContent=`\u5F39\u836F: ${game.shots}`;document.getElementById('enemyDisplay').textContent=`\u654C\u4EBA: ${game.enemies.length}`;const sp=Math.round(game.shieldEnergy),se=document.getElementById('shieldDisplay');se.textContent=`\u62A4\u76FE: ${sp}%`;se.style.borderColor=game.shieldCooldown?'#ff4444':'#00ccff';se.style.color=game.shieldCooldown?'#ff4444':'#00ccff';se.style.textShadow=game.shieldCooldown?'0 0 8px #ff4444':'0 0 8px #00ccff';const pe=document.getElementById('piercingDisplay');if(game.piercingCount>0){pe.style.display='';pe.textContent=`\u7A7F\u900F: ${game.piercingCount}`;pe.style.color='#ffaaff';pe.style.borderColor='#ffaaff';pe.style.textShadow='0 0 8px #ffaaff';}else pe.style.display='none';}

export function togglePause(){if(game.paused){game.paused=false;game.running=true;document.getElementById('pauseScreen').classList.add('hidden');document.getElementById('statusPanel').classList.add('hidden');document.getElementById('pauseMenu').classList.remove('hidden');return;}if(!game.running||!game.playerAlive)return;game.running=false;game.paused=true;document.getElementById('pauseScreen').classList.remove('hidden');document.getElementById('pauseMenu').classList.remove('hidden');document.getElementById('statusPanel').classList.add('hidden');}

export function showStatusPanel(){document.getElementById('pauseMenu').classList.add('hidden');const c=document.getElementById('statusContent');c.innerHTML=`<span class="stat-label">\u5173\u5361</span><span class="stat-value">${game.level}</span>`+`<span class="stat-label">\u5F97\u5206</span><span class="stat-value">${game.score}</span>`+`<span class="stat-label">\u751F\u547D</span><span class="stat-value">${game.playerHp} / ${game.playerMaxHp}</span>`+`<span class="stat-label">\u5F39\u836F</span><span class="stat-value">${game.shots}</span>`+`<span class="stat-label">\u6FC0\u5149\u5A01\u529B</span><span class="stat-value">${game.bulletDamage}</span>`+`<span class="stat-label">\u62A4\u76FE\u5BB9\u91CF</span><span class="stat-value">${game.shieldMaxEnergy}</span>`+`<span class="stat-label">\u62A4\u76FE\u56DE\u590D</span><span class="stat-value">${game.shieldRegenRate}/s</span>`+`<span class="stat-label">\u53CD\u5F39\u6B21\u6570</span><span class="stat-value">${game.maxBounces}</span>`+(game.piercingCount>0?`<span class="stat-label">\u7A7F\u900F\u5F39</span><span class="stat-value">${game.piercingCount}</span>`:'');document.getElementById('statusPanel').classList.remove('hidden');}

export function hideStatusPanel(){document.getElementById('statusPanel').classList.add('hidden');document.getElementById('pauseMenu').classList.remove('hidden');}

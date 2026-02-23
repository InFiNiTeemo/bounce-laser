import { canvas } from '../core/render.js';
import { W, H } from '../core/constants.js';
import { game } from '../core/state.js';
import { fireBullet } from '../entities/bullets.js';
import { startGame, continueGame, retryLevel, showLevelSelect, showMainMenu, togglePause, showStatusPanel, hideStatusPanel, showPauseHelp, hidePauseHelp } from './screens.js';
import { applyUpgrade } from '../systems/upgrades.js';
import { initStartDemo } from './startDemo.js';
import { showEditorLevelSelect, returnToEditor } from '../editor/editor.js';
import { showBestiary, hideBestiary } from './bestiary.js';
import { skipTutorial, resetTutorialFlag, startTutorial } from '../systems/tutorial.js';

export function initInput(){
canvas.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect();game.mouseX=(e.clientX-r.left)*(W/r.width);game.mouseY=(e.clientY-r.top)*(H/r.height);});
canvas.addEventListener('click',()=>{if(game.running&&game.playerAlive)fireBullet();});
canvas.addEventListener('mousedown',e=>{if(e.button===2&&game.running&&game.playerAlive&&!game.shieldCooldown)game.shieldActive=true;});
canvas.addEventListener('mouseup',e=>{if(e.button===2)game.shieldActive=false;});
document.getElementById('bounceSelect').addEventListener('change',e=>{game.maxBounces=parseInt(e.target.value);});

document.getElementById('startBtn').addEventListener('click',startGame);
document.getElementById('continueBtn').addEventListener('click',continueGame);
document.getElementById('selectLevelBtn').addEventListener('click',showLevelSelect);
document.getElementById('editorBtn').addEventListener('click',showEditorLevelSelect);
document.getElementById('retryBtn').addEventListener('click',function(){
  if(game.isPlayTest){returnToEditor();return;}
  retryLevel();
});
document.getElementById('restartBtn').addEventListener('click',function(){
  if(game.isPlayTest){returnToEditor();return;}
  startGame();
});
document.getElementById('selectLevelBtn2').addEventListener('click',showLevelSelect);
document.getElementById('backToMenuBtn').addEventListener('click',showMainMenu);
document.getElementById('backToEditorBtn').addEventListener('click',returnToEditor);
document.getElementById('backBtn').addEventListener('click',function(){document.getElementById('levelSelectScreen').classList.add('hidden');document.getElementById('startScreen').classList.remove('hidden');initStartDemo();});
document.getElementById('bestiaryBtn').addEventListener('click',showBestiary);
document.getElementById('bestiaryBackBtn').addEventListener('click',hideBestiary);
document.getElementById('replayTutorialBtn').addEventListener('click',()=>{resetTutorialFlag();startTutorial();});

document.getElementById('helpToggle').addEventListener('click',function(){const panel=document.getElementById('helpPanel');panel.classList.toggle('show');this.textContent=panel.classList.contains('show')?'\u64CD\u4F5C\u8BF4\u660E \u25B2':'\u64CD\u4F5C\u8BF4\u660E \u25BC';});

document.getElementById('pauseStatusBtn').addEventListener('click',showStatusPanel);
document.getElementById('pauseResumeBtn').addEventListener('click',togglePause);
document.getElementById('pauseMenuBtn').addEventListener('click',function(){game.paused=false;document.getElementById('pauseScreen').classList.add('hidden');showMainMenu();});
document.getElementById('statusBackBtn').addEventListener('click',hideStatusPanel);
document.getElementById('pauseHelpBtn').addEventListener('click',showPauseHelp);
document.getElementById('pauseHelpBackBtn').addEventListener('click',hidePauseHelp);

document.addEventListener('keydown',e=>{
  // Don't handle keys when editor is active
  if(game.editorActive)return;
  if(e.code==='Escape'){e.preventDefault();if(game.tutorialActive){skipTutorial();return;}togglePause();return;}if(game.paused)return;if(e.code==='Space'){e.preventDefault();const ss=document.getElementById('startScreen'),go=document.getElementById('gameOverScreen'),ls=document.getElementById('levelSelectScreen'),lc=document.getElementById('levelClearScreen');if(!ls.classList.contains('hidden'))return;if(!lc.classList.contains('hidden'))return;if(!ss.classList.contains('hidden')||!go.classList.contains('hidden'))startGame();}const lc=document.getElementById('levelClearScreen');if(!lc.classList.contains('hidden')){if(e.code==='Digit1'||e.code==='Numpad1')applyUpgrade(0);if(e.code==='Digit2'||e.code==='Numpad2')applyUpgrade(1);if(e.code==='Digit3'||e.code==='Numpad3')applyUpgrade(2);}});

canvas.addEventListener('contextmenu',e=>e.preventDefault());
}

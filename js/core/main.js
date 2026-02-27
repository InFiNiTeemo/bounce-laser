import { initCanvas } from './render.js';
import { initInput } from '../ui/input.js';
import { initStartDemo } from '../ui/startDemo.js';
import { gameLoop } from './loop.js';
import { loadSprites } from '../sprites/spriteLoader.js';

initCanvas();
loadSprites().then(() => {
  initInput();
  initStartDemo();
  requestAnimationFrame(gameLoop);
}).catch(err => {
  console.error('Sprite loading failed:', err);
  // Fallback: start game anyway (sprites may render as broken)
  initInput();
  initStartDemo();
  requestAnimationFrame(gameLoop);
});

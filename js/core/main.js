import { initCanvas } from './render.js';
import { initInput } from '../ui/input.js';
import { initStartDemo } from '../ui/startDemo.js';
import { gameLoop } from './loop.js';

initCanvas();
initInput();
initStartDemo();
requestAnimationFrame(gameLoop);

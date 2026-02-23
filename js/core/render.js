/**
 * render.js - Canvas initialization and pixel drawing helpers
 */
import { W, H, PX, COLORS, DW, DH } from './constants.js';

export let canvas;
export let ctx;
export let demoCanvas;
export let demoCtx;

export function initCanvas() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  canvas.width = W;
  canvas.height = H;
  demoCanvas = document.getElementById('demoCanvas');
  demoCtx = demoCanvas.getContext('2d');
}

export function drawPixelRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  for (let i = 0; i < w; i += PX) {
    for (let j = 0; j < h; j += PX) {
      ctx.fillRect(Math.floor(x + i), Math.floor(y + j), PX, PX);
    }
  }
}

export function drawPixelCircle(cx, cy, r, color) {
  ctx.fillStyle = color;
  for (let x = -r; x <= r; x += PX) {
    for (let y = -r; y <= r; y += PX) {
      if (x * x + y * y <= r * r) {
        ctx.fillRect(Math.floor(cx + x), Math.floor(cy + y), PX, PX);
      }
    }
  }
}

export function drawBackground() {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;

  for (let x = 0; x < W; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }

  for (let y = 0; y < H; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  ctx.shadowColor = '#00ff8844';
  ctx.shadowBlur = 10;
  drawPixelRect(0, 0, W, 4, '#1a3a2e');
  drawPixelRect(0, H - 4, W, 4, '#1a3a2e');
  drawPixelRect(0, 0, 4, H, '#1a3a2e');
  drawPixelRect(W - 4, 0, 4, H, '#1a3a2e');
  ctx.shadowBlur = 0;
}

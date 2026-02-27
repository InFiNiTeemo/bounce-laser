/**
 * render.js - Canvas initialization and drawing helpers
 */
import { W, H, COLORS, DW, DH, CANVAS_W, CANVAS_H } from './constants.js';

export let canvas;
export let ctx;
export let demoCanvas;
export let demoCtx;

export function initCanvas() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  demoCanvas = document.getElementById('demoCanvas');
  demoCtx = demoCanvas.getContext('2d');
}

/** Temporarily swap the 2D context (used by editor) */
export function setCtx(newCtx) { ctx = newCtx; }
export function getCtx() { return ctx; }

export function drawPixelRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
}

export function drawPixelCircle(cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

// Cached background (static grid + borders, drawn once)
let bgCache = null;

export function invalidateBgCache() { bgCache = null; }

export function drawBackground() {
  if (!bgCache) {
    bgCache = document.createElement('canvas');
    bgCache.width = W;
    bgCache.height = H;
    const bgCtx = bgCache.getContext('2d');

    bgCtx.fillStyle = COLORS.bg;
    bgCtx.fillRect(0, 0, W, H);

    bgCtx.strokeStyle = COLORS.grid;
    bgCtx.lineWidth = 1;
    for (let x = 0; x < W; x += 32) {
      bgCtx.beginPath();
      bgCtx.moveTo(x, 0);
      bgCtx.lineTo(x, H);
      bgCtx.stroke();
    }
    for (let y = 0; y < H; y += 32) {
      bgCtx.beginPath();
      bgCtx.moveTo(0, y);
      bgCtx.lineTo(W, y);
      bgCtx.stroke();
    }

    bgCtx.shadowColor = '#00ff8844';
    bgCtx.shadowBlur = 10;
    bgCtx.fillStyle = '#1a3a2e';
    bgCtx.fillRect(0, 0, W, 4);
    bgCtx.fillRect(0, H - 4, W, 4);
    bgCtx.fillRect(0, 0, 4, H);
    bgCtx.fillRect(W - 4, 0, 4, H);
    bgCtx.shadowBlur = 0;
  }
  ctx.drawImage(bgCache, 0, 0);
}

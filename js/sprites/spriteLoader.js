/**
 * spriteLoader.js — Generates high-res procedural sprites at startup.
 * Uses renderAllSprites() to create sprites at SCALE resolution,
 * ensuring crisp visuals on the 1080x810 canvas.
 */
import { renderAllSprites } from './spriteData.js';

const sprites = {};

/**
 * Generate all sprites procedurally at SCALE resolution.
 * @returns {Promise<void>}  Resolves when all sprites are generated.
 */
export async function loadSprites() {
  const rendered = renderAllSprites();
  for (const [key, canvas] of Object.entries(rendered)) {
    sprites[key] = canvas;
  }
}

/**
 * Get a loaded sprite image by key.
 * @param {string} key  Sprite key from SPRITE_DEFS (e.g. 'player', 'enemy_basic')
 * @returns {HTMLCanvasElement}
 */
export function getSprite(key) {
  return sprites[key];
}

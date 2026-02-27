/**
 * spatialGrid.js - Lightweight spatial hash grid for broadphase collision.
 *
 * Cell size 64 game-units → 10×8 grid (80 cells) for the 640×480 game area.
 * Entities are tagged with _gt (grid type) before insertion:
 *   1=enemy, 2=apple, 3=barrel, 4=playerBullet
 */
const CELL = 64;
const COLS = 10; // ceil(640/64)
const ROWS = 8;  // ceil(480/64)
const N = COLS * ROWS;

// Flat array of arrays — each cell holds entity references
const grid = new Array(N);
for (let i = 0; i < N; i++) grid[i] = [];

export function clearGrid() {
  for (let i = 0; i < N; i++) grid[i].length = 0;
}

/** Insert an entity occupying a circle of given radius into all overlapping cells. */
export function insertEntity(entity, radius) {
  const minC = Math.max(0, (entity.x - radius) / CELL | 0);
  const maxC = Math.min(COLS - 1, (entity.x + radius) / CELL | 0);
  const minR = Math.max(0, (entity.y - radius) / CELL | 0);
  const maxR = Math.min(ROWS - 1, (entity.y + radius) / CELL | 0);
  for (let r = minR; r <= maxR; r++) {
    const row = r * COLS;
    for (let c = minC; c <= maxC; c++) {
      grid[row + c].push(entity);
    }
  }
}

/** Query all entities in the 3×3 neighborhood around (x, y). */
export function queryNearby(x, y) {
  const col = Math.max(0, Math.min(COLS - 1, x / CELL | 0));
  const row = Math.max(0, Math.min(ROWS - 1, y / CELL | 0));
  const result = [];
  const r0 = Math.max(0, row - 1), r1 = Math.min(ROWS - 1, row + 1);
  const c0 = Math.max(0, col - 1), c1 = Math.min(COLS - 1, col + 1);
  for (let r = r0; r <= r1; r++) {
    const base = r * COLS;
    for (let c = c0; c <= c1; c++) {
      const cell = grid[base + c];
      for (let i = 0; i < cell.length; i++) result.push(cell[i]);
    }
  }
  return result;
}

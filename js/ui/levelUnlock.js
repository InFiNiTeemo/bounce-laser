import { MAX_LEVEL } from '../core/constants.js';

export function getUnlockedLevel() {
  try { const val = parseInt(localStorage.getItem('bounceLaser_unlocked')); return (val && val >= 1) ? Math.min(val, MAX_LEVEL) : 1; } catch(e) { return 1; }
}

export function unlockLevel(lvl) {
  const current = getUnlockedLevel();
  if (lvl > current) { try { localStorage.setItem('bounceLaser_unlocked', lvl); } catch(e) {} }
}

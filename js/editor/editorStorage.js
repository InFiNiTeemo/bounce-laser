/**
 * editorStorage.js - Save/load custom levels to localStorage
 */
const STORAGE_KEY = 'bounceLaser_customLevels';

export function getCustomLevels() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function saveCustomLevels(levels) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(levels));
  } catch (e) {
    console.warn('Failed to save custom levels:', e);
  }
}

export function saveCustomLevel(levelData) {
  const levels = getCustomLevels();
  // Assign id if missing
  if (!levelData.id) {
    levelData.id = 'custom_' + Date.now();
  }
  // Update existing or append
  const idx = levels.findIndex(l => l.id === levelData.id);
  if (idx >= 0) {
    levels[idx] = levelData;
  } else {
    levels.push(levelData);
  }
  saveCustomLevels(levels);
  return levelData.id;
}

export function deleteCustomLevel(id) {
  const levels = getCustomLevels().filter(l => l.id !== id);
  saveCustomLevels(levels);
}

export function exportLevelJSON(levelData) {
  return JSON.stringify(levelData, null, 2);
}

export function importLevelJSON(jsonStr) {
  try {
    const data = JSON.parse(jsonStr);
    if (!data.enemies || !Array.isArray(data.enemies)) {
      throw new Error('Invalid level data: missing enemies array');
    }
    // Assign new id on import
    data.id = 'custom_' + Date.now();
    return data;
  } catch (e) {
    alert('\u65E0\u6CD5\u89E3\u6790JSON: ' + e.message);
    return null;
  }
}

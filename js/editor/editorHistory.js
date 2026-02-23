/**
 * editorHistory.js - Undo/redo via level data snapshots
 */
const MAX_HISTORY = 50;
let undoStack = [];
let redoStack = [];
let getStateFn = null;
let setStateFn = null;

export function initHistory(getState, setState) {
  getStateFn = getState;
  setStateFn = setState;
  undoStack = [];
  redoStack = [];
}

export function pushSnapshot() {
  const snap = JSON.stringify(getStateFn());
  // Avoid duplicate snapshots
  if (undoStack.length > 0 && undoStack[undoStack.length - 1] === snap) return;
  undoStack.push(snap);
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack = [];
}

export function undo() {
  if (undoStack.length === 0) return false;
  redoStack.push(JSON.stringify(getStateFn()));
  const snap = undoStack.pop();
  setStateFn(JSON.parse(snap));
  return true;
}

export function redo() {
  if (redoStack.length === 0) return false;
  undoStack.push(JSON.stringify(getStateFn()));
  const snap = redoStack.pop();
  setStateFn(JSON.parse(snap));
  return true;
}

export function canUndo() { return undoStack.length > 0; }
export function canRedo() { return redoStack.length > 0; }

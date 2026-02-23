/**
 * admin.js - Admin review panel for community levels
 */
import { adminListPending, adminApprove, adminReject, fetchCommunityLevels } from './api.js';
import { game, initGameState } from '../core/state.js';
import { loadLevelData } from '../levelLoader.js';
import { hideAllScreens } from '../ui/screens.js';

let currentPassword = '';

export function showAdminPanel() {
  hideAllForAdmin();
  const panel = document.getElementById('adminPanel');
  panel.classList.remove('hidden');
  // If already logged in, skip password
  if (currentPassword) {
    document.getElementById('adminLoginSection').classList.add('hidden');
    document.getElementById('adminContent').classList.remove('hidden');
    loadPending();
  } else {
    document.getElementById('adminLoginSection').classList.remove('hidden');
    document.getElementById('adminContent').classList.add('hidden');
    document.getElementById('adminPwd').value = '';
  }
}

export function hideAdminPanel() {
  document.getElementById('adminPanel').classList.add('hidden');
  document.getElementById('levelSelectScreen').classList.remove('hidden');
  currentPassword = '';
}

export function returnToAdmin() {
  game.adminReview = false;
  game.running = false;
  document.getElementById('gameOverScreen').classList.add('hidden');
  document.getElementById('levelClearScreen').classList.add('hidden');
  document.getElementById('gameContainer').classList.add('hidden');
  showAdminPanel();
}

function hideAllForAdmin() {
  document.getElementById('startScreen').classList.add('hidden');
  document.getElementById('gameContainer').classList.add('hidden');
  document.getElementById('levelSelectScreen').classList.add('hidden');
}

function startAdminPreview(levelData) {
  initGameState(1, 0, levelData.shots || 10, 3);
  game.adminReview = true;
  game.isPlayTest = false;
  game.playerMaxHp = 3;
  game.playerHp = 3;
  game.bulletDamage = 1;
  game.maxBounces = 3;
  loadLevelData(levelData);
  game.shots = levelData.shots || 10;
  hideAllScreens();
  game.running = true;
}

export function initAdminPanel() {
  document.getElementById('adminLoginBtn').addEventListener('click', handleLogin);
  document.getElementById('adminPwd').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
  document.getElementById('adminBackBtn').addEventListener('click', hideAdminPanel);
  document.getElementById('adminRefreshBtn').addEventListener('click', () => loadPending());
  document.getElementById('adminExportBtn').addEventListener('click', exportApproved);
}

async function handleLogin() {
  const pwd = document.getElementById('adminPwd').value.trim();
  if (!pwd) return;
  currentPassword = pwd;
  try {
    await loadPending();
    document.getElementById('adminLoginSection').classList.add('hidden');
    document.getElementById('adminContent').classList.remove('hidden');
  } catch (err) {
    alert(err.message);
    currentPassword = '';
  }
}

async function loadPending() {
  const list = document.getElementById('pendingList');
  list.innerHTML = '<div style="color:#557755;font-size:9px;">加载中...</div>';
  try {
    const data = await adminListPending(currentPassword);
    renderPendingList(data.levels || []);
  } catch (err) {
    list.innerHTML = `<div style="color:#ff4444;font-size:9px;">加载失败: ${err.message}</div>`;
    throw err;
  }
}

function renderPendingList(levels) {
  const list = document.getElementById('pendingList');
  if (levels.length === 0) {
    list.innerHTML = '<div style="color:#557755;font-size:10px;padding:20px 0;">没有待审核的关卡</div>';
    return;
  }
  list.innerHTML = '';
  levels.forEach(entry => {
    const card = document.createElement('div');
    card.className = 'admin-card';
    const ld = entry.levelData;
    const enemyCount = (ld.enemies || []).length;
    const date = new Date(entry.submitTime).toLocaleDateString('zh-CN');
    card.innerHTML = `
      <div class="admin-card-header">
        <span class="admin-card-name">${ld.name || '未命名'}</span>
        <span class="admin-card-author">by ${entry.author || '匿名'}</span>
      </div>
      <div class="admin-card-info">
        敌人: ${enemyCount} | 弹药: ${ld.shots || 10} | ${date}
      </div>
      <div class="admin-card-actions">
        <button class="admin-btn admin-btn-play">试玩</button>
        <button class="admin-btn admin-btn-approve">通过</button>
        <button class="admin-btn admin-btn-reject">拒绝</button>
      </div>
    `;
    card.querySelector('.admin-btn-play').addEventListener('click', () => {
      document.getElementById('adminPanel').classList.add('hidden');
      startAdminPreview(ld);
    });
    card.querySelector('.admin-btn-approve').addEventListener('click', async () => {
      if (!confirm(`确定通过 "${ld.name}" ？`)) return;
      try {
        await adminApprove(currentPassword, entry.id);
        await loadPending();
      } catch (err) {
        alert('审核失败: ' + err.message);
      }
    });
    card.querySelector('.admin-btn-reject').addEventListener('click', async () => {
      if (!confirm(`确定拒绝 "${ld.name}" ？`)) return;
      try {
        await adminReject(currentPassword, entry.id);
        await loadPending();
      } catch (err) {
        alert('拒绝失败: ' + err.message);
      }
    });
    list.appendChild(card);
  });
}

// Register bridge for return from admin play-test
window.__adminBridge = { returnToAdmin };

async function exportApproved() {
  try {
    const data = await fetchCommunityLevels();
    const levels = data.levels || [];
    if (levels.length === 0) {
      alert('没有已审核的关卡可导出');
      return;
    }
    const code = `/**\n * communityLevels.js — 导出时间: ${new Date().toISOString()}\n */\nexport const COMMUNITY_LEVELS = ${JSON.stringify(levels, null, 2)};\n`;
    const blob = new Blob([code], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'communityLevels.js';
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('导出失败: ' + err.message);
  }
}

/**
 * api.js - Community levels API client
 */
const API_BASE = '/api/levels';

async function request(path, options = {}) {
  try {
    const res = await fetch(API_BASE + path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  } catch (err) {
    if (err.message === 'Failed to fetch') {
      throw new Error('网络连接失败');
    }
    throw err;
  }
}

/** Submit a level for review (public) */
export async function submitLevel(levelData, author) {
  return request('/submit', {
    method: 'POST',
    body: JSON.stringify({ levelData, author }),
  });
}

/** Fetch all approved community levels (public) */
export async function fetchCommunityLevels() {
  return request('/community');
}

/** List pending levels (admin) */
export async function adminListPending(password) {
  return request('/admin', {
    method: 'POST',
    body: JSON.stringify({ password, action: 'list_pending' }),
  });
}

/** Approve a level (admin) */
export async function adminApprove(password, levelId) {
  return request('/admin', {
    method: 'POST',
    body: JSON.stringify({ password, action: 'approve', levelId }),
  });
}

/** Reject a level (admin) */
export async function adminReject(password, levelId) {
  return request('/admin', {
    method: 'POST',
    body: JSON.stringify({ password, action: 'reject', levelId }),
  });
}

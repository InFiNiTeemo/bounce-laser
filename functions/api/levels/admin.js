/**
 * POST /api/levels/admin — Admin operations (password protected)
 * Actions: list_pending, approve, reject
 */
export async function onRequestPost(context) {
  const { env, request } = context;
  const KV = env.COMMUNITY_LEVELS;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: '无效的JSON' }, { status: 400 });
  }

  const { password, action, levelId } = body;

  const ADMIN_PWD = env.ADMIN_PASSWORD || '666666';
  if (!password || password !== ADMIN_PWD) {
    return Response.json({ error: '密码错误' }, { status: 403 });
  }

  switch (action) {
    case 'list_pending': {
      const indexRaw = await KV.get('index:pending');
      const index = indexRaw ? JSON.parse(indexRaw) : [];
      const levels = [];
      for (const id of index) {
        const raw = await KV.get(`pending:${id}`);
        if (raw) {
          try { levels.push(JSON.parse(raw)); } catch { /* skip */ }
        }
      }
      return Response.json({ levels });
    }

    case 'approve': {
      if (!levelId) return Response.json({ error: '缺少 levelId' }, { status: 400 });

      // Read pending entry
      const raw = await KV.get(`pending:${levelId}`);
      if (!raw) return Response.json({ error: '关卡不存在' }, { status: 404 });

      const entry = JSON.parse(raw);
      entry.approveTime = new Date().toISOString();

      // Move to approved
      await KV.put(`approved:${levelId}`, JSON.stringify(entry));
      await KV.delete(`pending:${levelId}`);

      // Update indices
      const pendingRaw = await KV.get('index:pending');
      const pending = pendingRaw ? JSON.parse(pendingRaw) : [];
      const newPending = pending.filter(id => id !== levelId);
      await KV.put('index:pending', JSON.stringify(newPending));

      const approvedRaw = await KV.get('index:approved');
      const approved = approvedRaw ? JSON.parse(approvedRaw) : [];
      approved.push(levelId);
      await KV.put('index:approved', JSON.stringify(approved));

      return Response.json({ ok: true });
    }

    case 'reject': {
      if (!levelId) return Response.json({ error: '缺少 levelId' }, { status: 400 });

      await KV.delete(`pending:${levelId}`);

      const pendingRaw = await KV.get('index:pending');
      const pending = pendingRaw ? JSON.parse(pendingRaw) : [];
      const newPending = pending.filter(id => id !== levelId);
      await KV.put('index:pending', JSON.stringify(newPending));

      return Response.json({ ok: true });
    }

    default:
      return Response.json({ error: '未知操作: ' + action }, { status: 400 });
  }
}

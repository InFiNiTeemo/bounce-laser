/**
 * POST /api/levels/submit — Anyone can submit a level for review
 */
export async function onRequestPost(context) {
  const { env, request } = context;
  const KV = env.COMMUNITY_LEVELS;

  // Size limit
  const contentLength = parseInt(request.headers.get('content-length') || '0');
  if (contentLength > 50000) {
    return Response.json({ error: '关卡数据过大' }, { status: 413 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: '无效的JSON' }, { status: 400 });
  }

  const { levelData, author, clientId } = body;

  // Validate
  if (!levelData || !Array.isArray(levelData.enemies) || levelData.enemies.length === 0) {
    return Response.json({ error: '关卡必须包含至少一个敌人' }, { status: 400 });
  }
  if (!levelData.name || typeof levelData.name !== 'string') {
    return Response.json({ error: '关卡必须有名称' }, { status: 400 });
  }

  // Dedup: if clientId provided, check for existing pending entry with same clientId
  let id;
  let existingId = null;
  if (clientId && typeof clientId === 'string') {
    const indexRaw = await KV.get('index:pending');
    const index = indexRaw ? JSON.parse(indexRaw) : [];
    for (const pid of index) {
      const raw = await KV.get(`pending:${pid}`);
      if (raw) {
        const existing = JSON.parse(raw);
        if (existing.clientId === clientId) {
          existingId = pid;
          break;
        }
      }
    }
  }

  if (existingId) {
    // Overwrite existing pending entry
    id = existingId;
  } else {
    id = 'community_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  }

  const entry = {
    id,
    clientId: clientId || null,
    levelData,
    author: (typeof author === 'string' && author.trim()) ? author.trim().slice(0, 20) : '匿名',
    submitTime: new Date().toISOString(),
  };

  // Store in KV
  await KV.put(`pending:${id}`, JSON.stringify(entry));

  // Update pending index (only add if new)
  if (!existingId) {
    const indexRaw = await KV.get('index:pending');
    const index = indexRaw ? JSON.parse(indexRaw) : [];
    index.push(id);
    await KV.put('index:pending', JSON.stringify(index));
  }

  return Response.json({ ok: true, id });
}

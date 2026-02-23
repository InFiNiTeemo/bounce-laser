/**
 * GET /api/levels/sync — Export all approved levels as a JSON array
 * Used by the local sync script to pull community levels.
 */
export async function onRequestGet(context) {
  const { env } = context;
  const KV = env.COMMUNITY_LEVELS;

  const indexRaw = await KV.get('index:approved');
  const index = indexRaw ? JSON.parse(indexRaw) : [];

  const levels = [];
  for (const id of index) {
    const raw = await KV.get(`approved:${id}`);
    if (raw) {
      try { levels.push(JSON.parse(raw)); } catch { /* skip */ }
    }
  }

  return new Response(JSON.stringify(levels, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
}

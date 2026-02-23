/**
 * GET /api/levels/community — List all approved community levels
 */
export async function onRequestGet(context) {
  const { env } = context;
  const KV = env.COMMUNITY_LEVELS;

  const indexRaw = await KV.get('index:approved');
  const index = indexRaw ? JSON.parse(indexRaw) : [];

  if (index.length === 0) {
    return Response.json({ levels: [] });
  }

  // Fetch all approved levels
  const levels = [];
  for (const id of index) {
    const raw = await KV.get(`approved:${id}`);
    if (raw) {
      try {
        levels.push(JSON.parse(raw));
      } catch { /* skip corrupted */ }
    }
  }

  return Response.json({ levels });
}

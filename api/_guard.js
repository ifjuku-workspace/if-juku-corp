// API の共通の見張り（`_` で始まるので Vercel は公開の API にしない）
// - 自分のサイトの画面から来た POST だけを通す（Origin が同じホスト）
// - 同じ IP からの回数を制限する（関数のインスタンスごとのメモリで数える目安の制限。
//   確実に止めたいときは Vercel の Firewall のレート制限も合わせて使う）

const buckets = new Map();

function clientIp(req) {
  const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xf || String(req.headers['x-real-ip'] || '') || req.socket?.remoteAddress || 'unknown';
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  let u;
  try { u = new URL(origin); } catch { return false; }
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  if (u.host === host && (u.protocol === 'https:' || u.hostname === 'localhost' || u.hostname === '127.0.0.1')) return true;
  return false;
}

// windowMs の間に max 回まで。超えたら false
function allow(key, max, windowMs) {
  const now = Date.now();
  const list = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (list.length >= max) { buckets.set(key, list); return false; }
  list.push(now);
  buckets.set(key, list);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.length || now - v[v.length - 1] >= windowMs) buckets.delete(k);
  }
  return true;
}

// 通してよければ true。だめなら応答を返して false
export function guard(req, res, { name, limits }) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.status(405).json({ error: 'method' }); return false; }
  if (!sameOrigin(req)) { res.status(403).json({ error: 'origin' }); return false; }
  const ct = String(req.headers['content-type'] || '');
  if (!ct.toLowerCase().startsWith('application/json')) { res.status(415).json({ error: 'type' }); return false; }
  const ip = clientIp(req);
  for (const [max, windowMs] of limits) {
    if (!allow(`${name}:${windowMs}:${ip}`, max, windowMs)) {
      res.setHeader('Retry-After', String(Math.ceil(windowMs / 1000)));
      res.status(429).json({ error: 'rate' });
      return false;
    }
  }
  return true;
}

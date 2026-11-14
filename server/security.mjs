import { createHash } from 'node:crypto';

const windows = new Map();

// A bounded per-instance burst guard, not a substitute for a distributed WAF limit.
export function allowRequest(request, response, bucket, limit = 90, now = Date.now()) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  const site = request.headers?.['sec-fetch-site'];
  if (site === 'cross-site') {
    response.status(403).json({ message: 'Cross-site requests are not allowed.' });
    return false;
  }
  const address = request.headers?.['x-vercel-forwarded-for'] || request.headers?.['x-forwarded-for'] || request.socket?.remoteAddress || 'unknown';
  const key = bucket + ':' + createHash('sha256').update(String(address).split(',')[0].trim()).digest('hex');
  for (const [id, entry] of windows) if (entry.expires <= now) windows.delete(id);
  let entry = windows.get(key);
  if (!entry) {
    // Bound memory even when many clients hit the same warm function instance.
    if (windows.size >= 5000) {
      response.setHeader('Retry-After', '60');
      response.status(429).json({ message: 'Too many requests. Try again shortly.' });
      return false;
    }
    entry = { count: 0, expires: now + 60000 };
    windows.set(key, entry);
  }
  if (++entry.count > limit) {
    response.setHeader('Retry-After', String(Math.ceil((entry.expires - now) / 1000)));
    response.status(429).json({ message: 'Too many requests. Try again shortly.' });
    return false;
  }
  return true;
}

export function logEvent(event, fields = {}) {
  // Never log query strings, coordinates, IPs, provider URLs, exception messages or keys.
  console.info(JSON.stringify({ event, ...fields }));
}

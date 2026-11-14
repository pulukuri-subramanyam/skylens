import { allowRequest, logEvent } from '../server/security.mjs';
const events = new Set(['render_error', 'unhandled_error', 'weather_failure', 'refresh_failure']);
export default function handler(request, response) {
  if (!allowRequest(request, response, 'events', 10)) return;
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ message: 'Method not allowed.' });
  }
  if (Number(request.headers?.['content-length']) > 512) return response.status(413).json({ message: 'Request too large.' });
  if (!String(request.headers?.['content-type'] || '').startsWith('application/json')) return response.status(415).json({ message: 'JSON required.' });
  let body;
  try { body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body; }
  catch { return response.status(400).json({ message: 'Invalid event.' }); }
  if (!body || !events.has(body.event) || Object.keys(body).some(key=>key!=='event')) return response.status(400).json({ message: 'Invalid event.' });
  logEvent('client_' + body.event, { release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,12) || 'development' });
  return response.status(202).json({ accepted: true });
}

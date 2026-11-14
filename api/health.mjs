export default function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ status: 'method_not_allowed' });
  }
  const ready = Boolean(process.env.OPENWEATHER_API_KEY);
  return response.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'not_ready', release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || 'development' });
}

import { allowRequest, logEvent } from '../server/security.mjs';
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org';

const ROUTES = {
  geocode: { path: '/geo/1.0/direct', maxAge: 300 },
  reverse: { path: '/geo/1.0/reverse', maxAge: 3600 },
  current: { path: '/data/4.0/onecall/current', maxAge: 300 },
  hourly: { path: '/data/4.0/onecall/timeline/1h', maxAge: 900 },
  daily: { path: '/data/4.0/onecall/timeline/1day', maxAge: 1800 },
  air: { path: '/data/2.5/air_pollution', maxAge: 1800 }
};

function getString(query, name) {
  const value = query[name];
  return typeof value === 'string' ? value.trim() : '';
}

function getCoordinate(query, name, min, max) {
  const raw = getString(query, name);
  if (!raw) return null;

  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) return null;
  return String(value);
}

export default async function handler(request, response) {
  if (!allowRequest(request, response, 'weather')) return;
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const type = getString(request.query || {}, 'type');
  const route = Object.hasOwn(ROUTES, type) ? ROUTES[type] : null;
  if (!route) {
    return response.status(400).json({ message: 'Invalid weather request.' });
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return response.status(500).json({ message: 'Weather service is not configured.' });
  }

  const params = new URLSearchParams();
  if (type === 'geocode') {
    const query = getString(request.query, 'q');
    if (query.length < 2 || query.length > 100) {
      return response.status(400).json({ message: 'Enter a valid city name.' });
    }
    params.set('q', query);
    params.set('limit', '5');
  } else {
    const lat = getCoordinate(request.query, 'lat', -90, 90);
    const lon = getCoordinate(request.query, 'lon', -180, 180);
    if (lat === null || lon === null) {
      return response.status(400).json({ message: 'Valid latitude and longitude are required.' });
    }
    params.set('lat', lat);
    params.set('lon', lon);

    if (type === 'reverse') {
      params.set('limit', '1');
    } else {
      params.set('units', 'metric');
      params.set('lang', 'en');
    }
  }

  params.set('appid', apiKey);
  const upstreamUrl = new URL(route.path, OPENWEATHER_BASE_URL);
  upstreamUrl.search = params.toString();

  try {
    const started = Date.now();
    const signal = AbortSignal.timeout(8000);
    const upstreamResponse = await fetch(upstreamUrl, { signal, redirect: 'error' });
    const payload = await upstreamResponse.json();

    if (!upstreamResponse.ok) {
      logEvent('weather_upstream_failed', { type, status: upstreamResponse.status });
      if (upstreamResponse.status === 429) response.setHeader('Retry-After', '60');
      return response.status(upstreamResponse.status === 429 ? 429 : 502)
        .json({ message: 'Weather provider is temporarily unavailable.' });
    }

    if (!payload || typeof payload !== 'object' || ((type === 'geocode' || type === 'reverse') ? !Array.isArray(payload) : type === 'air' ? !Array.isArray(payload.list) : !Array.isArray(payload.data))) throw new Error('Invalid provider response');

    if (type === 'hourly' && Array.isArray(payload.data)) {
      const points = [...payload.data];
      let next = payload.next;
      for (let page = 0; page < 2 && next && points.length < 48; page++) {
        const cursor = new URL(next, OPENWEATHER_BASE_URL);
        if (cursor.hostname !== 'api.openweathermap.org' || !['http:', 'https:'].includes(cursor.protocol) || cursor.pathname !== route.path) break;
        const start = cursor.searchParams.get('start');
        if (!start || !/^\d+$/.test(start)) break;
        const pageUrl = new URL(upstreamUrl);
        pageUrl.searchParams.set('start', start);
        const pageResponse = await fetch(pageUrl, { signal, redirect: 'error' });
        if (!pageResponse.ok) break;
        const pagePayload = await pageResponse.json();
        if (!Array.isArray(pagePayload.data)) break;
        points.push(...pagePayload.data);
        next = pagePayload.next;
      }
      payload.data = [...new Map(points.map(point => [point.dt, point])).values()].sort((a,b)=>a.dt-b.dt).slice(0,48);
    }
    // Provider pagination URLs can contain the server key. Never return them.
    delete payload.next;
    delete payload.prev;
    logEvent('weather_request', { type, status: 200, durationMs: Date.now() - started });
    response.setHeader(
      'Cache-Control',
      `public, max-age=0, s-maxage=${route.maxAge}, stale-while-revalidate=600`
    );
    return response.status(200).json(payload);
  } catch (error) {
    const timeout = error?.name === 'TimeoutError' || error?.name === 'AbortError';
    logEvent('weather_request_failed', { type, reason: timeout ? 'timeout' : 'upstream' });
    return response.status(timeout ? 504 : 502).json({ message: 'Unable to retrieve weather data right now.' });
  }
}

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
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const type = getString(request.query, 'type');
  const route = ROUTES[type];
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
    const upstreamResponse = await fetch(upstreamUrl);
    const payload = await upstreamResponse.json().catch(() => ({}));

    if (!upstreamResponse.ok) {
      return response
        .status(upstreamResponse.status)
        .json({ message: payload.message || 'Weather provider request failed.' });
    }

    response.setHeader(
      'Cache-Control',
      `public, max-age=0, s-maxage=${route.maxAge}, stale-while-revalidate=600`
    );
    return response.status(200).json(payload);
  } catch (error) {
    console.error('OpenWeather proxy request failed.', { type, errorName: error?.name || 'Error' });
    return response.status(502).json({ message: 'Unable to retrieve weather data right now.' });
  }
}

import assert from 'node:assert/strict';

const origin = new URL(process.env.MONITOR_URL || 'https://www.skylens.live');
if (origin.protocol !== 'https:' && origin.hostname !== '127.0.0.1') throw new Error('Use an HTTPS monitor URL');
async function get(path, json = true) {
  const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, `Health check failed: ${path.split('?')[0]}`);
  return json ? response.json() : response.text();
}
assert.match(await get('/', false), /skylens/i);
assert.equal((await get('/api/health')).status, 'ok');
const locations = await get('/api/weather?type=geocode&q=London');
assert(Array.isArray(locations) && locations.some(place=>Number.isFinite(place.lat) && Number.isFinite(place.lon)), 'Geocoding returned no locations');
const forecast = await fetch('https://api.open-meteo.com/v1/forecast?latitude=51.5&longitude=-0.12&current=temperature_2m', { signal: AbortSignal.timeout(15000) });
assert(forecast.ok, 'Forecast provider is unavailable');
assert(Number.isFinite((await forecast.json()).current?.temperature_2m), 'Forecast response is invalid');
console.log('PASS: website, API readiness, geocoding and forecast provider');

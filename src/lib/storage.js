export function readStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

export function writeStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}

export function readCities(key) {
  const cities = readStorage(key, []);
  return Array.isArray(cities) ? cities.filter(city => city && ['id', 'name', 'label', 'query'].every(key => typeof city[key] === 'string')) : [];
}

export function readWeatherCache() {
  const cached = readStorage('weatherapp-last-weather', null);
  if (!cached?.currentCity || !cached?.currentWeatherData?.location || !cached?.forecastData?.forecast?.forecastday?.length) return null;
  return Number.isFinite(cached.currentWeatherData.current?.temp_c) ? cached : null;
}

export function readPreference(key, allowed, fallback) {
  try { const value = localStorage.getItem(key); return allowed.includes(value) ? value : fallback; }
  catch { return fallback; }
}

export function formatTemperature(value, unit) {
  return Number.isFinite(value) ? Math.round(unit === 'F' ? value * 9 / 5 + 32 : value) + '°' : 'Unavailable';
}

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

export function uniqueRecentCities(cities) {
  const normalize = value => String(value || '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
  const same = (left,right) => {
    if (left.id === right.id) return true;
    const country = city => normalize(city.countryCode || city.country);
    if (country(left) && country(right) && country(left) !== country(right)) return false;
    if (normalize(left.name) !== normalize(right.name) || normalize(left.label) !== normalize(right.label)) return false;
    const coordinates = [left.lat,left.lon,right.lat,right.lon];
    if (coordinates.every(value=>value!=null && Number.isFinite(Number(value)))) {
      const dy=(Number(left.lat)-Number(right.lat))*111;
      const dx=(Number(left.lon)-Number(right.lon))*111*Math.cos((Number(left.lat)+Number(right.lat))*Math.PI/360);
      return Math.hypot(dx,dy)<10;
    }
    return true;
  };
  return cities.reduce((unique,city)=>unique.some(existing=>same(existing,city))?unique:[...unique,city],[]).slice(0,5);
}

export function readPreference(key, allowed, fallback) {
  try { const value = localStorage.getItem(key); return allowed.includes(value) ? value : fallback; }
  catch { return fallback; }
}

export function formatTemperature(value, unit) {
  return Number.isFinite(value) ? Math.round(unit === 'F' ? value * 9 / 5 + 32 : value) + '°' : 'Unavailable';
}

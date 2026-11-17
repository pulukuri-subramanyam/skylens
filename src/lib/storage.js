export function readStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function readCities(key) {
  const cities = readStorage(key, []);
  return Array.isArray(cities)
    ? cities
        .filter(
          (city) =>
            city &&
            ['id', 'name', 'label', 'query'].every(
              (key) => typeof city[key] === 'string' && city[key].length <= 250,
            ),
        )
        .slice(0, 50)
    : [];
}

export function readWeatherCache() {
  const cached = readStorage('weatherapp-last-weather', null);
  const days = cached?.forecastData?.forecast?.forecastday;
  if (
    cached?.weatherProvider !== 'open-meteo' ||
    !Number.isFinite(cached.lastFetchedAt) ||
    cached.lastFetchedAt > Date.now() + 60000 ||
    Date.now() - cached.lastFetchedAt > 7 * 86400000 ||
    !cached.currentCity ||
    !['id', 'name', 'label', 'query'].every((key) => typeof cached.currentCity[key] === 'string') ||
    !cached.currentWeatherData?.location ||
    !cached.currentWeatherData?.current?.condition ||
    !Array.isArray(days) ||
    !days.length ||
    days.length > 7
  )
    return null;
  if (
    !days.every(
      (day) =>
        Number.isFinite(Date.parse(day?.date)) &&
        day.day?.condition &&
        Array.isArray(day.hour) &&
        day.hour.length <= 25 &&
        day.hour.every((hour) => Number.isFinite(Date.parse(hour?.time))),
    )
  )
    return null;
  const validCondition = (condition) =>
    typeof condition?.text === 'string' && /^\d{2}[dn]$/.test(condition.iconCode);
  if (
    !validCondition(cached.currentWeatherData.current.condition) ||
    !days.every((day) => validCondition(day.day.condition)) ||
    (cached.lastAirQuality != null && typeof cached.lastAirQuality.label !== 'string')
  )
    return null;
  return Number.isFinite(cached.currentWeatherData.current.temp_c) ? cached : null;
}

export function uniqueRecentCities(cities) {
  const normalize = (value) =>
    String(value || '')
      .normalize('NFKC')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  const same = (left, right) => {
    if (left.id === right.id) return true;
    const country = (city) => normalize(city.countryCode || city.country);
    if (country(left) && country(right) && country(left) !== country(right)) return false;
    if (
      normalize(left.name) !== normalize(right.name) ||
      normalize(left.label) !== normalize(right.label)
    )
      return false;
    const coordinates = [left.lat, left.lon, right.lat, right.lon];
    if (coordinates.every((value) => value != null && Number.isFinite(Number(value)))) {
      const dy = (Number(left.lat) - Number(right.lat)) * 111;
      const dx =
        (Number(left.lon) - Number(right.lon)) *
        111 *
        Math.cos(((Number(left.lat) + Number(right.lat)) * Math.PI) / 360);
      return Math.hypot(dx, dy) < 10;
    }
    return true;
  };
  return cities
    .reduce(
      (unique, city) =>
        unique.some((existing) => same(existing, city)) ? unique : [...unique, city],
      [],
    )
    .slice(0, 5);
}

export function readPreference(key, allowed, fallback) {
  try {
    const value = localStorage.getItem(key);
    return allowed.includes(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function formatTemperature(value, unit) {
  return Number.isFinite(value)
    ? Math.round(unit === 'F' ? (value * 9) / 5 + 32 : value) + '°'
    : 'Unavailable';
}

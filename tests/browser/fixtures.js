export const london = { name: 'London', state: 'England', country: 'GB', lat: 51.5, lon: -0.12 };
export const nandyal = {
  name: 'Nandyal',
  state: 'Andhra Pradesh',
  country: 'IN',
  lat: 15.48,
  lon: 78.48,
};

export function forecast(lat = 51.5) {
  const start = Math.floor(Date.now() / 86400000) * 86400;
  const time = Array.from({ length: 168 }, (_, i) => start + i * 3600);
  const day = Array.from({ length: 7 }, (_, i) => start + i * 86400);
  const fill = (value, length = 168) => Array(length).fill(value);
  const temperature = lat < 30 ? 28 : 15;
  return {
    timezone: 'UTC',
    current: {
      time: Math.floor(Date.now() / 1000),
      temperature_2m: temperature,
      apparent_temperature: temperature - 1,
      relative_humidity_2m: 60,
      is_day: 1,
      weather_code: 2,
      pressure_msl: 1015,
      wind_speed_10m: 9,
      wind_direction_10m: 90,
    },
    hourly: {
      time,
      temperature_2m: time.map((_, i) => temperature + Math.round(Math.sin(i / 4) * 3)),
      wind_speed_10m: fill(9),
      precipitation_probability: fill(20),
      visibility: fill(10000),
      uv_index: fill(2),
    },
    daily: {
      time: day,
      temperature_2m_max: fill(temperature + 4, 7),
      temperature_2m_min: fill(temperature - 4, 7),
      wind_speed_10m_max: fill(15, 7),
      precipitation_probability_max: fill(20, 7),
      weather_code: fill(2, 7),
      sunrise: day.map((t) => t + 21600),
      sunset: day.map((t) => t + 64800),
    },
  };
}

export async function providers(page, { failWeather = false } = {}) {
  const state = { failWeather };
  await page.route('**/api/events', (route) =>
    route.fulfill({ status: 202, json: { accepted: true } }),
  );
  await page.route('**/api/weather?**', (route) => {
    const u = new URL(route.request().url());
    if (u.searchParams.get('type') === 'air')
      return route.fulfill({ json: { list: [{ main: { aqi: 2 }, components: { pm2_5: 8 } }] } });
    const city =
      /nandyal/i.test(u.searchParams.get('q') || '') || Number(u.searchParams.get('lat')) === 15.48
        ? nandyal
        : london;
    return route.fulfill({ json: [city] });
  });
  await page.route('https://photon.komoot.io/**', (route) =>
    route.fulfill({ json: { features: [] } }),
  );
  await page.route('https://api.open-meteo.com/**', (route) =>
    state.failWeather
      ? route.fulfill({ status: 503, json: {} })
      : route.fulfill({
          json: forecast(Number(new URL(route.request().url()).searchParams.get('latitude'))),
        }),
  );
  return state;
}

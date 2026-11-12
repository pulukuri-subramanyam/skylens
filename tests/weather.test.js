import test from 'node:test';
import assert from 'node:assert/strict';
import { WeatherService } from '../src/lib/weather.js';
import { formatTemperature } from '../src/lib/storage.js';

const service = new WeatherService();

test('keeps different towns but removes provider duplicates near the same coordinates', () => {
  const town = { name: 'Nandyal', state: 'Andhra Pradesh', country: 'IN', lat: 15.48, lon: 78.48 };
  const duplicate = { ...town, lat: 15.481 };
  const otherTown = { ...town, state: 'Maharashtra', lat: 17.8, lon: 74.5 };
  const suggestions = service.combineCitySuggestions([town], 'Nandyal', [duplicate, otherTown]);
  assert.equal(suggestions.length, 2);
  assert.equal(service.rankCityLocations([otherTown, town], 'Nandyal, Andhra Pradesh')[0].state, 'Andhra Pradesh');
});

test('normalizes provider data, including sunrise fallback, hourly rain and missing daily rain', () => {
  const timestamp = Math.ceil(Date.now() / 1000) + 3600;
  const point = { dt: timestamp, temp: 20, feels_like: 19, humidity: 70, pressure: 1015, visibility: 9000, wind_speed: 2, weather: [{ description: 'clear sky', icon: '01d' }] };
  const daily = { ...point, temp: { max: 23, min: 15 }, sunrise: timestamp - 3600, sunset: timestamp + 3600 };
  const result = service.normalizeOpenWeatherData({ name: 'London', state: 'England', country: 'GB', lat: 51.5, lon: -.1 }, { timezone: 'Europe/London', data: [point] }, { data: [{ ...point, pop: .72 }, { ...point, dt: timestamp + 3600 }] }, { data: [daily] });
  assert.equal(result.currentData.current.temp_f, 68);
  assert.equal(result.currentData.current.sunrise, new Date(daily.sunrise * 1000).toISOString());
  assert.equal(result.forecastData.forecast.forecastday[0].hour[0].precipitation_probability_percent, 72);
  assert.equal(result.forecastData.forecast.forecastday[0].hour[1].precipitation_probability_percent, null);
  assert.equal(result.forecastData.forecast.forecastday[0].day.precipitation_probability_percent, null);
});

test('formats units and invalid times without inventing missing data', () => {
  assert.equal(formatTemperature(0, 'F'), '32°');
  assert.equal(formatTemperature(25, 'C'), '25°');
  assert.equal(formatTemperature(NaN, 'C'), 'Unavailable');
  assert.equal(service.formatLocationTime(null, 'Asia/Kolkata'), 'Unavailable');
  assert.equal(service.formatLocationTime('bad date', 'Asia/Kolkata'), 'Unavailable');
});

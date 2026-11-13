import { forecastUrl, normalizeMeteo } from '../lib/openMeteo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { readCities, readWeatherCache, writeStorage, uniqueRecentCities } from '../lib/storage';
import { weatherService as service } from '../lib/weather';

export function useWeather() {
  const [weather, setWeather] = useState(readWeatherCache);
  const [recent, setRecent] = useState(() => uniqueRecentCities(readCities('weatherapp-recent-cities')));
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [requestLabel, setRequestLabel] = useState('London');
  const active = useRef(null);
  const sequence = useRef(0);
  const current = useRef(weather);
  const lastAction = useRef({ kind: 'weather', target: weather?.currentCity || 'London' });

  const load = useCallback(async (target, { refresh = false } = {}) => {
    const id = ++sequence.current;
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    const keep = Boolean(refresh && current.current);
    setError(''); setStatus(''); setLoading(!keep); setRefreshing(keep);
    lastAction.current = { kind: 'weather', target };
    const targetName = typeof target === 'string' ? (/^-?[\d.]+,-?[\d.]+$/.test(target) ? 'your location' : target) : target.label || target.name || 'your location';
    setRequestLabel(targetName);
    try {
      // Suggestions and saved cities keep their exact coordinates when selected.
      const hasCoordinates = typeof target === 'object' && target.lat != null && target.lon != null && Number.isFinite(Number(target.lat)) && Number.isFinite(Number(target.lon));
      const location = hasCoordinates ? {
        ...target,
        state: target.state || target.region || (target.label?.includes(',') ? target.label.slice(target.label.indexOf(',') + 1).trim() : ''),
        lat: Number(target.lat), lon: Number(target.lon)
      } : await service.resolveLocation(typeof target === 'string' ? target : target.query);
      if (id !== sequence.current) return;
      const coordinates = { lat: location.lat, lon: location.lon };
      const request = type => service.fetchJson(service.getWeatherApiUrl(type, coordinates), { signal: controller.signal });
      const airRequest = request('air').catch(() => null);
      const payload = await service.fetchJson(forecastUrl(location.lat,location.lon), {signal:controller.signal});
      if (id !== sequence.current) return;
      const { currentData, forecastData } = normalizeMeteo(service,location,payload);
      const currentCity = service.createCityShortcut(currentData.location);
      const next = { currentWeatherData: currentData, forecastData, currentCity, lastAirQuality: null, weatherProvider: 'open-meteo', lastFetchedAt: Date.now() };
      current.current = next;
      setWeather(next);
      writeStorage('weatherapp-last-weather', next);
      setRecent(cities => uniqueRecentCities([currentCity, ...cities]));
      setStatus('Weather loaded for ' + currentCity.label + '.');
      airRequest.then(air => {
        if (id !== sequence.current) return;
        const updated = {...next,lastAirQuality:service.getAqiDetails(air)};
        current.current=updated;setWeather(updated);writeStorage('weatherapp-last-weather',updated);
      });
    } catch (cause) {
      if (id !== sequence.current || cause.name === 'AbortError') return;
      const message = cause.message.includes('No matching') ? 'City not found. Check the spelling or choose a suggestion.'
        : !navigator.onLine ? 'You appear to be offline.' : `Couldn't load weather for ${targetName}. Try again in a moment.`;
      setError(keep ? 'Refresh failed. Showing the last successful weather.' : current.current ? message + ' Showing the last successful weather.' : message);
    } finally {
      if (id === sequence.current) { setLoading(false); setRefreshing(false); }
    }
  }, []);

  const locate = useCallback(() => {
    const id = ++sequence.current;
    active.current?.abort();
    setLoading(true); setRefreshing(false); setError(''); setRequestLabel('your location');
    lastAction.current = { kind: 'location' };
    const fail = message => {
      if (id !== sequence.current) return;
      setLoading(false); setError(message);
    };
    if (!navigator.geolocation) return fail('This browser does not support location. Search for a city instead.');
    navigator.geolocation.getCurrentPosition(
      position => {
        if (id !== sequence.current) return;
        load(`${position.coords.latitude},${position.coords.longitude}`);
      },
      cause => fail(cause.code === 1 ? 'Location access was denied. Allow location in your browser settings or search for a city.'
        : cause.code === 3 ? 'Location lookup timed out. Check your device location settings or search for a city.'
          : 'Your location is unavailable. Search for a city instead.'),
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 300000 }
    );
  }, [load]);

  const retry = () => lastAction.current.kind === 'location' ? locate() : load(lastAction.current.target, { refresh: Boolean(current.current) });

  useEffect(() => {
    load(current.current?.currentCity || 'London', { refresh: Boolean(current.current) });
    return () => { sequence.current += 1; active.current?.abort(); };
  }, [load]);
  useEffect(() => { writeStorage('weatherapp-recent-cities', recent); }, [recent]);

  return { weather, recent, loading, refreshing, error, status, setStatus, load, locate, retry, requestLabel };
}

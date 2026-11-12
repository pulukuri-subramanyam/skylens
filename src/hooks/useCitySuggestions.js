import { useEffect, useMemo, useState } from 'react';
import { WeatherService } from '../lib/weather';

export function useCitySuggestions(query, saved, recent, enabled) {
  const service = useMemo(() => new WeatherService(saved, recent), [saved, recent]);
  const [result, setResult] = useState({ query: '', locations: [], loading: false });
  const valid = query.trim().replace(/\s/g, '').length >= 2 && !/^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(query);
  useEffect(() => {
    if (!enabled || !valid) return;
    const search = query.trim();
    const controller = new AbortController();
    const candidates = { weather: [], photon: [], india: [] };
    setResult({ query: search, locations: service.getLocalCitySuggestions(search), loading: true });
    const publish = loading => {
      if (!controller.signal.aborted) setResult({ query: search, locations: service.combineCitySuggestions(candidates.weather, search, candidates.photon, candidates.india), loading });
    };
    const timer = setTimeout(async () => {
      const receive = async (key, request) => {
        try { candidates[key] = await request; } catch { candidates[key] = []; }
        publish(true);
      };
      await Promise.all([
        receive('weather', service.fetchJson(service.getWeatherApiUrl('geocode', { q: search }), { signal: controller.signal })),
        receive('photon', service.fetchPhotonCitySuggestions(search, '', controller.signal)),
        receive('india', service.fetchPhotonCitySuggestions(search, 'IN', controller.signal))
      ]);
      publish(false);
    }, 120);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, service, enabled, valid]);
  return enabled && valid && result.query === query.trim() ? result : { locations: [], loading: enabled && valid };
}

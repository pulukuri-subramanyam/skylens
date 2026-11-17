import { useEffect, useMemo, useState } from 'react';
import { WeatherService } from '../lib/weather';
const cachedSuggestions = new Map();

export function useCitySuggestions(query, saved, recent, enabled) {
  const service = useMemo(() => new WeatherService(saved, recent), [saved, recent]);
  const [result, setResult] = useState({ query: '', locations: [], loading: false });
  const valid =
    query.trim().replace(/\s/g, '').length >= 2 &&
    !/^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(query);
  useEffect(() => {
    if (!enabled || !valid) return;
    const search = query.trim();
    const key = search.toLowerCase();
    const cached = cachedSuggestions.get(key);
    if (cached && Date.now() - cached.time < 60000) {
      setResult({
        query: search,
        locations: service.combineCitySuggestions(
          cached.locations.weather,
          search,
          cached.locations.photon,
          cached.locations.india,
        ),
        loading: false,
      });
      return;
    }
    const controller = new AbortController();
    const candidates = { weather: [], photon: [], india: [] };
    let successful = 0;
    setResult({ query: search, locations: service.getLocalCitySuggestions(search), loading: true });
    const publish = (loading) => {
      if (!controller.signal.aborted)
        setResult({
          query: search,
          locations: service.combineCitySuggestions(
            candidates.weather,
            search,
            candidates.photon,
            candidates.india,
          ),
          loading,
          failed: !loading && successful === 0,
        });
    };
    const timer = setTimeout(async () => {
      const receive = async (key, request) => {
        try {
          candidates[key] = await request;
          successful++;
        } catch {
          candidates[key] = [];
        }
        publish(true);
      };
      await Promise.all([
        receive(
          'weather',
          service.fetchJson(service.getWeatherApiUrl('geocode', { q: search }), {
            signal: controller.signal,
          }),
        ),
        receive('photon', service.fetchPhotonCitySuggestions(search, '', controller.signal)),
        receive('india', service.fetchPhotonCitySuggestions(search, 'IN', controller.signal)),
      ]);
      if (!controller.signal.aborted && successful > 0) {
        if (cachedSuggestions.size >= 100)
          cachedSuggestions.delete(cachedSuggestions.keys().next().value);
        cachedSuggestions.set(key, { time: Date.now(), locations: candidates });
      }
      publish(false);
    }, 120);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, service, enabled, valid]);
  return {
    ...(enabled && valid && result.query === query.trim()
      ? result
      : { locations: [], loading: enabled && valid }),
    valid,
  };
}

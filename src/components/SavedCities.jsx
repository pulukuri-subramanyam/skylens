import { useEffect, useRef, useState } from 'react';
import { weatherService as service } from '../lib/weather';
import { formatTemperature } from '../lib/storage';
import { weatherIconUrl } from '../lib/weatherIcons';
import { Icon } from './Icon';

export function SavedCities({ saved, recent, current, unit, onSelect, onMove, onRemove }) {
  const cache = useRef(new Map());
  const [readings, setReadings] = useState({});
  useEffect(() => {
    const controller = new AbortController();
    if (current?.currentCity) cache.current.set(current.currentCity.id, { temp: current.currentWeatherData.current.temp_c, icon: current.currentWeatherData.current.condition.iconCode, checkedAt: current.lastFetchedAt });
    setReadings(Object.fromEntries(cache.current));
    const fetchCities = async () => {
      await Promise.all(saved.slice(0, 8).map(async city => {
        if (city.lat == null || city.lon == null || !Number.isFinite(Number(city.lat)) || !Number.isFinite(Number(city.lon))) return;
        if (Date.now() - (cache.current.get(city.id)?.checkedAt || 0) < 900000) return;
        try {
          const payload = await service.fetchJson(service.getWeatherApiUrl('current', { lat: city.lat, lon: city.lon }), { signal: controller.signal });
          const point = payload.data?.[0];
          if (!controller.signal.aborted && Number.isFinite(Number(point?.temp))) cache.current.set(city.id, { temp: Number(point.temp), icon: service.getOpenWeatherIconCode(point.weather?.[0]), checkedAt: Date.now() });
        } catch { /* The saved-city button still works when its optional reading is unavailable. */ }
      }));
      if (!controller.signal.aborted) setReadings(Object.fromEntries(cache.current));
    };
    fetchCities();
    return () => controller.abort();
  }, [saved, current]);
  if (!saved.length && !recent.length) return null;
  return <section className="mb-5 grid gap-[10px]" aria-label="Saved and recent cities">
    {saved.length > 0 && <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
      <span className="w-[52px] text-xs font-semibold text-secondary">Saved</span>
      <div className="flex min-w-0 flex-wrap gap-2" role="group" aria-label="Saved cities">
        {saved.map((city, index) => <div key={city.id} className="saved-city-chip flex max-w-full items-center overflow-hidden rounded-full border border-line bg-surface">
          <button type="button" aria-label={`Show weather for ${city.label}`} aria-current={current?.currentCity?.id === city.id ? 'true' : undefined} onClick={() => onSelect(city)} className={`city-chip flex min-h-9 min-w-0 items-center gap-2 px-3 py-1.5 text-xs ${current?.currentCity?.id === city.id ? 'text-accent' : 'text-secondary'}`}>
            {readings[city.id] && <img className="city-chip-icon h-6 w-6" src={weatherIconUrl(readings[city.id].icon)} alt=""/>}<span title={city.label} className="max-w-[130px] truncate sm:max-w-[180px]">{city.name}</span>{readings[city.id] && <strong>{formatTemperature(readings[city.id].temp, unit)}</strong>}
          </button>
          <span className="flex border-l border-line px-1">
            {[['left', 'earlier', -1], ['right', 'later', 1]].map(([icon, label, direction]) => <button key={label} type="button" aria-label={`Move ${city.label} ${label}`} title={`Move ${city.label} ${label}`} disabled={direction < 0 ? index === 0 : index === saved.length - 1} onClick={() => onMove(index, direction)} className="flex h-8 w-[26px] items-center justify-center text-muted hover:text-accent disabled:opacity-30"><Icon name={icon} className="h-3.5 w-3.5"/></button>)}
            <button type="button" aria-label={`Remove ${city.label} from saved cities`} title={`Remove ${city.label}`} onClick={() => onRemove(city.id)} className="flex h-8 w-[26px] items-center justify-center text-muted hover:text-accent"><Icon name="close" className="h-3.5 w-3.5"/></button>
          </span>
        </div>)}
      </div>
    </div>}
    {recent.length > 0 && <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
      <span className="w-[52px] text-xs font-semibold text-secondary">Recent</span><div className="flex flex-wrap gap-2" role="group" aria-label="Recent cities">{recent.map(city => <button key={city.id} type="button" onClick={() => onSelect(city)} className={`min-h-9 rounded-full border bg-surface px-3 py-1.5 text-xs ${current?.currentCity?.id === city.id ? 'border-accent text-accent' : 'border-line text-secondary'}`}>{city.label}</button>)}</div>
    </div>}
  </section>;
}

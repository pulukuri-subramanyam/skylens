import { forecastUrl, condition } from '../lib/openMeteo';
import { useEffect, useRef, useState } from 'react';
import { weatherService as service } from '../lib/weather';
import { formatTemperature } from '../lib/storage';
import { weatherIconUrl } from '../lib/weatherIcons';
import { Icon } from './Icon';
import { useSavedCityDrag } from '../hooks/useSavedCityDrag';

export function SavedCities({ saved, recent, current, unit, onSelect, onMove, onRemove, onReorder }) {
  const cache = useRef(new Map());
  const {list,drag,start,move,finish,cancel} = useSavedCityDrag(onReorder);
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
          const payload = await service.fetchJson(forecastUrl(city.lat,city.lon,true), { signal: controller.signal });
          const point = payload.current;
          if (!controller.signal.aborted && Number.isFinite(Number(point?.temperature_2m))) cache.current.set(city.id, { temp: Number(point.temperature_2m), icon: condition(point.weather_code,point.is_day===1).icon, checkedAt: Date.now() });
        } catch { /* The saved-city button still works when its optional reading is unavailable. */ }
      }));
      if (!controller.signal.aborted) setReadings(Object.fromEntries(cache.current));
    };
    fetchCities();
    return () => controller.abort();
  }, [saved, current]);
  if (!saved.length && !recent.length) return null;
  return <section className="city-shortcuts" aria-label="Saved and recent cities">
    {saved.length > 0 && <div className="city-shortcut-group">
      <span className="city-shortcut-label">Saved</span>
      <span id="savedCityDragHelp" className="sr-only">Drag to another saved city and release to reorder. Use arrow keys or the earlier and later buttons to move one place. Press Escape to cancel dragging.</span>
      <div ref={list} className="city-chip-list" role="group" aria-label="Saved cities">
        {saved.map((city, index) => <div key={city.id} data-city-id={city.id} data-dragging={drag?.sourceId === city.id || undefined} data-drop-target={drag?.targetId === city.id && drag?.sourceId !== city.id || undefined} className="saved-city-chip">
          <button type="button" className="saved-city-drag" aria-label={`Reorder ${city.label}`} aria-describedby="savedCityDragHelp" title="Drag to reorder" disabled={saved.length < 2}
            onPointerDown={event=>start(event,city.id)} onPointerMove={move} onPointerUp={finish} onPointerCancel={cancel} onLostPointerCapture={cancel}
            onKeyDown={event=>{
              if (event.key === 'Escape') { event.preventDefault(); cancel(); }
              else if (['ArrowLeft','ArrowUp','ArrowRight','ArrowDown'].includes(event.key)) {
                event.preventDefault(); cancel(); onMove(index,['ArrowLeft','ArrowUp'].includes(event.key)?-1:1);
              }
            }}><Icon name="grip"/></button>
          <button type="button" aria-label={`Show weather for ${city.label}`} aria-current={current?.currentCity?.id === city.id ? 'true' : undefined} onClick={() => onSelect(city)} className={`city-chip ${current?.currentCity?.id === city.id ? 'is-current' : ''}`}>
            {readings[city.id] && <img className="city-chip-icon" src={weatherIconUrl(readings[city.id].icon)} alt=""/>}<span title={city.label} className="city-chip-name">{city.name}</span>{readings[city.id] && <strong>{formatTemperature(readings[city.id].temp, unit)}</strong>}
          </button>
          <span className="saved-city-controls">
            {[['left', 'earlier', -1], ['right', 'later', 1]].map(([icon, label, direction]) => <button key={label} type="button" aria-label={`Move ${city.label} ${label}`} title={`Move ${city.label} ${label}`} disabled={direction < 0 ? index === 0 : index === saved.length - 1} onClick={() => onMove(index, direction)} className="saved-city-control"><Icon name={icon}/></button>)}
            <button type="button" aria-label={`Remove ${city.label} from saved cities`} title={`Remove ${city.label}`} onClick={() => onRemove(city.id)} className="saved-city-control"><Icon name="close"/></button>
          </span>
        </div>)}
      </div>
    </div>}
    {recent.length > 0 && <div className="city-shortcut-group">
      <span className="city-shortcut-label">Recent</span><div className="city-chip-list" role="group" aria-label="Recent cities">{recent.map(city => <button key={city.id} type="button" onClick={() => onSelect(city)} className={`city-chip ${current?.currentCity?.id === city.id ? 'is-current' : ''}`}>{city.label}</button>)}</div>
    </div>}
  </section>;
}

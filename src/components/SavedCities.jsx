import { forecastUrl, condition } from '../lib/openMeteo';
import { useEffect, useRef, useState } from 'react';
import { weatherService as service } from '../lib/weather';
import { formatTemperature } from '../lib/storage';
import { weatherIconUrl } from '../lib/weatherIcons';
import { Icon } from './Icon';
import { useSavedCityDrag } from '../hooks/useSavedCityDrag';
import { CityMenu } from './CityMenu';

export function SavedCities({ saved, recent, current, unit, onSelect, onMove, onRemove, onReorder }) {
  const cache = useRef(new Map());
  const {list,drag,ordered,start,move,finish,cancel} = useSavedCityDrag(saved,onReorder);
  const [openMenu, setOpenMenu] = useState(null);
  const closeMenu = () => { cancel(); setOpenMenu(null); };
  const choose = city => { closeMenu(); onSelect(city); };
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
  return <section className="city-shortcuts" aria-label="Saved and recent cities">
    <CityMenu name="Recent" icon="history" count={recent.length} open={openMenu==='recent'} onToggle={()=>setOpenMenu(value=>value==='recent'?null:'recent')} onClose={closeMenu}>
      <div className="recent-city-list" role="group" aria-label="Recent cities">
        {recent.length ? recent.map(city=><button key={city.id} type="button" className="city-menu-item" onClick={()=>choose(city)}><Icon name="history"/><span>{city.label}</span>{current?.currentCity?.id===city.id&&<span className="current-city-dot"/>}</button>) : <p className="empty-city-menu">No recent cities yet.</p>}
      </div>
    </CityMenu>
    <CityMenu name="Saved" icon="check" count={saved.length} open={openMenu==='saved'} onToggle={()=>setOpenMenu(value=>value==='saved'?null:'saved')} onClose={closeMenu}>
      <span id="savedCityDragHelp" className="sr-only">Drag to another saved city and release to reorder. Focus the drag handle and use arrow keys to move one place. Press Escape to cancel dragging.</span>
      <div ref={list} className="city-chip-list saved-city-list" role="group" aria-label="Saved cities"
        onPointerMove={move} onPointerUp={finish} onPointerCancel={cancel} onLostPointerCapture={cancel}>
        {ordered.map((city, index) => <div key={city.id} data-city-id={city.id} data-dragging={drag?.sourceId === city.id || undefined} data-drop-target={drag?.targetId === city.id && drag?.sourceId !== city.id || undefined} className="saved-city-chip">
          <button type="button" className="saved-city-drag" aria-label={`Reorder ${city.label}`} aria-describedby="savedCityDragHelp" title="Drag to reorder" disabled={saved.length < 2}
            onPointerDown={event=>start(event,city.id)}
            onKeyDown={event=>{
              if (event.key === 'Escape') { event.preventDefault(); cancel(); }
              else if (['ArrowLeft','ArrowUp','ArrowRight','ArrowDown'].includes(event.key)) {
                event.preventDefault();
                if (drag) cancel();
                else onMove(index,['ArrowLeft','ArrowUp'].includes(event.key)?-1:1);
              }
            }}><Icon name="grip"/></button>
          <button type="button" aria-label={`Show weather for ${city.label}`} aria-current={current?.currentCity?.id === city.id ? 'true' : undefined} onClick={() => choose(city)} className={`city-chip ${current?.currentCity?.id === city.id ? 'is-current' : ''}`}>
            {readings[city.id] && <img className="city-chip-icon" src={weatherIconUrl(readings[city.id].icon)} alt=""/>}<span title={city.label} className="city-chip-name">{city.name}</span>{readings[city.id] && <strong>{formatTemperature(readings[city.id].temp, unit)}</strong>}
          </button>
          <span className="saved-city-controls">
            <button type="button" aria-label={`Remove ${city.label} from saved cities`} title={`Remove ${city.label}`} onClick={() => onRemove(city.id)} className="saved-city-control"><Icon name="close"/></button>
          </span>
        </div>)}
        {!saved.length&&<p className="empty-city-menu">No saved cities yet.</p>}
      </div>
    </CityMenu>
  </section>;
}

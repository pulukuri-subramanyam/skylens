import { lazy, Suspense, useState } from 'react';
import { DailyForecast } from './DailyForecast';
import { formatTemperature } from '../lib/storage';
const HourlyChart = lazy(() => import('./HourlyChart').then(module => ({default:module.HourlyChart})));

export function ForecastExplorer({ days, unit, theme, timeZone }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const selected = days.find(day => day.date === selectedDate);
  const dateLabel = selected ? new Date(selected.date).toLocaleDateString('en-US', {weekday:'long',month:'short',day:'numeric',...(timeZone ? {timeZone} : {})}) : '';
  const hours = selected ? selected.hour || [] : days.flatMap(day => day.hour || []).filter(hour=>Date.parse(hour.time)>=Date.now()-3600000).slice(0,24);
  return <>
    <DailyForecast days={days} unit={unit} timeZone={timeZone} selectedDate={selectedDate} onSelect={setSelectedDate}/>
    {selected && <section className="panel forecast-day-details" aria-live="polite" aria-label="Selected day details">
      <div className="forecast-detail-heading"><h3>{dateLabel}</h3><button type="button" className="control" onClick={()=>setSelectedDate(null)}>Back to next 24 hours</button></div>
      <p>{selected.day.condition.text}</p>
      <div className="forecast-detail-values"><span>High {formatTemperature(selected.day.maxtemp_c,unit)}{unit} / Low {formatTemperature(selected.day.mintemp_c,unit)}{unit}</span><span>Rain chance: {Number.isFinite(selected.day.precipitation_probability_percent) ? selected.day.precipitation_probability_percent+'%' : 'Unavailable'}</span><span>Wind: {Number.isFinite(selected.day.wind_kph) ? selected.day.wind_kph+' km/h' : 'Unavailable'}</span></div>
    </section>}
    {hours.length ? <Suspense fallback={<section className="panel p-5">Loading hourly chart...</section>}><HourlyChart days={[{hour:hours}]} unit={unit} theme={theme} timeZone={timeZone} title={selected ? `Hourly Forecast Â· ${dateLabel}` : 'Hourly Forecast'}/></Suspense> : <p className="chart-note" role="status">Hourly data is temporarily unavailable for {dateLabel}. Refresh to try again.</p>}
  </>;
}

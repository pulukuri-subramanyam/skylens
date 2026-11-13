import { lazy, Suspense, useState } from 'react';
import { DailyForecast } from './DailyForecast';
const HourlyChart = lazy(() => import('./HourlyChart').then(module => ({default:module.HourlyChart})));

export function ForecastExplorer({ days, unit, theme, timeZone }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const selected = days.find(day => day.date === selectedDate);
  const dateLabel = selected ? new Date(selected.date).toLocaleDateString('en-US', {weekday:'long',month:'short',day:'numeric',...(timeZone ? {timeZone} : {})}) : '';
  const hours = selected ? selected.hour || [] : days.flatMap(day => day.hour || []).filter(hour=>Date.parse(hour.time)>=Date.now()-3600000).slice(0,24);
  return <>
    <DailyForecast days={days} unit={unit} timeZone={timeZone} selectedDate={selectedDate} onSelect={date=>setSelectedDate(previous=>previous===date?null:date)}/>
    {hours.length ? <Suspense fallback={<section className="panel p-5">Loading hourly chart...</section>}><HourlyChart days={[{hour:hours}]} unit={unit} theme={theme} timeZone={timeZone} title={selected ? `Hourly Forecast · ${dateLabel}` : 'Hourly Forecast · Next 24 hours'}/></Suspense> : <p className="chart-note" role="status">Hourly data is temporarily unavailable for {dateLabel}. Refresh to try again.</p>}
  </>;
}

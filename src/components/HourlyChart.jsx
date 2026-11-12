import { useEffect, useRef, useState } from 'react';
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip } from 'chart.js';
import { weatherService } from '../lib/weather';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip);

export function HourlyChart({ days, unit, theme, timeZone }) {
  const canvas = useRef(null);
  const [metric, setMetric] = useState('temperature');
  const hours = days.flatMap(day => day.hour || []).slice(0, 24);
  const rainUnavailable = metric === 'rain' && !hours.some(hour => Number.isFinite(hour.precipitation_probability_percent));
  useEffect(() => {
    const data = days.flatMap(day => day.hour || []).slice(0, 24);
    const rain = metric === 'rain';
    const line = theme === 'dark' ? '#6ed4ca' : '#008d87';
    const text = theme === 'dark' ? '#c0cdd3' : '#607389';
    const chart = new Chart(canvas.current, {
      type: 'line',
      data: {
        labels: data.map(hour => weatherService.formatLocationTime(hour.time, timeZone)),
        datasets: [{ label: rain ? 'Rain chance (%)' : `Temperature (°${unit})`, data: data.map(hour => rain ? Number.isFinite(hour.precipitation_probability_percent) ? hour.precipitation_probability_percent : null : Math.round(unit === 'F' ? hour.temp_f : hour.temp_c)), borderColor: line, backgroundColor: theme === 'dark' ? 'rgba(110,212,202,.1)' : 'rgba(0,141,135,.09)', borderWidth: 2.5, fill: true, tension: .2, pointRadius: 3, pointHoverRadius: 5, pointBackgroundColor: line, pointBorderColor: theme === 'dark' ? '#152330' : '#fff', pointBorderWidth: 1.5 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: { tooltip: { displayColors: false, callbacks: { label: context => rain ? `${context.parsed.y}% rain chance` : `${context.parsed.y}°${unit}` } } },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { color: text, maxTicksLimit: 8, font: { family: 'Inter, sans-serif', size: 11 } } },
          y: { ...(rain ? { min: 0, max: 100 } : {}), grid: { color: theme === 'dark' ? 'rgba(213,228,232,.12)' : 'rgba(23,38,56,.1)' }, border: { display: false }, ticks: { color: text, callback: value => rain ? value + '%' : value + '°' + unit, font: { family: 'Inter, sans-serif', size: 11 } } }
        }
      }
    });
    return () => chart.destroy();
  }, [days, unit, metric, theme, timeZone]);
  return <section className="panel p-4 sm:p-5" aria-labelledby="hourlyHeading">
    <div className="mb-[18px] flex flex-col items-start justify-between gap-[10px] min-[481px]:flex-row min-[481px]:items-center">
      <h3 id="hourlyHeading" className="text-[19px] font-semibold tracking-[-.03em]">Hourly Forecast</h3>
      <div className="flex self-stretch rounded-lg border border-line p-0.5 min-[481px]:self-auto" role="group" aria-label="Hourly forecast metric">
        {[['temperature', 'Temperature', 'chartTemperatureBtn'], ['rain', 'Rain chance', 'chartRainBtn']].map(([value, label, id]) => <button key={value} id={id} type="button" aria-pressed={metric === value} onClick={() => setMetric(value)} className={`min-h-8 flex-1 rounded-md px-3 py-1.5 text-xs ${metric === value ? 'bg-accent text-on-accent' : 'text-secondary'}`}>{label}</button>)}
      </div>
    </div>
    <div className="relative h-[180px] min-w-0 sm:h-[220px]"><canvas ref={canvas} id="temperatureChart" role="img" aria-label={metric === 'rain' ? 'Hourly rain probability, percent' : 'Hourly temperature, degrees ' + unit} data-metric={metric}/></div>
    {rainUnavailable && <p className="mt-2 text-xs text-muted">Hourly rain probability is unavailable. Refresh to check for newer data.</p>}
  </section>;
}

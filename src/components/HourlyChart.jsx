import { useEffect, useRef, useState } from 'react';
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip } from 'chart.js';
import { weatherService } from '../lib/weather';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip);
Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";

export function HourlyChart({ days, unit, theme, timeZone, title = 'Hourly Forecast' }) {
  const canvas = useRef(null);
  const [metric, setMetric] = useState('temperature');
  const hours = days.flatMap(day => day.hour || []).slice(0, 24);
  const rainUnavailable = metric === 'rain' && !hours.some(hour => Number.isFinite(hour.precipitation_probability_percent));
  useEffect(() => {
    const data = days.flatMap(day => day.hour || []).slice(0, 24);
    const rain = metric === 'rain';
    const styles = getComputedStyle(document.documentElement);
    const line = styles.getPropertyValue('--chart-line-color').trim();
    const text = styles.getPropertyValue('--chart-text-color').trim();
    const chart = new Chart(canvas.current, {
      type: 'line',
      data: {
        labels: data.map(hour => weatherService.formatLocationTime(hour.time, timeZone)),
        datasets: [{ label: rain ? 'Rain chance (%)' : `Temperature (\u00b0${unit})`, data: data.map(hour => rain ? Number.isFinite(hour.precipitation_probability_percent) ? hour.precipitation_probability_percent : null : Number.isFinite(hour.temp_c) ? Math.round(unit === 'F' ? hour.temp_f : hour.temp_c) : null), borderColor: line, backgroundColor: context => {
          const {ctx,chartArea}=context.chart;
          if(!chartArea) return styles.getPropertyValue('--chart-fill-color').trim();
          const gradient=ctx.createLinearGradient(0,chartArea.top,0,chartArea.bottom);
          gradient.addColorStop(0,theme==='dark'?'rgba(130,185,255,.24)':'rgba(40,100,237,.24)');
          gradient.addColorStop(1,theme==='dark'?'rgba(130,185,255,.015)':'rgba(40,100,237,.015)');
          return gradient;
        }, borderWidth: 3.5, fill: true, tension: .2, pointRadius: context=>context.dataIndex%4===0?4.5:2.5, pointHoverRadius: 6, pointBackgroundColor: context=>context.dataIndex%4===0?styles.getPropertyValue('--chart-point-border').trim():line, pointBorderColor: line, pointBorderWidth: context=>context.dataIndex%4===0?3:1.5 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: matchMedia('(prefers-reduced-motion: reduce)').matches ? false : undefined,
        interaction: { intersect: false, mode: 'index' },
        elements: { point: { hoverBorderWidth: 3 } },
        plugins: { tooltip: { backgroundColor: '#17243b', titleColor: '#ffffff', bodyColor: '#c9d7ea', borderColor: line, borderWidth: 1, cornerRadius: 11, displayColors: false, callbacks: {
          title: context => new Date(data[context[0].dataIndex].time).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', hour12: true, ...(timeZone ? {timeZone} : {}) }),
          label: context => {
            const hour=data[context.dataIndex];
            const temperature=Number.isFinite(hour.temp_c)?Math.round(unit==='F'?hour.temp_f:hour.temp_c)+'°'+unit:'Temperature unavailable';
            const probability=Number.isFinite(hour.precipitation_probability_percent)?'Rain '+hour.precipitation_probability_percent+'%':'Rain probability unavailable';
            return [temperature,probability];
          }
        } } },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { color: text, maxTicksLimit: 8, maxRotation: 0, callback: function(value) { return this.getLabelForValue(value).replace(':00',''); } } },
          y: { ...(rain ? { min: 0, max: 100 } : {}), grid: { color: styles.getPropertyValue('--chart-grid-color').trim() }, border: { display: false, dash:[4,6] }, ticks: { color: text, maxTicksLimit:5, callback: value => rain ? value + '%' : value + '\u00b0' + unit } }
        }
      }
    });
    const container = canvas.current.parentElement;
    // Keep the drawing buffer current even if an animation-frame resize is delayed.
    const syncSize = () => {
      const width = container.clientWidth, height = container.clientHeight;
      if (!width || !height) return;
      const ratio = chart.currentDevicePixelRatio || window.devicePixelRatio || 1;
      if (Math.abs(chart.canvas.width / ratio - width) <= 1 &&
          Math.abs(chart.canvas.height / ratio - height) <= 1) return;
      chart.stop();
      chart.resize(width, height);
    };
    const observer = new ResizeObserver(syncSize);
    observer.observe(container);
    window.addEventListener('resize', syncSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncSize);
      chart.destroy();
    };
  }, [days, unit, metric, theme, timeZone]);
  return <section className="chart-section glassmorphism" aria-labelledby="hourlyHeading">
    <div className="chart-heading">
      <div><p className="eyebrow">{title==='Hourly Forecast'?'Next 24 hours':title.replace('Hourly Forecast - ','')}</p><h3 id="hourlyHeading" className="section-title">{metric==='rain'?'Rain probability':'Temperature trend'}</h3></div>
      <div className="chart-toggle" role="group" aria-label="Hourly forecast metric">
        {[['temperature', 'Temperature', 'chartTemperatureBtn'], ['rain', 'Rain chance', 'chartRainBtn']].map(([value, label, id]) => <button key={value} id={id} type="button" aria-pressed={metric === value} onClick={() => setMetric(value)}>{label}</button>)}
      </div>
    </div>
    <div className="chart-container"><canvas ref={canvas} id="temperatureChart" role="img" aria-label={metric === 'rain' ? 'Hourly rain probability, percent' : 'Hourly temperature, degrees ' + unit} data-metric={metric}/></div>
    {rainUnavailable && <p className="chart-note">Hourly rain probability is unavailable. Refresh to check for newer data.</p>}
    <div className="sr-only"><table><caption>{title} readings</caption><thead><tr><th scope="col">Local time</th><th scope="col">Temperature</th><th scope="col">Rain chance</th></tr></thead><tbody>{hours.map(hour=><tr key={hour.time}><th scope="row">{weatherService.formatLocationTime(hour.time,timeZone)}</th><td>{Number.isFinite(hour.temp_c) ? Math.round(unit==='F'?hour.temp_f:hour.temp_c)+'°'+unit : 'Unavailable'}</td><td>{Number.isFinite(hour.precipitation_probability_percent)?hour.precipitation_probability_percent+'%':'Unavailable'}</td></tr>)}</tbody></table></div>
  </section>;
}

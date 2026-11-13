import { useEffect, useRef, useState } from 'react';
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip } from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip);

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
        labels: data.map(hour => new Intl.DateTimeFormat('en-US', { hour: 'numeric', ...(timeZone ? { timeZone } : {}) }).format(new Date(hour.time))),
        datasets: [{ label: rain ? 'Rain chance (%)' : `Temperature (\u00b0${unit})`, data: data.map(hour => rain ? Number.isFinite(hour.precipitation_probability_percent) ? hour.precipitation_probability_percent : null : Math.round(unit === 'F' ? hour.temp_f : hour.temp_c)), borderColor: line, backgroundColor: styles.getPropertyValue('--chart-fill-color').trim(), borderWidth: 3, fill: true, tension: .2, pointRadius: 3, pointHoverRadius: 7, pointBackgroundColor: line, pointBorderColor: styles.getPropertyValue('--chart-point-border').trim(), pointBorderWidth: 2 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        elements: { point: { hoverBorderWidth: 3 } },
        plugins: { tooltip: { backgroundColor: 'rgba(0, 0, 0, 0.8)', titleColor: '#ffffff', bodyColor: '#ffffff', borderColor: line, borderWidth: 1, cornerRadius: 8, displayColors: false, callbacks: { title: context => new Date(data[context[0].dataIndex].time).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', hour12: true, ...(timeZone ? {timeZone} : {}) }), label: context => rain ? `${context.parsed.y}% rain chance` : `${context.parsed.y}\u00b0${unit}` } } },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { color: text, autoSkip: false, maxRotation: 0, font: { size: 10 } } },
          y: { ...(rain ? { min: 0, max: 100 } : {}), grid: { color: styles.getPropertyValue('--chart-grid-color').trim() }, border: { display: false }, ticks: { color: text, stepSize: rain ? 10 : 1, autoSkip: false, callback: value => rain ? value + '%' : value + '\u00b0' + unit } }
        }
      }
    });
    return () => chart.destroy();
  }, [days, unit, metric, theme, timeZone]);
  return <section className="chart-section glassmorphism" aria-labelledby="hourlyHeading">
    <div className="chart-heading">
      <h3 id="hourlyHeading" className="section-title">{title}</h3>
      <div className="chart-toggle" role="group" aria-label="Hourly forecast metric">
        {[['temperature', 'Temperature', 'chartTemperatureBtn'], ['rain', 'Rain chance', 'chartRainBtn']].map(([value, label, id]) => <button key={value} id={id} type="button" aria-pressed={metric === value} onClick={() => setMetric(value)}>{label}</button>)}
      </div>
    </div>
    <div className="chart-scroll" tabIndex={0} role="region" aria-label="Hourly chart. Scroll horizontally to see every hour on smaller screens."><div className="chart-container" style={{height: Math.max(300, metric === 'rain' ? 300 : (Math.ceil(Math.max(...hours.map(h=>unit === 'F' ? h.temp_f : h.temp_c))) - Math.floor(Math.min(...hours.map(h=>unit === 'F' ? h.temp_f : h.temp_c))) + 1) * 22 + 40)}}><canvas ref={canvas} id="temperatureChart" role="img" aria-label={metric === 'rain' ? 'Hourly rain probability, percent' : 'Hourly temperature, degrees ' + unit} data-metric={metric}/></div></div>
    {rainUnavailable && <p className="chart-note">Hourly rain probability is unavailable. Refresh to check for newer data.</p>}
  </section>;
}

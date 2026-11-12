import { weatherIconUrl } from '../lib/weatherIcons';
import { formatTemperature } from '../lib/storage';
import { Icon } from './Icon';

export function DailyForecast({ days, unit, timeZone }) {
  const low = Math.min(...days.map(day => day.day.mintemp_c));
  const range = Math.max(1, Math.max(...days.map(day => day.day.maxtemp_c)) - low);
  return <section className="forecast-section glassmorphism" aria-labelledby="dailyHeading">
    <h3 id="dailyHeading" className="section-title">7-Day Forecast</h3>
    <div id="forecastGrid" className="forecast-grid">
      {days.map((entry, index) => {
        const { day } = entry;
        const date = new Date(entry.date);
        const options = timeZone ? { timeZone } : {};
        const name = index === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short', ...options });
        const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...options });
        const start = Math.max(0, Math.min(100, (day.mintemp_c - low) / range * 100));
        const width = Math.max(2, Math.min(100 - start, (day.maxtemp_c - day.mintemp_c) / range * 100));
        const rain = day.precipitation_probability_percent;
        return <div key={entry.date} aria-label={`${name}, ${label}. ${day.condition.text}. Low ${formatTemperature(day.mintemp_c, unit)}, high ${formatTemperature(day.maxtemp_c, unit)} ${unit}.`} className={`forecast-item ${index===0?'is-today':''}`}>
          <div className="forecast-date">{name}<br/><small>{label}</small></div>
          <img className="forecast-icon" src={weatherIconUrl(day.condition.iconCode)} alt="" title={day.condition.text}/>
          <div className="forecast-temps">
            <span className="temp-min">{formatTemperature(day.mintemp_c, unit)}</span>
            <span className="forecast-range" aria-hidden="true"><span className="forecast-range-fill" style={{ left: start + '%', width: width + '%' }}/></span>
            <span className="temp-max">{formatTemperature(day.maxtemp_c, unit)}</span>
          </div>
          <p className="forecast-rain" aria-label={Number.isFinite(rain) ? `${rain}% rain chance` : 'Rain chance unavailable'}><Icon name="drop" className=""/>{Number.isFinite(rain) ? rain + '%' : 'N/A'}</p>
        </div>;
      })}
    </div>
  </section>;
}

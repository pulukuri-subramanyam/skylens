import { weatherIconUrl } from '../lib/weatherIcons';
import { formatTemperature } from '../lib/storage';
import { Icon } from './Icon';

export function DailyForecast({ days, unit, timeZone }) {
  const low = Math.min(...days.map(day => day.day.mintemp_c));
  const range = Math.max(1, Math.max(...days.map(day => day.day.maxtemp_c)) - low);
  return <section className="panel p-4 sm:p-5" aria-labelledby="dailyHeading">
    <h3 id="dailyHeading" className="mb-4 text-[19px] font-semibold tracking-[-.03em]">7-Day Forecast</h3>
    <div id="forecastGrid" className="grid grid-cols-1 min-[761px]:grid-cols-7 min-[761px]:gap-[10px]">
      {days.map((entry, index) => {
        const { day } = entry;
        const date = new Date(entry.date);
        const options = timeZone ? { timeZone } : {};
        const name = index === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short', ...options });
        const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...options });
        const start = Math.max(0, Math.min(100, (day.mintemp_c - low) / range * 100));
        const width = Math.max(2, Math.min(100 - start, (day.maxtemp_c - day.mintemp_c) / range * 100));
        const rain = day.precipitation_probability_percent;
        return <div key={entry.date} aria-label={`${name}, ${label}. ${day.condition.text}. Low ${formatTemperature(day.mintemp_c, unit)}, high ${formatTemperature(day.maxtemp_c, unit)} ${unit}.`} className={`forecast-item grid grid-cols-[56px_28px_44px_minmax(0,1fr)] items-center gap-1.5 border-b border-line py-[10px] last:border-b-0 min-[481px]:grid-cols-[80px_40px_64px_minmax(0,1fr)] min-[481px]:gap-3 min-[761px]:flex min-[761px]:flex-col min-[761px]:gap-[7px] min-[761px]:rounded-[10px] min-[761px]:border min-[761px]:px-1.5 min-[761px]:py-3.5 min-[761px]:last:border-b ${index === 0 ? 'min-[761px]:border-accent/40 min-[761px]:bg-accent/5' : ''}`}>
          <div className="text-xs leading-snug font-semibold min-[481px]:text-[13px] min-[761px]:text-center">{name}<small className="block text-[9px] font-normal text-muted sm:text-[10px]">{label}</small></div>
          <img className="h-[27px] w-[27px] min-[481px]:h-8 min-[481px]:w-8 min-[761px]:h-10 min-[761px]:w-10" src={weatherIconUrl(day.condition.iconCode)} alt="" title={day.condition.text}/>
          <div className="col-start-4 row-start-1 flex items-center gap-[5px] min-[481px]:gap-[10px] min-[761px]:order-1 min-[761px]:gap-2">
            <span className="temp-min w-[23px] shrink-0 text-xs text-muted min-[761px]:order-2 min-[761px]:w-auto min-[761px]:text-[15px]">{formatTemperature(day.mintemp_c, unit)}</span>
            <span className="relative h-[5px] min-w-3 flex-1 overflow-hidden rounded-full bg-line min-[761px]:hidden" aria-hidden="true"><span className="absolute inset-y-0 rounded-full bg-accent" style={{ left: start + '%', width: width + '%' }}/></span>
            <span className="temp-max w-[23px] shrink-0 text-xs font-semibold min-[761px]:w-auto min-[761px]:text-[15px]">{formatTemperature(day.maxtemp_c, unit)}</span>
          </div>
          <p className="forecast-rain col-start-3 row-start-1 flex items-center gap-1 text-[11px] text-secondary min-[761px]:order-2 min-[761px]:text-xs" aria-label={Number.isFinite(rain) ? `${rain}% rain chance` : 'Rain chance unavailable'}><Icon name="drop" className="h-3 w-3 text-[#309ac6]"/>{Number.isFinite(rain) ? rain + '%' : 'N/A'}</p>
        </div>;
      })}
    </div>
  </section>;
}

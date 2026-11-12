import { Icon } from './Icon';
import { weatherService as service } from '../lib/weather';
import { weatherIconUrl } from '../lib/weatherIcons';
import { formatTemperature } from '../lib/storage';

function DaylightBar({ current, timeZone, now }) {
  const sunrise = Date.parse(current.sunrise);
  const sunset = Date.parse(current.sunset);
  const valid = Number.isFinite(sunrise) && Number.isFinite(sunset) && sunset > sunrise;
  const progress = valid ? Math.max(0, Math.min(1, (now - sunrise) / (sunset - sunrise))) : 0;
  const night = valid && (now < sunrise || now > sunset);
  const label = !valid ? 'Daylight information unavailable' : now < sunrise ? 'Sunrise at ' + service.formatLocationTime(current.sunrise, timeZone) : now > sunset ? 'Sunset at ' + service.formatLocationTime(current.sunset, timeZone) : Math.round(progress * 100) + '% through daylight';
  return <div className="mt-[18px] grid grid-cols-2 items-center gap-x-4 gap-y-3 border-t border-line pt-4 min-[600px]:grid-cols-[auto_1fr_auto] min-[600px]:gap-x-8" aria-label="Daylight progress">
    <p className="flex items-center gap-1 text-[10px] text-secondary sm:gap-2 sm:text-xs"><Icon name="sun" className="h-[18px] w-[18px] shrink-0 text-[#dc9129]"/>Sunrise <span id="sunriseTime" className="font-semibold text-ink">{service.formatLocationTime(current.sunrise, timeZone)}</span></p>
    <div className={`relative col-span-2 row-start-2 h-[5px] rounded-full bg-line min-[600px]:col-span-1 min-[600px]:col-start-2 min-[600px]:row-start-1 ${!valid ? 'opacity-30' : ''}`} aria-hidden="true">
      <span className={`absolute inset-y-0 left-0 rounded-full ${night ? 'bg-slate-400' : 'bg-accent'}`} style={{ width: progress * 100 + '%' }}/>
      {valid && <Icon name="sun" className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 ${night ? 'text-slate-400' : 'text-accent'}`} style={{ left: progress * 100 + '%' }}/>}
    </div>
    <p className="flex items-center justify-end gap-1 text-[10px] text-secondary sm:gap-2 sm:text-xs"><Icon name="moon" className="h-[18px] w-[18px] shrink-0 text-[#dc9129]"/>Sunset <span id="sunsetTime" className="font-semibold text-ink">{service.formatLocationTime(current.sunset, timeZone)}</span></p>
    <span className="col-span-2 text-center text-[10px] text-muted min-[600px]:col-span-1 min-[600px]:col-start-2" id="sunProgressLabel">{label}</span>
  </div>;
}

export function WeatherCard({ weather, unit, now, saved, onSave, onShare, onRefresh, refreshing, error }) {
  const { currentWeatherData: { current, location }, forecastData, lastAirQuality: aqi, currentCity, lastFetchedAt } = weather;
  const today = forecastData.forecast.forecastday[0].day;
  const metrics = [
    ['Humidity', current.humidity + '%', 'drop', 'text-[#309ac6]', 'humidity'],
    ['Wind', current.wind_kph + ' km/h', 'wind', 'text-accent', 'windSpeed'],
    ['Visibility', current.vis_km + ' km', 'eye', 'text-accent', 'visibility'],
    ['Pressure', current.pressure_mb + ' hPa', 'pressure', 'text-accent', 'pressure'],
    ['UV Index', current.uv, 'sun', 'text-[#dc9129]', 'uvIndex'],
    ['Air quality', aqi?.label || 'Unavailable', 'air', 'text-[#438154]', 'airQuality']
  ];
  let localTime = 'Unavailable';
  try { if (location.timezone) localTime = new Intl.DateTimeFormat(undefined, { timeZone: location.timezone, hour: 'numeric', minute: '2-digit' }).format(now); } catch { /* Unknown provider time zone. */ }
  const stale = now - lastFetchedAt >= 900000;
  return <section className="panel p-4 sm:p-5 lg:p-6" aria-label="Current weather">
    <div className="grid gap-4 min-[761px]:grid-cols-[1.4fr_1fr] min-[761px]:gap-x-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="locationName" className="mr-auto min-w-0 text-xl leading-tight font-semibold tracking-[-.04em] wrap-anywhere lg:text-[26px]">{currentCity.label}</h2>
          <button id="saveCityBtn" type="button" onClick={onSave} aria-label={saved ? `Remove ${currentCity.label} from saved cities` : `Save ${currentCity.label} to saved cities`} aria-pressed={saved} className={`control p-1.5 text-xs sm:px-2 ${saved ? 'text-accent' : ''}`}><Icon name="star" data-filled={saved ? 'true' : undefined} className="h-3.5 w-3.5"/><span className="hidden sm:inline">{saved ? 'Saved' : 'Save'}</span></button>
          <button id="shareWeatherBtn" type="button" aria-label="Share weather" onClick={onShare} className="control p-1.5 text-xs sm:px-2"><Icon name="share" className="h-3.5 w-3.5"/><span className="hidden sm:inline">Share</span></button>
        </div>
        <p className="mt-[7px] text-xs text-secondary">Local time <time id="cityLocalTime" dateTime={new Date(now).toISOString()}>{localTime}</time></p>
        <div className="mt-[5px] flex flex-wrap items-center gap-[10px]">
          <p className="text-xs text-muted" id="lastUpdated">Last updated: {service.formatTime(current.last_updated)}</p>
          <button id="refreshBtn" type="button" onClick={onRefresh} disabled={refreshing} className="control px-2 py-1 text-xs" aria-label={refreshing ? 'Refreshing weather' : 'Refresh weather'}><Icon name="refresh" className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}/>{refreshing ? 'Refreshing…' : 'Refresh'}</button>
        </div>
        <p id="dataFreshness" className={`${error || stale ? 'mt-2 text-xs text-muted' : 'sr-only'}`}>{error ? 'Refresh failed. Showing the last successful weather.' : stale ? 'May be outdated. Checked ' + service.formatTime(new Date(lastFetchedAt).toISOString()) : 'Checked ' + service.formatTime(new Date(lastFetchedAt).toISOString())}</p>
        <div className="mt-6 grid grid-cols-[54px_auto_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[70px_auto_minmax(0,1fr)] sm:gap-3 lg:mt-8 lg:grid-cols-[80px_auto_minmax(0,1fr)]">
          <img className="h-[54px] w-[54px] sm:h-[70px] sm:w-[70px] lg:h-20 lg:w-20" src={weatherIconUrl(current.condition.iconCode)} alt=""/>
          <span className="text-[42px] leading-none font-semibold tracking-[-.065em] whitespace-nowrap sm:text-[56px] lg:text-[64px]" id="currentTemp">{formatTemperature(current.temp_c, unit)}{unit}</span>
          <div className="min-w-0 border-l border-line pl-[10px] text-[11px] text-secondary sm:pl-4 sm:text-xs">
            <p className="mb-1 text-xs font-semibold text-ink sm:text-sm" id="currentCondition">{current.condition.text}</p>
            <p>Feels like <span id="feelsLike">{formatTemperature(current.feelslike_c, unit)}{unit}</span></p>
            <p>High <span id="todayHigh">{formatTemperature(today.maxtemp_c, unit)}</span> / Low <span id="todayLow">{formatTemperature(today.mintemp_c, unit)}</span></p>
          </div>
        </div>
        <p id="weatherSummary" className="mt-4 text-xs text-secondary sm:text-sm">{current.condition.text}. Wind {current.wind_kph} km/h.</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-[10px] min-[761px]:border-l min-[761px]:border-line min-[761px]:pl-5">
        {metrics.map(([label, value, icon, color, id]) => <div key={id} className="flex min-h-[58px] min-w-0 items-center gap-2 rounded-[9px] border border-line px-2 py-2 sm:gap-[10px] sm:px-3 sm:py-[10px]">
          <Icon name={icon} className={`h-5 w-5 shrink-0 ${color}`}/><div className="min-w-0"><span className="block text-[11px] leading-snug text-muted">{label}</span><span className="block text-sm leading-snug font-semibold sm:text-[15px]" id={id}>{value}{id === 'windSpeed' && <small className="ml-1 text-[10px] font-normal text-muted" id="windDirection">{current.wind_dir}</small>}</span>
          {id === 'airQuality' && Number.isFinite(aqi?.pm25) && <small className="block text-[9px] text-muted" id="airPm25">PM2.5 {Math.round(aqi.pm25)} µg/m³</small>}</div>
        </div>)}
      </div>
    </div>
    <DaylightBar current={current} timeZone={location.timezone} now={now}/>
  </section>;
}

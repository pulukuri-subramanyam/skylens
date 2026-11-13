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
  return <div className={`sun-progress ${!valid ? 'is-unavailable' : night ? 'is-night' : ''}`} id="sunProgress" aria-label={`Daylight progress: ${label}`}>
    <p className="sun-time"><Icon name="sun"/> Sunrise <span id="sunriseTime">{service.formatLocationTime(current.sunrise,timeZone)}</span></p>
    <div className="sun-progress-track" aria-hidden="true"><span className="sun-progress-fill" id="sunProgressFill" style={{width:progress*100+'%'}}/><Icon name={night ? "moon" : "sun"} className="sun-progress-marker" id="sunProgressMarker" style={{left:progress*100+'%'}}/></div>
    <p className="sun-time"><Icon name="moon"/> Sunset <span id="sunsetTime">{service.formatLocationTime(current.sunset,timeZone)}</span></p>
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
  return <section className="current-weather-card glassmorphism" aria-label="Current weather">
    <div className="current-weather-header"><div className="location-info"><div className="location-heading-row">
      <h2 id="locationName" className="location-name">{currentCity.label}</h2>
      <button id="saveCityBtn" type="button" onClick={onSave} aria-label={saved ? `Remove ${currentCity.label} from saved cities` : `Save ${currentCity.label} to saved cities`} aria-pressed={saved} className={`save-city-btn ${saved?'is-saved':''}`}><Icon name="star"/><span>{saved?'Saved':'Save'}</span></button>
      <button id="shareWeatherBtn" type="button" aria-label="Share weather" onClick={onShare} className="share-weather-btn"><Icon name="share"/><span>Share</span></button>
    </div><p className="city-local-time"><span>Local time</span><time id="cityLocalTime" dateTime={new Date(now).toISOString()}>{localTime}</time></p>
    <div className="location-meta-row"><div className="location-meta-copy"><p className="last-updated" id="lastUpdated">Last updated: {service.formatTime(current.last_updated)}</p>
      <span id="dataFreshness" className={`data-freshness ${error||stale?'is-stale':''}`}>{error?'Refresh failed. Showing the last successful weather.':(stale?'May be outdated. Checked ':'Checked ')+service.formatTime(new Date(lastFetchedAt).toISOString())}</span></div>
      <button id="refreshBtn" type="button" onClick={onRefresh} disabled={refreshing} className="refresh-btn" aria-label="Refresh weather" title="Refresh weather"><Icon name="refresh" className={refreshing?'animate-spin':''}/><span>{refreshing?'Refreshing...':'Refresh'}</span></button>
    </div></div></div>
    <div className="temperature-section"><div className="weather-icon-container"><img className="weather-icon" id="currentWeatherIcon" src={weatherIconUrl(current.condition.iconCode)} alt=""/></div>
      <div className="main-temperature"><span className="temperature" id="currentTemp">{formatTemperature(current.temp_c,unit) + unit}</span></div>
      <div className="condition-copy"><span className="condition" id="currentCondition">{current.condition.text}</span><div className="feels-like">Feels like <span id="feelsLike">{formatTemperature(current.feelslike_c,unit) + unit}</span></div><p className="today-range">High <span id="todayHigh">{formatTemperature(today.maxtemp_c,unit)}</span> / Low <span id="todayLow">{formatTemperature(today.mintemp_c,unit)}</span></p></div>
    </div>
    <div className="weather-details-grid">{metrics.map(([label,value,icon,color,id])=><div key={id} className="detail-item"><Icon name={icon} className="detail-icon"/><div className="detail-content"><span className="detail-label">{label}</span><span className="detail-value"><span id={id}>{value}</span>{id==='windSpeed'&&<> <small id="windDirection">{current.wind_dir}</small></>}</span>{id==='airQuality'&&Number.isFinite(aqi?.pm25)&&<small className="air-pm25" id="airPm25">PM2.5 {Math.round(aqi.pm25)} {'\u00b5'}g/m{'\u00b3'}</small>}</div></div>)}</div>
    <DaylightBar current={current} timeZone={location.timezone} now={now}/>
  </section>;
}

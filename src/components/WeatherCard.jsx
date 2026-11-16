import { useRef } from 'react';
import { Icon } from './Icon';
import { DaylightBar } from './DaylightBar';
import { WeatherMetrics } from './WeatherMetrics';
import { weatherService as service } from '../lib/weather';
import { weatherIconUrl } from '../lib/weatherIcons';
import { formatTemperature } from '../lib/storage';
import { useReadingFade } from '../hooks/useReadingFade';

export function WeatherCard({ weather, unit, now, saved, onSave, onRefresh, refreshing, error }) {
  const card=useRef(null);
  useReadingFade(card,weather,unit);
  const {currentWeatherData:{current,location},forecastData,lastAirQuality,currentCity,lastFetchedAt}=weather;
  const today=forecastData.forecast.forecastday[0].day;
  let localTime='Unavailable',localDate='Unavailable';
  try {
    if(location.timezone) {
      localTime=new Intl.DateTimeFormat(undefined,{timeZone:location.timezone,hour:'numeric',minute:'2-digit'}).format(now);
      localDate=new Intl.DateTimeFormat('en-US',{timeZone:location.timezone,weekday:'long',month:'long',day:'numeric'}).format(now);
    }
  } catch { /* Unknown provider time zone. */ }
  const stale=now-lastFetchedAt>=900000;
  const temperature=Number.isFinite(current.temp_c)?Math.round(unit==='F'?current.temp_f:current.temp_c):null;
  return <section ref={card} className="current-weather-card weather-hero" aria-label="Current weather">
    <div className="weather-rings" aria-hidden="true"/>
    <div className="current-weather-header"><div className="location-info">
      <div className="location-heading-row"><h2 id="locationName" className="location-name">{currentCity.label}</h2>
        <button id="saveCityBtn" type="button" onClick={onSave} aria-label={saved?`Remove ${currentCity.label} from saved cities`:`Save ${currentCity.label} to saved cities`} aria-pressed={saved} className={`save-city-btn ${saved?'is-saved':''}`}><Icon name="bookmark" fill={saved?'currentColor':'none'}/><span>{saved?'Saved':'Save'}</span></button>
      </div>
      <p className="city-local-time">Local time <time id="cityLocalTime" dateTime={new Date(now).toISOString()}>{localTime}</time></p>
      <p className="city-local-date" id="cityLocalDate">{localDate}</p>
      <div className="location-meta-row"><span id="lastUpdated" className="last-updated">Last updated: {service.formatTime(current.last_updated)}</span><button id="refreshBtn" type="button" onClick={onRefresh} disabled={refreshing} className="refresh-btn" aria-label="Refresh weather" title="Refresh weather"><Icon name="refresh" className={refreshing?'animate-spin':''}/><span>{refreshing?'Refreshing…':'Refresh'}</span></button>
      <span id="dataFreshness" className={`data-freshness ${error||stale?'is-stale':'sr-only'}`}>{error?'Refresh failed. Showing the last successful weather.':(stale?'May be outdated. Checked ':'Checked ')+service.formatTime(new Date(lastFetchedAt).toISOString())}</span></div>
    </div></div>
    <div className="temperature-section">
      <div className="weather-icon-container"><img className="weather-icon" id="currentWeatherIcon" src={weatherIconUrl(current.condition.iconCode)} alt=""/></div>
      <div className="main-temperature"><span className="temperature" id="currentTemp">{temperature==null?'Unavailable':<><span className="temperature-number">{temperature}</span><span className="temperature-degree">°{unit}</span></>}</span></div>
      <div className="condition-copy"><span className="condition" id="currentCondition">{current.condition.text}</span><div className="feels-like">Feels like <span id="feelsLike">{Number.isFinite(current.feelslike_c)?formatTemperature(current.feelslike_c,unit):'Unavailable'}</span><span aria-hidden="true"> · </span><span className="today-range">High <span id="todayHigh">{formatTemperature(today.maxtemp_c,unit)}</span> / Low <span id="todayLow">{formatTemperature(today.mintemp_c,unit)}</span></span></div></div>
    </div>
    <WeatherMetrics current={current} airQuality={lastAirQuality}/>
    <DaylightBar current={current} timeZone={location.timezone} now={now}/>
  </section>;
}

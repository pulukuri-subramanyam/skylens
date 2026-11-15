import { Icon } from './Icon';
import { weatherService as service } from '../lib/weather';

export function DaylightBar({ current, timeZone, now }) {
  const sunrise=Date.parse(current.sunrise),sunset=Date.parse(current.sunset);
  const valid=Number.isFinite(sunrise)&&Number.isFinite(sunset)&&sunset>sunrise;
  const progress=valid?Math.max(0,Math.min(1,(now-sunrise)/(sunset-sunrise))):0;
  const night=valid&&(now<sunrise||now>sunset);
  const rise=service.formatLocationTime(current.sunrise,timeZone),set=service.formatLocationTime(current.sunset,timeZone);
  return <div className={`sun-progress ${!valid?'is-unavailable':night?'is-night':''}`} id="sunProgress" aria-label={valid?`Sunrise at ${rise}, sunset at ${set}. ${Math.round(progress*100)}% through daylight.`:'Daylight information unavailable'}>
    <p className="sun-time"><Icon name="sun"/><span className="sun-time-label">Sunrise </span><span id="sunriseTime">{rise}</span></p>
    <div className="sun-progress-track" aria-hidden="true"><span className="sun-progress-fill" id="sunProgressFill" style={{width:progress*100+'%'}}/><span className="sun-progress-marker" id="sunProgressMarker" style={{left:progress*100+'%'}}><Icon name={night?'moon':'sun'}/></span></div>
    <p className="sun-time"><Icon name="moon"/><span className="sun-time-label">Sunset </span><span id="sunsetTime">{set}</span></p>
  </div>;
}

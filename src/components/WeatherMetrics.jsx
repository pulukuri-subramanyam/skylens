import { Icon } from './Icon';

export function WeatherMetrics({ current, airQuality }) {
  const metrics = [
    ['Humidity', Number.isFinite(current.humidity)?current.humidity+'%':'Unavailable','drop','humidity'],
    ['Wind', Number.isFinite(current.wind_kph)?current.wind_kph+' km/h':'Unavailable','wind','windSpeed'],
    ['Visibility', Number.isFinite(current.vis_km)?Number(current.vis_km.toFixed(1))+' km':'Unavailable','eye','visibility'],
    ['Pressure', Number.isFinite(current.pressure_mb)?Math.round(current.pressure_mb).toLocaleString()+' hPa':'Unavailable','pressure','pressure'],
    ['UV index', Number.isFinite(current.uv)?Number(current.uv.toFixed(1)):'Unavailable','sun','uvIndex'],
    ['Air quality',airQuality?.label||'Unavailable','air','airQuality']
  ];
  return <div className="weather-details-grid">{metrics.map(([label,value,icon,id])=><div key={id} className="detail-item">
    <span className="metric-symbol"><Icon name={icon} className="detail-icon"/></span>
    <div className="detail-content"><span className="detail-label">{label}</span><span className="detail-value"><span id={id}>{value}</span>{id==='windSpeed'&&Number.isFinite(current.wind_kph)&&<small id="windDirection"> {current.wind_dir}</small>}</span>
    {id==='airQuality'&&Number.isFinite(airQuality?.pm25)&&<small className="air-pm25" id="airPm25">PM2.5 {Math.round(airQuality.pm25)} µg/m³</small>}</div>
  </div>)}</div>;
}

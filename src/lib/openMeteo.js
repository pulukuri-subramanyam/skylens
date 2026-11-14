const currentFields = 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m';
const hourlyFields = 'temperature_2m,precipitation_probability,wind_speed_10m,visibility,uv_index';
const dailyFields = 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,wind_speed_10m_max';

export function forecastUrl(lat, lon, compact = false) {
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon)) || lat == null || lon == null || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new Error('Invalid location coordinates');
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({latitude:lat,longitude:lon,current:currentFields,timezone:'auto',timeformat:'unixtime',forecast_days:compact?'1':'7',...(compact?{}:{hourly:hourlyFields,daily:dailyFields})});
  return url.toString();
}

export function condition(code, isDay = true) {
  const groups = [[0,'Clear sky','01'],[1,'Mainly clear','02'],[2,'Partly cloudy','02'],[3,'Overcast clouds','04'],[45,'Fog','50'],[48,'Freezing fog','50'],[51,'Light drizzle','09'],[53,'Drizzle','09'],[55,'Heavy drizzle','09'],[56,'Freezing drizzle','09'],[57,'Freezing drizzle','09'],[61,'Light rain','10'],[63,'Rain','10'],[65,'Heavy rain','10'],[66,'Freezing rain','10'],[67,'Freezing rain','10'],[71,'Light snow','13'],[73,'Snow','13'],[75,'Heavy snow','13'],[77,'Snow grains','13'],[80,'Light rain showers','09'],[81,'Rain showers','09'],[82,'Heavy rain showers','09'],[85,'Snow showers','13'],[86,'Heavy snow showers','13'],[95,'Thunderstorm','11'],[96,'Thunderstorm with hail','11'],[99,'Thunderstorm with hail','11']];
  const found=groups.find(row=>row[0]===code);
  return {description:found?.[1]||'Unknown conditions',icon:(found?.[2]||'03')+(isDay?'d':'n')};
}

export function normalizeMeteo(service, location, payload) {
  const c=payload?.current,h=payload?.hourly,d=payload?.daily;
  const validTime = value => Number.isFinite(value) && value > 0 && value < 8640000000000;
  const reading = (value, min, max) => Number.isFinite(value) && value >= min && value <= max ? value : null;
  if(!c || !Array.isArray(h?.time) || !h.time.length || !Array.isArray(d?.time) || !d.time.length || !validTime(c.time) || reading(c.temperature_2m,-100,70) == null) throw new Error('Weather data was not available');
  if (h.time.length > 240 || d.time.length > 8 || !h.time.every(validTime) || !d.time.every(validTime) || !Array.isArray(h.temperature_2m) || !Array.isArray(d.temperature_2m_max) || !Array.isArray(d.temperature_2m_min)) throw new Error('Invalid forecast data');
  if (!h.time.every((time,i)=>i===0 || time>h.time[i-1]) || !d.time.every((time,i)=>i===0 || time>d.time[i-1]) || typeof payload.timezone !== 'string') throw new Error('Invalid forecast time sequence');
  try { new Intl.DateTimeFormat('en', { timeZone: payload.timezone }).format(); }
  catch { throw new Error('Invalid forecast time zone'); }
  let nearest=0;
  h.time.forEach((time,i)=>{if(Math.abs(time-c.time)<Math.abs(h.time[nearest]-c.time))nearest=i;});
  const kph = value => { const speed = reading(value,0,500); return speed == null ? null : speed / 3.6; };
  const probability = value => { const percent = reading(value,0,100); return percent == null ? null : percent / 100; };
  const current={dt:c.time,temp:c.temperature_2m,feels_like:reading(c.apparent_temperature,-120,100),humidity:reading(c.relative_humidity_2m,0,100),pressure:reading(c.pressure_msl,800,1200),wind_speed:kph(c.wind_speed_10m),wind_deg:reading(c.wind_direction_10m,0,360),visibility:reading(h.visibility?.[nearest],0,200000),uvi:reading(h.uv_index?.[nearest],0,30),sunrise:validTime(d.sunrise?.[0])?d.sunrise[0]:null,sunset:validTime(d.sunset?.[0])?d.sunset[0]:null,weather:[condition(c.weather_code,c.is_day===1)]};
  const hours=h.time.map((dt,i)=>({dt,temp:reading(h.temperature_2m[i],-100,70),wind_speed:kph(h.wind_speed_10m?.[i]),pop:probability(h.precipitation_probability?.[i])}));
  const days=d.time.slice(0,7).map((dt,i)=>({dt,temp:{max:reading(d.temperature_2m_max[i],-100,70),min:reading(d.temperature_2m_min[i],-100,70)},wind_speed:kph(d.wind_speed_10m_max?.[i]),pop:probability(d.precipitation_probability_max?.[i]),sunrise:validTime(d.sunrise?.[i])?d.sunrise[i]:null,sunset:validTime(d.sunset?.[i])?d.sunset[i]:null,weather:[condition(d.weather_code?.[i])]}));
  const normalized=service.normalizeOpenWeatherData(location,{timezone:payload.timezone,data:[current]},{data:hours},{timezone:payload.timezone,data:days});
  // Keep all local-day hours for selected days; only the default chart starts now.
  normalized.forecastData.forecast.forecastday.forEach((day,i)=>{day.hour=hours.filter(hour=>hour.dt>=d.time[i] && hour.dt<(d.time[i+1]??d.time[i]+86400)).map(hour=>({time:new Date(hour.dt*1000).toISOString(),temp_c:hour.temp,temp_f:hour.temp==null?null:hour.temp*9/5+32,wind_kph:hour.wind_speed==null?null:Math.round(hour.wind_speed*3.6),precipitation_probability_percent:hour.pop==null?null:Math.round(hour.pop*100)}));});
  return normalized;
}

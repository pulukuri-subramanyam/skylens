const currentFields = 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m';
const hourlyFields = 'temperature_2m,precipitation_probability,wind_speed_10m,visibility,uv_index';
const dailyFields = 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,wind_speed_10m_max';

export function forecastUrl(lat, lon, compact = false) {
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
  const c=payload.current,h=payload.hourly,d=payload.daily;
  if(!c || !h?.time?.length || !d?.time?.length || !Number.isFinite(c.temperature_2m)) throw new Error('Weather data was not available');
  let nearest=0;
  h.time.forEach((time,i)=>{if(Math.abs(time-c.time)<Math.abs(h.time[nearest]-c.time))nearest=i;});
  const current={dt:c.time,temp:c.temperature_2m,feels_like:c.apparent_temperature,humidity:c.relative_humidity_2m,pressure:c.pressure_msl,wind_speed:c.wind_speed_10m/3.6,wind_deg:c.wind_direction_10m,visibility:h.visibility?.[nearest],uvi:h.uv_index?.[nearest],sunrise:d.sunrise?.[0],sunset:d.sunset?.[0],weather:[condition(c.weather_code,c.is_day===1)]};
  const hours=h.time.map((dt,i)=>({dt,temp:h.temperature_2m[i],wind_speed:h.wind_speed_10m[i]/3.6,pop:h.precipitation_probability[i]==null?null:h.precipitation_probability[i]/100}));
  const days=d.time.map((dt,i)=>({dt,temp:{max:d.temperature_2m_max[i],min:d.temperature_2m_min[i]},wind_speed:d.wind_speed_10m_max[i]/3.6,pop:d.precipitation_probability_max[i]==null?null:d.precipitation_probability_max[i]/100,sunrise:d.sunrise[i],sunset:d.sunset[i],weather:[condition(d.weather_code[i])]}));
  const normalized=service.normalizeOpenWeatherData(location,{timezone:payload.timezone,data:[current]},{data:hours},{timezone:payload.timezone,data:days});
  // Keep all local-day hours for selected days; only the default chart starts now.
  normalized.forecastData.forecast.forecastday.forEach((day,i)=>{day.hour=hours.filter(hour=>hour.dt>=d.time[i] && hour.dt<(d.time[i+1]??d.time[i]+86400)).map(hour=>({time:new Date(hour.dt*1000).toISOString(),temp_c:hour.temp,temp_f:hour.temp*9/5+32,wind_kph:Math.round(hour.wind_speed*3.6),precipitation_probability_percent:hour.pop==null?null:Math.round(hour.pop*100)}));});
  return normalized;
}

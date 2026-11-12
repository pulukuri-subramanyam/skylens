import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeMeteo,condition,forecastUrl} from '../src/lib/openMeteo.js';
import {WeatherService} from '../src/lib/weather.js';
test('preserves seven full local days, converts units and maps weather icons',()=>{
 const start=Date.UTC(2026,10,13)/1000-19800;
 const times=Array.from({length:168},(_,i)=>start+i*3600);
 const dailyTimes=Array.from({length:7},(_,i)=>start+i*86400);
 const fill=(value,n=168)=>Array(n).fill(value);
 const payload={timezone:'Asia/Kolkata',current:{time:start+3600,temperature_2m:20,apparent_temperature:19,relative_humidity_2m:70,is_day:0,weather_code:3,pressure_msl:1010,wind_speed_10m:18,wind_direction_10m:90},hourly:{time:times,temperature_2m:fill(20),wind_speed_10m:fill(18),precipitation_probability:fill(60),visibility:fill(10000),uv_index:fill(0)},daily:{time:dailyTimes,temperature_2m_max:fill(25,7),temperature_2m_min:fill(15,7),wind_speed_10m_max:fill(18,7),precipitation_probability_max:fill(60,7),weather_code:fill(3,7),sunrise:dailyTimes.map(t=>t+21600),sunset:dailyTimes.map(t=>t+64800)}};
 const result=normalizeMeteo(new WeatherService(),{name:'Nandyal',state:'Andhra Pradesh',country:'IN',lat:15.48,lon:78.48},payload);
 assert.equal(result.forecastData.forecast.forecastday.length,7);
 assert(result.forecastData.forecast.forecastday.every(day=>day.hour.length===24));
 assert.equal(result.currentData.current.temp_f,68);assert.equal(result.currentData.current.wind_kph,18);
 assert.equal(result.currentData.current.condition.iconCode,'04n');
 assert.equal(condition(95).icon,'11d');assert.equal(condition(48).icon,'50d');
 assert.equal(new URL(forecastUrl(15,78)).searchParams.get('forecast_days'),'7');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {forecast} from './browser/fixtures.js';
import {normalizeMeteo} from '../src/lib/openMeteo.js';
import {WeatherService} from '../src/lib/weather.js';
import {readWeatherCache} from '../src/lib/storage.js';
const service=new WeatherService(),location={name:'London',state:'England',country:'GB',lat:51.5,lon:0};
test('missing optional readings stay unavailable and malformed core data is rejected',()=>{
  const payload=forecast();payload.current.relative_humidity_2m=null;payload.current.wind_speed_10m=null;delete payload.hourly.visibility;delete payload.hourly.uv_index;payload.hourly.temperature_2m[3]=null;
  const result=normalizeMeteo(service,location,payload);
  for(const key of ['humidity','wind_kph','vis_km','uv'])assert.equal(result.currentData.current[key],null);
  assert.equal(result.forecastData.forecast.forecastday[0].hour[3].temp_f,null);
  payload.current.temperature_2m=null;assert.throws(()=>normalizeMeteo(service,location,payload));
  assert.equal(service.getAqiDetails({list:[{main:{aqi:0},components:{pm2_5:null}}]}),null);
});
test('corrupt cached data is discarded instead of crashing the page',()=>{
  const original=global.localStorage;global.localStorage={getItem:()=>JSON.stringify({currentCity:{},forecastData:{forecast:{forecastday:[{}]}}})};
  try{assert.equal(readWeatherCache(),null);}finally{global.localStorage=original;}
});

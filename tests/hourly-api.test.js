import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/weather.mjs';
test('fetches hourly pages, deduplicates and removes credential-bearing links', async()=>{
 const previousFetch=global.fetch,previousKey=process.env.OPENWEATHER_API_KEY;
 process.env.OPENWEATHER_API_KEY='test-only';let calls=0,body;
 global.fetch=async url=>{calls++;const parsed=new URL(url);assert.equal(parsed.origin,'https://api.openweathermap.org');assert.equal(parsed.searchParams.get('appid'),'test-only');const offset=(calls-1)*20;return {ok:true,json:async()=>({data:Array.from({length:20},(_,i)=>({dt:offset+i})),next:`http://api.openweathermap.org/data/4.0/onecall/timeline/1h?start=${offset+20}&appid=test-only`,prev:'private'})};};
 try{const response={setHeader(){},status(){return this;},json(value){body=value;}};await handler({method:'GET',query:{type:'hourly',lat:'51',lon:'0'}},response);assert.equal(calls,3);assert.equal(body.data.length,48);assert.equal(body.next,undefined);assert.equal(body.prev,undefined);assert(!JSON.stringify(body).includes('test-only'));}
 finally{global.fetch=previousFetch;if(previousKey===undefined)delete process.env.OPENWEATHER_API_KEY;else process.env.OPENWEATHER_API_KEY=previousKey;}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchJson } from '../src/lib/request.js';

test('retries transient failures but never retries quota errors or malformed JSON', async()=>{
  const original=global.fetch;let calls=0;
  try {
    global.fetch=async()=>++calls===1?{ok:false,status:503}:{ok:true,json:async()=>({ok:true})};
    assert.deepEqual(await fetchJson('/test'),{ok:true});assert.equal(calls,2);
    calls=0;global.fetch=async()=>{calls++;return {ok:false,status:429};};
    await assert.rejects(fetchJson('/test'),e=>e.code==='rate_limited');assert.equal(calls,1);
    calls=0;global.fetch=async()=>{calls++;return {ok:true,json:async()=>{throw new SyntaxError('private upstream text');}};};
    await assert.rejects(fetchJson('/test'),e=>e.code==='invalid_response'&&!e.message.includes('private'));assert.equal(calls,1);
  } finally {global.fetch=original;}
});

test('aborts hung requests and respects caller cancellation',async()=>{
  const original=global.fetch;let calls=0;
  global.fetch=(_url,{signal})=>new Promise((_resolve,reject)=>{calls++;signal.addEventListener('abort',()=>reject(signal.reason),{once:true});});
  try {
    await assert.rejects(fetchJson('/test',{timeoutMs:15,retries:0}),e=>e.code==='timeout');
    const controller=new AbortController();const request=fetchJson('/test',{signal:controller.signal});controller.abort();
    await assert.rejects(request,e=>e.name==='AbortError');assert.equal(calls,2);
  } finally {global.fetch=original;}
});

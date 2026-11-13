import test from 'node:test';
import assert from 'node:assert/strict';
import {uniqueRecentCities} from '../src/lib/storage.js';
test('removes coordinate-shift duplicates but preserves places in other regions',()=>{
 const a={id:'a',name:'Nandyal',label:'Nandyal, Andhra Pradesh',country:'IN',lat:15.48,lon:78.48};
 const duplicate={...a,id:'b',lat:15.49};
 const otherRegion={...a,id:'c',label:'Nandyal, Maharashtra',lat:17,lon:74};
 const distant={...a,id:'d',lat:20};
 assert.deepEqual(uniqueRecentCities([a,duplicate,otherRegion,distant]),[a,otherRegion,distant]);
 assert.deepEqual(uniqueRecentCities([duplicate,a])[0],duplicate);
});

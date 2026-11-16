import test from 'node:test';
import assert from 'node:assert/strict';
import { ambientWind, daylightTint, particleCounts, phoneParticleCounts, precipitationIntensity } from '../src/lib/weatherAmbience.js';

test('ambient precipitation follows provider severity descriptions with bounded particle counts',()=>{
  for(const [text,intensity] of [['Light rain','light'],['Heavy rain','heavy'],['Light snow','light'],['Heavy snow showers','heavy'],['Rain','medium'],['Snow','medium'],['Thunderstorm with hail','heavy'],['Light drizzle','light']]) {
    assert.equal(precipitationIntensity({condition:{text}}),intensity);
  }
  assert.equal(precipitationIntensity(null),'medium');
  for(const kind of ['rain','snow']) {
    assert.ok(particleCounts[kind].light < particleCounts[kind].medium);
    assert.ok(particleCounts[kind].medium < particleCounts[kind].heavy);
    assert.ok(particleCounts[kind].heavy <= 56);
    for(const intensity of ['light','medium','heavy']) assert.ok(phoneParticleCounts[kind][intensity] < particleCounts[kind][intensity]);
  }
});

test('ambient wind follows source direction and remains bounded for missing or extreme readings',()=>{
  assert.deepEqual(ambientWind({wind_kph:50,wind_dir:'E'}),{drift:-6,tilt:12});
  assert.deepEqual(ambientWind({wind_kph:500,wind_dir:'W'}),{drift:6,tilt:-12});
  assert.equal(ambientWind({wind_kph:0,wind_dir:'E'}).drift,0);
  assert.equal(ambientWind({wind_kph:50,wind_dir:'N'}).drift,0);
  assert.deepEqual(ambientWind({wind_kph:NaN,wind_dir:'E'}),{drift:0,tilt:-0});
  assert.equal(ambientWind({wind_kph:50,wind_dir:'Unavailable'}).drift,0);
});

test('daylight tint uses absolute location sunrise/sunset timestamps with gradual warm edges',()=>{
  const current={sunrise:'2026-11-16T06:00:00+05:30',sunset:'2026-11-16T18:00:00+05:30'};
  const at=time=>daylightTint(current,Date.parse('2026-11-16T'+time+'+05:30'));
  assert.equal(at('06:00:00').warmth,1);
  assert.equal(at('18:00:00').warmth,1);
  assert.equal(at('06:00:00').edge,'12%');
  assert.equal(at('18:00:00').edge,'88%');
  assert.equal(at('12:00:00').warmth,0);
  assert.equal(at('02:00:00').warmth,0);
  assert.ok(at('06:30:00').warmth > at('07:00:00').warmth);
  assert.equal(daylightTint({sunrise:'invalid'},Date.now()).warmth,0);
  assert.equal(daylightTint({sunrise:current.sunset,sunset:current.sunrise},Date.now()).warmth,0);
});

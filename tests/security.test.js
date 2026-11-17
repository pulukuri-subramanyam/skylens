import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/weather.mjs';
import events from '../api/events.mjs';
import health from '../api/health.mjs';
import { allowRequest } from '../server/security.mjs';
function response() {
  return {
    code: 200,
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(code) {
      this.code = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}
test('rejects methods, inherited route names, bad coordinates and cross-site calls before fetching', async () => {
  const oldFetch = global.fetch,
    oldKey = process.env.OPENWEATHER_API_KEY;
  process.env.OPENWEATHER_API_KEY = 'test-key';
  let calls = 0;
  global.fetch = () => {
    calls++;
    throw new Error('must not fetch');
  };
  try {
    for (const [method, query, headers, code] of [
      ['POST', {}, {}, 405],
      ['GET', { type: 'constructor' }, {}, 400],
      ['GET', { type: 'air', lat: '91', lon: '20' }, {}, 400],
      ['GET', { type: 'geocode', q: ['one', 'two'] }, {}, 400],
      ['GET', { type: 'air', lat: '20', lon: '10' }, { 'sec-fetch-site': 'cross-site' }, 403],
    ]) {
      const res = response();
      await handler({ method, query, headers }, res);
      assert.equal(res.code, code);
    }
    assert.equal(calls, 0);
  } finally {
    global.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.OPENWEATHER_API_KEY;
    else process.env.OPENWEATHER_API_KEY = oldKey;
  }
});
test('provider failures do not disclose credentials or provider response text', async () => {
  const oldFetch = global.fetch,
    oldKey = process.env.OPENWEATHER_API_KEY;
  process.env.OPENWEATHER_API_KEY = 'private-test-key';
  try {
    global.fetch = async (_url, options) => {
      assert(options.signal);
      assert.equal(options.redirect, 'error');
      return { ok: false, status: 401, json: async () => ({ message: 'private-test-key' }) };
    };
    const res = response();
    await handler({ method: 'GET', query: { type: 'air', lat: '20', lon: '10' } }, res);
    assert.equal(res.code, 502);
    assert(!JSON.stringify(res).includes('private-test-key'));
  } finally {
    global.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.OPENWEATHER_API_KEY;
    else process.env.OPENWEATHER_API_KEY = oldKey;
  }
});
test('burst guard returns Retry-After and resets after the window', () => {
  const req = { headers: { 'x-vercel-forwarded-for': 'test-burst-client' } };
  assert.equal(allowRequest(req, response(), 'test', 2, 1000), true);
  assert.equal(allowRequest(req, response(), 'test', 2, 1001), true);
  const blocked = response();
  assert.equal(allowRequest(req, blocked, 'test', 2, 1002), false);
  assert.equal(blocked.code, 429);
  assert(blocked.headers['Retry-After']);
  assert.equal(allowRequest(req, response(), 'test', 2, 61001), true);
});
test('monitoring accepts only fixed codes, not arbitrary text or location data', () => {
  const req = { method: 'POST', headers: { 'content-type': 'application/json' } };
  let res = response();
  events({ ...req, body: { event: 'render_error', location: 'private' } }, res);
  assert.equal(res.code, 400);
  res = response();
  events({ ...req, body: { event: 'render_error' } }, res);
  assert.equal(res.code, 202);
  res = response();
  events({ ...req, headers: { ...req.headers, 'content-length': '900' } }, res);
  assert.equal(res.code, 413);
  res = response();
  health({ method: 'POST' }, res);
  assert.equal(res.code, 405);
});

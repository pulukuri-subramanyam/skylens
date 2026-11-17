import test from 'node:test';
import assert from 'node:assert/strict';
import { uvSeverity } from '../src/lib/uv.js';

test('UV labels cover category boundaries, decimals, zero and unavailable readings', () => {
  for (const [value, label] of [
    [0, 'Low'],
    [2.9, 'Low'],
    [3, 'Moderate'],
    [5.9, 'Moderate'],
    [6, 'High'],
    [7.9, 'High'],
    [8, 'Very high'],
    [10.9, 'Very high'],
    [11, 'Extreme'],
    [20, 'Extreme'],
  ]) {
    assert.equal(uvSeverity(value), label);
  }
  for (const value of [null, undefined, NaN, Infinity, -1, '3'])
    assert.equal(uvSeverity(value), null);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

// Note: requires network; will fail offline. Mirrors CI drift check locally.
test('drift check passes against live schema', () => {
  const result = spawnSync('node', ['scripts/check-analytics-drift.js'], {
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

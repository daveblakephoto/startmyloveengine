import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

// Runs the validator script to ensure static HTML matches baked contract.
test('static site analytics validation passes', () => {
  const result = spawnSync('node', ['scripts/validate-analytics-site.js'], {
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

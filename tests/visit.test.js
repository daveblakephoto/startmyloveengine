import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { trackVisit, primeAnalyticsConfig } from '../lib/analytics.js';

function withMockFetch(fn) {
  const calls = [];
  const originalFetch = globalThis.fetch;
  const configPath = path.resolve('config/analytics.json');
  const configJson = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  globalThis.fetch = (url, options = {}) => {
    if (String(url).endsWith('/config/analytics.json') || String(url).includes('config/analytics.json')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(configJson)
      });
    }
    calls.push([url, options]);
    return Promise.resolve({ ok: true });
  };
  return fn().then(() => {
    globalThis.fetch = originalFetch;
    return calls;
  }, err => {
    globalThis.fetch = originalFetch;
    throw err;
  });
}

globalThis.window = {
  location: { href: 'https://startmyloveengine.com/directory/dave-blake' }
};
globalThis.document = { referrer: 'https://startmyloveengine.com/' };

test('trackVisit sends plan + placements when provided', async () => {
  const calls = await withMockFetch(async () => {
    await primeAnalyticsConfig();
    trackVisit({
      vendor: 'dave-blake',
      page: 'profile',
      plan: 'featured',
      placements: ['spotlight'],
      tier: 'featured'
    });
    await Promise.resolve();
  });

  // first fetch loads config, second is /visit
  const visitCall = calls.find(([url]) => url === 'https://go.startmyloveengine.com/visit');
  assert.ok(visitCall, 'visit call should be made');
  const [, options] = visitCall;
  const body = JSON.parse(options.body);
  assert.equal(body.plan, 'featured');
  assert.deepEqual(body.placements, ['spotlight']);
  assert.ok(!('tier' in body), 'tier should not be sent when plan present');
});

test('trackVisit falls back to tier when plan missing', async () => {
  const calls = await withMockFetch(async () => {
    await primeAnalyticsConfig();
    trackVisit({
      vendor: 'dave-blake',
      page: 'profile',
      tier: 'featured'
    });
    await Promise.resolve();
  });
  const visitCall = calls.find(([url]) => url === 'https://go.startmyloveengine.com/visit');
  const [, options] = visitCall;
  const body = JSON.parse(options.body);
  assert.equal(body.tier, 'featured');
});

test('trackVisit skips invalid vendor', async () => {
  const calls = await withMockFetch(async () => {
    await primeAnalyticsConfig();
    trackVisit({
      vendor: 'Bad Vendor',
      page: 'profile',
      tier: 'featured'
    });
    await Promise.resolve();
  });
  const visitCall = calls.find(([url]) => url === 'https://go.startmyloveengine.com/visit');
  assert.ok(!visitCall, 'visit should be skipped for invalid vendor');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { trackClick, primeAnalyticsConfig } from '../lib/analytics.js';

// Helper to mock fetch and capture args
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
  }, (err) => {
    globalThis.fetch = originalFetch;
    throw err;
  });
}

// Set up minimal window for trackClick
globalThis.window = {
  location: {
    href: 'https://startmyloveengine.com/directory/dave-blake'
  }
};

test('trackClick sends POST to analytics worker with expected body', async () => {
  const calls = await withMockFetch(async () => {
    await primeAnalyticsConfig();
    trackClick({ vendor: 'dave-blake', target: 'website', tier: 'featured' });
    // allow microtask to queue fetch
    await Promise.resolve();
  });

  const clickCall = calls.find(([url]) => url === 'https://go.startmyloveengine.com/click');
  assert.ok(clickCall, 'fetch should call analytics click endpoint once');

  const [, options] = clickCall;
  assert.equal(options.method, 'POST');
  assert.equal(options.keepalive, true);
  assert.equal(options.headers['Content-Type'], 'application/json');

  const body = JSON.parse(options.body);
  assert.deepEqual(body, {
    vendor: 'dave-blake',
    type: 'website',
    url: 'https://startmyloveengine.com/directory/dave-blake'
  });
});

test('trackClick skips invalid type', async () => {
  const calls = await withMockFetch(async () => {
    await primeAnalyticsConfig();
    trackClick({ vendor: 'dave-blake', target: 'twitter' });
    await Promise.resolve();
  });
  assert.equal(calls.length, 0, 'fetch should not be called for invalid type');
});

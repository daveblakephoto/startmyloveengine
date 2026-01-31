import test from 'node:test';
import assert from 'node:assert/strict';
import { trackClick } from '../lib/analytics.js';

// Helper to mock fetch and capture args
function withMockFetch(fn) {
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (...args) => {
    calls.push(args);
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
    trackClick({ vendor: 'dave-blake', target: 'website', tier: 'featured' });
    // allow microtask to queue fetch
    await Promise.resolve();
  });

  assert.equal(calls.length, 1, 'fetch should be called once');

  const [url, options] = calls[0];
  assert.equal(url, 'https://go.startmyloveengine.com/click');
  assert.equal(options.method, 'POST');
  assert.equal(options.keepalive, true);
  assert.equal(options.headers['Content-Type'], 'application/json');

  const body = JSON.parse(options.body);
  assert.deepEqual(body, {
    vendor: 'dave-blake',
    target: 'website',
    tier: 'featured',
    url: 'https://startmyloveengine.com/directory/dave-blake'
  });
});


#!/usr/bin/env node
// Drift check for vendor metadata (static site vs authoritative source)

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_URL = 'https://raw.githubusercontent.com/daveblakephoto/outbound-click-tracker/main/config/vendor-metadata.json';
const SOURCE_URL = process.env.VENDOR_METADATA_URL || DEFAULT_URL;
const BAKED_PATH = path.resolve('config/vendor-metadata.json');

function stableStringify(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}

function readBaked() {
  const raw = fs.readFileSync(BAKED_PATH, 'utf8');
  return JSON.parse(raw);
}

async function fetchLive() {
  const res = await fetch(SOURCE_URL, {
    headers: {
      'User-Agent': 'vendor-metadata-drift/1.0',
      Accept: 'application/json'
    }
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Fetch failed ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function main() {
  try {
    const baked = readBaked();
    const live = await fetchLive();

    const a = stableStringify(baked);
    const b = stableStringify(live);

    if (a === b) {
      console.log('vendor-metadata-drift: OK (matches)');
      process.exit(0);
    }

    console.error('vendor-metadata-drift: DRIFT detected');
    process.exit(1);
  } catch (err) {
    console.error('vendor-metadata-drift: failed', err.message || err);
    process.exit(1);
  }
}

main();

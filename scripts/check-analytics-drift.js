#!/usr/bin/env node
// Contract drift checker for StartMyLoveEngine analytics
// - Compares baked config with live schema from the worker
// - Exits 0 on match, 1 on drift or fetch error

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const SCHEMA_URL = 'https://go.startmyloveengine.com/schema';
const CONFIG_PATH = path.resolve('config/analytics.json');

function readBakedConfig() {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  return JSON.parse(raw);
}

function normaliseArray(val) {
  if (!Array.isArray(val)) return [];
  return Array.from(new Set(val.map(v => String(v).trim()))).sort();
}

function compareArrays(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

async function fetchSchema() {
  const res = await fetch(SCHEMA_URL, { method: 'GET' });
  if (!res.ok) {
    throw new Error(`Schema fetch failed: ${res.status}`);
  }
  return res.json();
}

function pick(obj, keys) {
  return keys.reduce((acc, key) => {
    if (obj && Object.prototype.hasOwnProperty.call(obj, key)) {
      acc[key] = obj[key];
    }
    return acc;
  }, {});
}

function diffContract(baked, live) {
  const keys = [
    'allowedPages',
    'allowedTiers',
    'allowedClickTypes',
    'vendorSlugRegex',
    'internalDomains',
    'plans',
    'placements',
    'apiVersion'
  ];

  const bakedPicked = pick(baked, keys);
  const livePicked = pick(live, keys);

  const diffs = [];

  for (const key of keys) {
    const a = bakedPicked[key];
    const b = livePicked[key];
    if (Array.isArray(a) || Array.isArray(b)) {
      const aArr = normaliseArray(a);
      const bArr = normaliseArray(b);
      if (!compareArrays(aArr, bArr)) {
        diffs.push({ key, baked: aArr, live: bArr });
      }
    } else if (a !== b) {
      diffs.push({ key, baked: a, live: b });
    }
  }

  return diffs;
}

async function main() {
  try {
    const baked = readBakedConfig();
    const live = await fetchSchema();
    const diffs = diffContract(baked, live);

    if (diffs.length === 0) {
      console.log('analytics-drift: OK (schema matches baked config)');
      process.exit(0);
    }

    console.warn('analytics-drift: drift detected');
    for (const diff of diffs) {
      console.warn(` - ${diff.key}: baked=${JSON.stringify(diff.baked)} live=${JSON.stringify(diff.live)}`);
    }
    process.exit(1);
  } catch (err) {
    console.error('analytics-drift: failed to check', err?.message || err);
    process.exit(1);
  }
}

main();

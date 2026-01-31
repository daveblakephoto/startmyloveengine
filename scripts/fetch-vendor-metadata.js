#!/usr/bin/env node
// Fetch authoritative vendor metadata and write to config/vendor-metadata.json

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_URL = 'https://raw.githubusercontent.com/daveblakephoto/outbound-click-tracker/main/config/vendor-metadata.json';
const SOURCE_URL = process.env.VENDOR_METADATA_URL || DEFAULT_URL;
const DEST_PATH = path.resolve('config/vendor-metadata.json');

async function main() {
  try {
    const res = await fetch(SOURCE_URL, {
      headers: {
        'User-Agent': 'vendor-metadata-sync/1.0'
      }
    });
    if (!res.ok) {
      throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
    }
    const json = await res.json();
    fs.mkdirSync(path.dirname(DEST_PATH), { recursive: true });
    fs.writeFileSync(DEST_PATH, JSON.stringify(json, null, 2) + '\n', 'utf8');
    console.log(`vendor metadata synced from ${SOURCE_URL} -> ${DEST_PATH}`);
  } catch (err) {
    console.error('vendor-metadata sync failed:', err.message || err);
    process.exit(1);
  }
}

main();

#!/usr/bin/env node
// Static-site analytics contract validator (no runtime fetches)
// - Loads baked contract (config/analytics.json)
// - Scans HTML for vendor visit + outbound click compliance
// - Exits non-zero on violations

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const schemaPath = path.join(root, 'config', 'analytics.json');

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const errors = [];

const allowedPages = new Set(schema.allowedPages || schema.resolved?.allowedPages || []);
const allowedClickTypes = new Set(schema.allowedClickTypes || schema.resolved?.allowedClickTypes || []);
const vendorSlugRegex = new RegExp(schema.vendorSlugRegex || schema.resolved?.vendorSlugRegex || '^[a-z0-9-]+$');

const vendorDir = path.join(root, 'directory');

function listVendorPages() {
  return fs
    .readdirSync(vendorDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => path.join(vendorDir, d.name, 'index.html'))
    .filter(fs.existsSync);
}

function extractAttr(html, attr) {
  const re = new RegExp(`${attr}="([^"]+)"`);
  const m = html.match(re);
  return m ? m[1] : '';
}

function validateVendorPage(file) {
  const html = fs.readFileSync(file, 'utf8');
  const slug = extractAttr(html, 'data-vendor-slug');
  const page = 'profile';

  if (!slug) {
    // Not a vendor profile page; skip.
    return;
  }
  if (slug && !vendorSlugRegex.test(slug)) errors.push(`${file}: vendor slug '${slug}' fails regex`);
  if (!allowedPages.has(page)) errors.push(`${file}: page '${page}' not in allowedPages`);

  // Validate outbound links on the page
  const outboundRe = /<a[^>]*data-track-outbound[^>]*>/g;
  const matches = html.match(outboundRe) || [];
  matches.forEach(tag => {
    const type = extractAttr(tag, 'data-type');
    if (!type) {
      errors.push(`${file}: outbound link missing data-type`);
      return;
    }
    if (!allowedClickTypes.has(type)) {
      errors.push(`${file}: outbound link type '${type}' not in allowedClickTypes`);
    }
  });
}

function validateGlobalOutboundLinks() {
  const htmlFiles = walkHtml(root);
  htmlFiles.forEach(file => {
    const html = fs.readFileSync(file, 'utf8');
    const outboundRe = /<a[^>]*data-track-outbound[^>]*>/g;
    const matches = html.match(outboundRe) || [];
    matches.forEach(tag => {
      const type = extractAttr(tag, 'data-type');
      if (!type) errors.push(`${file}: outbound link missing data-type`);
      else if (!allowedClickTypes.has(type)) {
        errors.push(`${file}: outbound link type '${type}' not in allowedClickTypes`);
      }
    });
  });
}

function walkHtml(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.git')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkHtml(full));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
}

listVendorPages().forEach(validateVendorPage);
validateGlobalOutboundLinks();

if (errors.length) {
  console.error('analytics-validate: FAILED');
  errors.forEach(e => console.error(' -', e));
  process.exit(1);
}

console.log('analytics-validate: OK');

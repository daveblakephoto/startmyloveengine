#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SITE_ORIGIN = 'https://startmyloveengine.com';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const sitemapPath = path.join(repoRoot, 'sitemap.xml');
const today = new Date().toISOString().slice(0, 10);

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function urlToSourceFile(loc) {
  let pathname;
  try {
    const url = new URL(loc);
    if (url.origin !== SITE_ORIGIN) return null;
    pathname = url.pathname;
  } catch {
    return null;
  }

  if (pathname === '/') {
    return 'index.html';
  }

  const slug = pathname.replace(/^\/|\/$/g, '');
  if (!slug) {
    return 'index.html';
  }

  return path.join(slug, 'index.html');
}

function getLastmodForFile(sourceFile) {
  const gitResult = spawnSync('git', ['log', '-1', '--format=%cs', '--', sourceFile], {
    cwd: repoRoot,
    encoding: 'utf8'
  });

  const gitDate = (gitResult.stdout || '').trim();
  if (gitResult.status === 0 && isIsoDate(gitDate)) {
    return gitDate;
  }

  try {
    const stats = fs.statSync(path.join(repoRoot, sourceFile));
    return stats.mtime.toISOString().slice(0, 10);
  } catch {
    return today;
  }
}

function updateUrlBlock(block) {
  const locMatch = block.match(/<loc>([^<]+)<\/loc>/);
  if (!locMatch) {
    return block;
  }

  const loc = locMatch[1].trim();
  const sourceFile = urlToSourceFile(loc);
  if (!sourceFile) {
    return block;
  }

  const lastmod = getLastmodForFile(sourceFile);
  const indentMatch = block.match(/\n(\s*)<loc>/);
  const indent = indentMatch ? indentMatch[1] : '    ';

  if (/<lastmod>[^<]*<\/lastmod>/.test(block)) {
    return block.replace(/<lastmod>[^<]*<\/lastmod>/, `<lastmod>${lastmod}</lastmod>`);
  }

  if (/\n\s*<changefreq>/.test(block)) {
    return block.replace(/\n(\s*)<changefreq>/, `\n$1<lastmod>${lastmod}</lastmod>\n$1<changefreq>`);
  }

  return block.replace(/<\/loc>/, `</loc>\n${indent}<lastmod>${lastmod}</lastmod>`);
}

function generateSitemap() {
  const current = fs.readFileSync(sitemapPath, 'utf8');
  const updated = current.replace(/<url>[\s\S]*?<\/url>/g, updateUrlBlock);
  fs.writeFileSync(sitemapPath, updated);
  console.log(`Updated sitemap lastmod values in ${sitemapPath}`);
}

generateSitemap();

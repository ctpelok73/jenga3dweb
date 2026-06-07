import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HEAVY_CHUNK_PATTERN = /\/assets\/(rapier|r3f|three|firebase)-.*\.js$/i;
const HEAVY_PRECACHE_PATTERN = /assets\/(?:rapier|r3f|three|firebase)-[^"',)]+\.js/g;

const distDir = new URL('../dist/', import.meta.url);
const distPath = fileURLToPath(distDir);
const indexHtml = readFileSync(new URL('index.html', distDir), 'utf8');
const initialScripts = [...indexHtml.matchAll(/<script[^>]+src="([^"]+)"/g)].map((match) => match[1]);
const forbiddenInitial = initialScripts.filter((src) => HEAVY_CHUNK_PATTERN.test(src));

if (forbiddenInitial.length > 0) {
  throw new Error(`Heavy chunks are loaded by index.html: ${forbiddenInitial.join(', ')}`);
}

const files = readdirSync(distPath);
const swFile = files.find((file) => file === 'sw.js');
if (swFile) {
  const sw = readFileSync(join(distPath, swFile), 'utf8');
  const precachedHeavyChunks = [...sw.matchAll(HEAVY_PRECACHE_PATTERN)].map((match) => match[0]);
  if (precachedHeavyChunks.length > 0) {
    throw new Error(`Heavy chunks are precached: ${[...new Set(precachedHeavyChunks)].join(', ')}`);
  }
}

console.log('Build budget ok: heavy chunks (rapier/r3f/three/firebase) are lazy/runtime cached.');

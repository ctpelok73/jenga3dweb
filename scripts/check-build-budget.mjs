import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const distDir = new URL('../dist/', import.meta.url);
const distPath = fileURLToPath(distDir);
const indexHtml = readFileSync(new URL('index.html', distDir), 'utf8');
const initialScripts = [...indexHtml.matchAll(/<script[^>]+src="([^"]+)"/g)].map((match) => match[1]);
const forbiddenInitial = initialScripts.filter((src) => /\/assets\/(rapier|r3f)-.*\.js$/i.test(src));

if (forbiddenInitial.length > 0) {
  throw new Error(`Heavy 3D chunks are loaded by index.html: ${forbiddenInitial.join(', ')}`);
}

const files = readdirSync(distPath);
const swFile = files.find((file) => file === 'sw.js');
if (swFile) {
  const sw = readFileSync(join(distPath, swFile), 'utf8');
  const precachedHeavyChunks = [...sw.matchAll(/assets\/(?:rapier|r3f)-[^"',)]+\.js/g)].map((match) => match[0]);
  if (precachedHeavyChunks.length > 0) {
    throw new Error(`Heavy 3D chunks are precached: ${[...new Set(precachedHeavyChunks)].join(', ')}`);
  }
}

console.log('Build budget ok: heavy 3D chunks are lazy/runtime cached.');

#!/usr/bin/env node

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { syncWordVelPreview } from '../src/index.js';

const [, , command, configPath] = process.argv;

if (command !== 'sync' || !configPath) {
  console.error('Usage: wordvel-typescript sync <config.mjs>');
  process.exit(1);
}

try {
  const configModule = await import(await bundleConfig(configPath));
  const result = await syncWordVelPreview(configModule.default ?? configModule);
  const blockCount = Object.keys(result.artifact?.blocks ?? result.blocks ?? {}).length;

  console.log(`Synced WordVel editor preview for ${blockCount} blocks.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

async function bundleConfig(configPath) {
  const requireFromApp = createRequire(resolve(process.cwd(), 'package.json'));
  const esbuild = requireFromApp('esbuild');
  const outfile = resolve(process.cwd(), 'node_modules/.wordvel/preview-config.mjs');

  await esbuild.build({
    entryPoints: [resolve(configPath)],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    jsx: 'automatic',
    packages: 'bundle',
    logLevel: 'silent',
  });

  return pathToFileURL(outfile).href;
}

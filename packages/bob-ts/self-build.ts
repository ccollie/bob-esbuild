import { build } from 'esbuild';
import { promises } from 'fs';
import { resolve } from 'path';
import { startBuild } from '../bob/src/build';
import { rewritePackageJson } from '../bob/src/config/packageJson';
import { buildRollup } from '../bob/src/rollup/build';
import pkg from './package.json';

async function main() {
  await buildRollup({
    inputFiles: ['./src/bin'],
    outputOptions: {
      banner: '#!/usr/bin/env node\n',
    },
    clean: true,
    onlyESM: true,
  });
  await startBuild({
    rollup: {
      clean: false,
      globbyOptions: {
        ignore: [
          resolve('./src/bin/build.ts'),
          resolve('./src/bin/watch.ts'),
          resolve('./src/deps.ts'),
          resolve('./src/watchDeps.ts'),
        ],
      },
    },
  });

  await build({
    bundle: true,
    format: 'cjs',
    target: 'node13.2',
    entryPoints: ['src/deps.ts', 'src/watchDeps.ts'],
    outdir: 'lib',
    platform: 'node',
    minify: true,
    external: ['rollup', 'fsevents'],
  });

  await Promise.all([
    promises
      .readFile('./lib/deps.js', 'utf-8')
      .then(content => promises.writeFile('./lib/deps.js', content.replace(/"node:/g, '"'), 'utf-8')),
    promises
      .readFile('./lib/watchDeps.js', 'utf-8')
      .then(content => promises.writeFile('./lib/watchDeps.js', content.replace(/"node:/g, '"'), 'utf-8')),
    promises.writeFile(
      './lib/package.json',
      JSON.stringify(
        rewritePackageJson(
          {
            ...pkg,
            bin: {
              'bob-ts': './bin/build.mjs',
              'bob-ts-watch': './bin/watch.mjs',
            },
          },
          'lib',
          process.cwd()
        ),
        null,
        2
      ),
      'utf8'
    ),
    promises.copyFile('LICENSE', 'lib/LICENSE'),
    promises.copyFile('README.md', 'lib/README.md'),
  ]);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createRuntimeConfigSource } from './build-helpers.mjs';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outputDirectory = join(projectRoot, 'dist');
const publicFiles = [
  'index.html',
  'styles.css',
  'script.js',
  'link-config.js'
];

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const file of publicFiles) {
  await cp(join(projectRoot, file), join(outputDirectory, file));
}

await cp(
  join(projectRoot, 'assets', 'generated'),
  join(outputDirectory, 'assets', 'generated'),
  { recursive: true }
);

await writeFile(
  join(outputDirectory, 'runtime-config.js'),
  createRuntimeConfigSource(process.env),
  'utf8'
);

console.log(`Built Luke the Moonshot site in ${outputDirectory}`);

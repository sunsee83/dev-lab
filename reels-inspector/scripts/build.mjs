import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERSION, UPDATE_URL } from '../src/version.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const legacyPath = path.join(root, 'src', 'legacy-runtime.js');
const outputPath = path.join(root, 'ri-retry.user.js');

const legacySource = await readFile(legacyPath, 'utf8');
const metaMatch = legacySource.match(/^\/\/ ==UserScript==[\s\S]*?^\/\/ ==\/UserScript==/m);
if (!metaMatch) throw new Error('Userscript metadata block not found in src/legacy-runtime.js');
if (!VERSION) throw new Error('VERSION is empty');
if (!UPDATE_URL) throw new Error('UPDATE_URL is empty');

const metadata = metaMatch[0]
  .replace(/^\/\/ @version\s+[^\s]+\s*$/m, `// @version      ${VERSION}`)
  .replace(/^\/\/ @updateURL\s+[^\s]+\s*$/m, `// @updateURL    ${UPDATE_URL}`)
  .replace(/^\/\/ @downloadURL\s+[^\s]+\s*$/m, `// @downloadURL  ${UPDATE_URL}`);

if (!metadata.includes(`// @updateURL    ${UPDATE_URL}`)) throw new Error('Userscript @updateURL metadata missing');
if (!metadata.includes(`// @downloadURL  ${UPDATE_URL}`)) throw new Error('Userscript @downloadURL metadata missing');

const result = await build({
  absWorkingDir: root,
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
  charset: 'utf8',
  legalComments: 'none',
  treeShaking: false,
  minify: false,
  sourcemap: false,
  write: false,
  logLevel: 'silent'
});

if (!result.outputFiles?.length) throw new Error('esbuild produced no output');
const bundle = result.outputFiles[0].text.trimStart();
const generatedHeader = [
  '// GENERATED FILE — DO NOT EDIT DIRECTLY.',
  '// Source: reels-inspector/src/*',
  `// Build version: ${VERSION}`
].join('\n');

const output = `${metadata}\n${generatedHeader}\n\n${bundle.endsWith('\n') ? bundle : bundle + '\n'}`;
await writeFile(outputPath, output, 'utf8');
console.log(`Built ri-retry.user.js v${VERSION}`);

import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const srcRoot = path.join(root, 'src');
const errors = [];
const warnings = [];

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function rel(file) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}

function addError(file, message) {
  errors.push(`${rel(file)}: ${message}`);
}

function addWarning(file, message) {
  warnings.push(`${rel(file)}: ${message}`);
}

function syntaxCheck(file) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) addError(file, `syntax check failed\n${(result.stderr || result.stdout || '').trim()}`);
}

function importTargets(source) {
  const targets = [];
  const regex = /(?:import\s+(?:[^'\"]+?\s+from\s+)?|export\s+[^'\"]+?\s+from\s+)["']([^"']+)["']/g;
  let match;
  while ((match = regex.exec(source))) targets.push(match[1]);
  return targets;
}

function resolveImport(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null;
  let resolved = path.resolve(path.dirname(fromFile), specifier);
  if (!path.extname(resolved)) resolved += '.js';
  return resolved;
}

const sourceFiles = (await walk(srcRoot)).filter((file) => file.endsWith('.js'));
const scriptFiles = (await walk(path.join(root, 'scripts'))).filter((file) => file.endsWith('.mjs') || file.endsWith('.js'));
const graph = new Map();
const normalizedBlocks = new Map();

for (const file of [...sourceFiles, ...scriptFiles]) syntaxCheck(file);

for (const file of sourceFiles) {
  const source = await readFile(file, 'utf8');
  const name = path.basename(file).toLowerCase();
  const relative = rel(file);
  const isLegacy = relative === 'src/legacy-runtime.js';
  const lineCount = source.split(/\r?\n/).length;

  if (!isLegacy && /(^|[-_.])(old|backup|hotfix|final\d*|copy)([-_.]|$)/i.test(name)) {
    addError(file, 'forbidden migration/backup-style filename');
  }

  if (!isLegacy && lineCount > 500) addError(file, `${lineCount} lines; source files over 500 lines require an explicit split`);
  else if (!isLegacy && lineCount > 350) addWarning(file, `${lineCount} lines; review responsibility split`);

  if (relative.startsWith('src/ui/')) {
    if (/\b(?:showDirectoryPicker|showSaveFilePicker|indexedDB|localStorage)\b/.test(source)) addError(file, 'UI must not access storage/File System APIs directly');
    if (/\bXMLHttpRequest\b|\bwindow\.fetch\b|\bfetch\s*\([^)]/.test(source)) addError(file, 'UI must not implement network/media transport directly');
  }

  if (relative.startsWith('src/metrics/')) {
    if (/\b(?:document|window|MutationObserver|querySelector|getBoundingClientRect)\b/.test(source)) addError(file, 'metrics must remain DOM-independent');
  }

  if (relative.startsWith('src/store/')) {
    if (/from\s+["'][^"']*\/ui\//.test(source) || /import\s+["'][^"']*\/ui\//.test(source)) addError(file, 'store must not import UI');
  }

  if (!isLegacy && /\b(?:old|prev)\w*\s*=\s*\w+\s*;[\s\S]{0,500}?\b\w+\s*=\s*function\b/i.test(source)) {
    addWarning(file, 'possible override-stack pattern; prefer owner API replacement');
  }

  const imports = importTargets(source)
    .map((specifier) => resolveImport(file, specifier))
    .filter(Boolean);
  graph.set(file, imports);

  if (!isLegacy) {
    const lines = source.split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('//'));
    for (let i = 0; i <= lines.length - 8; i += 1) {
      const block = lines.slice(i, i + 8).join('\n').replace(/\s+/g, ' ');
      if (block.length < 180) continue;
      const owners = normalizedBlocks.get(block) || [];
      owners.push(relative);
      normalizedBlocks.set(block, owners);
    }
  }
}

for (const [block, owners] of normalizedBlocks) {
  const unique = [...new Set(owners)];
  if (unique.length > 1) warnings.push(`duplicate block candidate across ${unique.join(', ')}: ${block.slice(0, 100)}…`);
}

const visiting = new Set();
const visited = new Set();
function visit(file, stack = []) {
  if (visiting.has(file)) {
    const start = stack.indexOf(file);
    const cycle = [...stack.slice(start), file].map(rel).join(' -> ');
    errors.push(`circular import: ${cycle}`);
    return;
  }
  if (visited.has(file)) return;
  visiting.add(file);
  for (const next of graph.get(file) || []) {
    if (graph.has(next)) visit(next, [...stack, file]);
  }
  visiting.delete(file);
  visited.add(file);
}
for (const file of graph.keys()) visit(file);

const legacyPath = path.join(srcRoot, 'legacy-runtime.js');
const generatedPath = path.join(root, 'ri-retry.user.js');
const statusPath = path.join(root, 'STATUS.md');
const legacy = await readFile(legacyPath, 'utf8');
const generated = await readFile(generatedPath, 'utf8');
const statusText = await readFile(statusPath, 'utf8');
const legacyVersion = legacy.match(/^\/\/ @version\s+([^\s]+)\s*$/m)?.[1];
const generatedVersion = generated.match(/^\/\/ @version\s+([^\s]+)\s*$/m)?.[1];
const statusVersion = statusText.match(/버전:\s*\*\*v([^*]+)\*\*/)?.[1];

if (!legacyVersion) errors.push('src/legacy-runtime.js: missing @version');
if (!generatedVersion) errors.push('ri-retry.user.js: missing @version');
if (!generated.includes('// GENERATED FILE — DO NOT EDIT DIRECTLY.')) errors.push('ri-retry.user.js: generated warning missing; run npm run build');
if (legacyVersion && generatedVersion && legacyVersion !== generatedVersion) errors.push(`version mismatch: legacy=${legacyVersion}, generated=${generatedVersion}`);
if (generatedVersion && statusVersion && generatedVersion !== statusVersion) errors.push(`version mismatch: generated=${generatedVersion}, STATUS=${statusVersion}`);
if (/^\/\/ @require\s+/m.test(generated)) errors.push('ri-retry.user.js: runtime @require is forbidden');

const rootStat = await stat(generatedPath);
if (!rootStat.size) errors.push('ri-retry.user.js: generated artifact is empty');

for (const warning of warnings) console.warn(`WARN ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`);
  process.exit(1);
}
console.log(`Architecture check passed (${sourceFiles.length} source files, ${warnings.length} warnings)`);

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

  if (!isLegacy && /(^|[-_.])(old|backup|hotfix|final\d*|copy)([-_.]|$)/i.test(name)) addError(file, 'forbidden migration/backup-style filename');
  if (!isLegacy && lineCount > 500) addError(file, `${lineCount} lines; source files over 500 lines require an explicit split`);
  else if (!isLegacy && lineCount > 350) addWarning(file, `${lineCount} lines; review responsibility split`);

  if (relative.startsWith('src/ui/')) {
    if (/\b(?:showDirectoryPicker|showSaveFilePicker|indexedDB|localStorage)\b/.test(source)) addError(file, 'UI must not access storage/File System APIs directly');
    if (/\bXMLHttpRequest\b|\bwindow\.fetch\b|\bfetch\s*\([^)]/.test(source)) addError(file, 'UI must not implement network/media transport directly');
    if (/\bnavigator\.clipboard\b|\bexecCommand\s*\(\s*['"]copy['"]/.test(source)) addError(file, 'UI must use core/clipboard.js instead of implementing clipboard fallback');
    if (/Instagram_/.test(source)) addError(file, 'UI must not own default media filename construction');
  }
  if (relative.startsWith('src/metrics/') && /\b(?:document|window|MutationObserver|querySelector|getBoundingClientRect)\b/.test(source)) addError(file, 'metrics must remain DOM-independent');
  if (relative.startsWith('src/store/') && (/from\s+["'][^"']*\/ui\//.test(source) || /import\s+["'][^"']*\/ui\//.test(source))) addError(file, 'store must not import UI');
  if (!isLegacy && /\b(?:old|prev)\w*\s*=\s*\w+\s*;[\s\S]{0,500}?\b\w+\s*=\s*function\b/i.test(source)) addWarning(file, 'possible override-stack pattern; prefer owner API replacement');

  const imports = importTargets(source).map((specifier) => resolveImport(file, specifier)).filter(Boolean);
  graph.set(file, imports);

  if (!isLegacy) {
    const lines = source.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('//'));
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
    errors.push(`circular import: ${[...stack.slice(start), file].map(rel).join(' -> ')}`);
    return;
  }
  if (visited.has(file)) return;
  visiting.add(file);
  for (const next of graph.get(file) || []) if (graph.has(next)) visit(next, [...stack, file]);
  visiting.delete(file);
  visited.add(file);
}
for (const file of graph.keys()) visit(file);

const generatedPath = path.join(root, 'ri-retry.user.js');
const versionPath = path.join(srcRoot, 'version.js');
const statusPath = path.join(root, 'STATUS.md');
const baselinePath = path.join(root, 'BASELINE.md');
const architecturePath = path.join(root, 'ARCHITECTURE.md');
const planPath = path.join(root, 'PROJECT_PLAN.md');
const readmePath = path.join(root, 'README.md');
const testsReadmePath = path.join(root, 'tests', 'README.md');

const [generated, versionText, statusText, baselineText, architectureText, planText, readmeText, testsReadmeText] = await Promise.all([
  readFile(generatedPath, 'utf8'),
  readFile(versionPath, 'utf8'),
  readFile(statusPath, 'utf8'),
  readFile(baselinePath, 'utf8'),
  readFile(architecturePath, 'utf8'),
  readFile(planPath, 'utf8'),
  readFile(readmePath, 'utf8'),
  readFile(testsReadmePath, 'utf8')
]);

const sourceVersion = versionText.match(/VERSION\s*=\s*['"]([^'"]+)['"]/)?.[1];
const sourceUpdateUrl = versionText.match(/UPDATE_URL\s*=\s*['"]([^'"]+)['"]/)?.[1];
const generatedVersion = generated.match(/^\/\/ @version\s+([^\s]+)\s*$/m)?.[1];
const generatedBuildVersion = generated.match(/^\/\/ Build version:\s*([^\s]+)\s*$/m)?.[1];
const generatedUpdateUrl = generated.match(/^\/\/ @updateURL\s+([^\s]+)\s*$/m)?.[1];
const generatedDownloadUrl = generated.match(/^\/\/ @downloadURL\s+([^\s]+)\s*$/m)?.[1];
const statusVersion = statusText.match(/Runtime version:\s*\*\*v([^*]+)\*\*/)?.[1];

if (!sourceVersion) errors.push('src/version.js: missing VERSION');
if (!sourceUpdateUrl) errors.push('src/version.js: missing UPDATE_URL');
if (!generatedVersion) errors.push('ri-retry.user.js: missing @version');
if (!generated.includes('// GENERATED FILE — DO NOT EDIT DIRECTLY.')) errors.push('ri-retry.user.js: generated warning missing; run npm run build');
if (sourceVersion && generatedVersion && sourceVersion !== generatedVersion) errors.push(`version mismatch: source=${sourceVersion}, generated=${generatedVersion}`);
if (sourceVersion && generatedBuildVersion && sourceVersion !== generatedBuildVersion) errors.push(`build header mismatch: source=${sourceVersion}, build=${generatedBuildVersion}`);
if (!statusVersion) errors.push('STATUS.md: missing Runtime version');
if (sourceVersion && statusVersion && sourceVersion !== statusVersion) errors.push(`version mismatch: source=${sourceVersion}, STATUS=${statusVersion}`);
if (sourceUpdateUrl && generatedUpdateUrl !== sourceUpdateUrl) errors.push(`update URL mismatch: source=${sourceUpdateUrl}, @updateURL=${generatedUpdateUrl || 'missing'}`);
if (sourceUpdateUrl && generatedDownloadUrl !== sourceUpdateUrl) errors.push(`download URL mismatch: source=${sourceUpdateUrl}, @downloadURL=${generatedDownloadUrl || 'missing'}`);
if (!generated.includes('ri32-update-shortcut') || !generated.includes('업데이트 바로가기')) errors.push('ri-retry.user.js: preserved update shortcut missing');

const requiredStatus = ['## Current Release', '## Current Objective', '## Preserve', '## Unverified / Device', '## Next Execution Order', '## Work Protocol'];
for (const marker of requiredStatus) if (!statusText.includes(marker)) errors.push(`STATUS.md: required section missing: ${marker}`);

const requiredBaseline = [
  'PRESERVE / REPLACE / REMOVE-APPROVED',
  '## 2. Grid — Frozen',
  '0–32%',
  '32–59%',
  '0–26%',
  '26–51%',
  '업데이트 바로가기',
  'legacy `#ri3-reels-overlay`',
  'silent default fallback 금지',
  '## 8. Replacement gate'
];
for (const marker of requiredBaseline) if (!baselineText.includes(marker)) errors.push(`BASELINE.md: required marker missing: ${marker}`);

const requiredArchitecture = [
  '## 3. Owner map',
  'CLOSED | COMPACT | EXPANDED',
  'GLOBAL | CONTENT',
  'migration/reel-context-adapter.js',
  'ui/reel-overlay.js',
  'legacy-runtime.js',
  '## 7. Build / architecture gate'
];
for (const marker of requiredArchitecture) if (!architectureText.includes(marker)) errors.push(`ARCHITECTURE.md: required marker missing: ${marker}`);

if (!planText.includes('발굴') || !planText.includes('STT / OCR') || !planText.includes('## 9. Roadmap')) errors.push('PROJECT_PLAN.md: product flow/analysis roadmap missing');
if (!readmeText.includes('문서 — 5개만 기준으로 사용') || !readmeText.includes('STATUS.md') || !readmeText.includes('BASELINE.md')) errors.push('README.md: compact document map missing');
if (!testsReadmeText.includes('Active Reel / Overlay gate') || !testsReadmeText.includes('Android Edge device acceptance')) errors.push('tests/README.md: acceptance summary missing');

const canonicalDocs = [readmePath, planPath, statusPath, architecturePath, baselinePath, testsReadmePath];
let docBytes = 0;
for (const file of canonicalDocs) {
  const info = await stat(file);
  docBytes += info.size;
  if (info.size > 20000) addError(file, `${info.size} bytes; canonical docs should stay compact (<20KB each)`);
}
if (docBytes > 60000) errors.push(`canonical docs total ${docBytes} bytes; keep documentation under 60KB`);

const obsoleteDocs = ['WORK_TRACK.md', 'CODE_STRUCTURE.md', 'UI_BASELINE.md', 'UI_ARCHITECTURE.md', 'GRID_BASELINE.md', 'PRESERVATION_BASELINE.md'];
const rootNames = new Set(await readdir(root));
for (const name of obsoleteDocs) if (rootNames.has(name)) errors.push(`${name}: obsolete duplicate doc; merge into STATUS/ARCHITECTURE/BASELINE`);

const sourceRelative = new Set(sourceFiles.map(rel));
const requiredSources = [
  'src/core/activity.js',
  'src/migration/legacy-store-adapter.js',
  'src/migration/reel-context-adapter.js',
  'src/metrics/metrics.js',
  'src/media/download-manager.js',
  'src/ui/layout.js',
  'src/ui/workspace-state.js',
  'src/ui/research-workspace.js',
  'src/ui/activity-indicator.js',
  'src/ui/metric-format.js',
  'src/ui/reel-overlay.js',
  'src/ui/ri-settings.js'
];
for (const filename of requiredSources) if (!sourceRelative.has(filename)) errors.push(`${filename}: required owner missing`);

const workspaceSource = await readFile(path.join(root, 'src/ui/research-workspace.js'), 'utf8');
if (!workspaceSource.includes('ri32-update-shortcut')) errors.push('src/ui/research-workspace.js: update shortcut slot missing');
if (!workspaceSource.includes("current.detent === 'expanded'")) errors.push('src/ui/research-workspace.js: compact/expanded binding missing');
if (!workspaceSource.includes('ri32-activity-host')) errors.push('src/ui/research-workspace.js: Activity host missing');

const activitySource = await readFile(path.join(root, 'src/core/activity.js'), 'utf8');
if (!activitySource.includes("'running'") || !activitySource.includes("'success'") || !activitySource.includes("'error'")) errors.push('src/core/activity.js: activity lifecycle states missing');

if (/^\/\/ @require\s+/m.test(generated)) errors.push('ri-retry.user.js: runtime @require is forbidden');
const rootStat = await stat(generatedPath);
if (!rootStat.size) errors.push('ri-retry.user.js: generated artifact is empty');

for (const warning of warnings) console.warn(`WARN ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`);
  process.exit(1);
}
console.log(`Architecture check passed (${sourceFiles.length} source files, ${warnings.length} warnings, ${docBytes} doc bytes)`);

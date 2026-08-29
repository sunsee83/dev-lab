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
    if (/\bnavigator\.clipboard\b|\bexecCommand\s*\(\s*['"]copy['"]/.test(source)) addError(file, 'UI must use core/clipboard.js instead of implementing clipboard fallback');
    if (/Instagram_/.test(source)) addError(file, 'UI must not own default media filename construction');
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

const generatedPath = path.join(root, 'ri-retry.user.js');
const projectPlanPath = path.join(root, 'PROJECT_PLAN.md');
const statusPath = path.join(root, 'STATUS.md');
const workTrackPath = path.join(root, 'WORK_TRACK.md');
const preservationPath = path.join(root, 'PRESERVATION_BASELINE.md');
const uiBaselinePath = path.join(root, 'UI_BASELINE.md');
const uiArchitecturePath = path.join(root, 'UI_ARCHITECTURE.md');
const versionPath = path.join(srcRoot, 'version.js');
const generated = await readFile(generatedPath, 'utf8');
const projectPlanText = await readFile(projectPlanPath, 'utf8');
const statusText = await readFile(statusPath, 'utf8');
const workTrackText = await readFile(workTrackPath, 'utf8');
const preservationText = await readFile(preservationPath, 'utf8');
const uiBaselineText = await readFile(uiBaselinePath, 'utf8');
const uiArchitectureText = await readFile(uiArchitecturePath, 'utf8');
const versionText = await readFile(versionPath, 'utf8');
const sourceVersion = versionText.match(/VERSION\s*=\s*['"]([^'"]+)['"]/)?.[1];
const sourceUpdateUrl = versionText.match(/UPDATE_URL\s*=\s*['"]([^'"]+)['"]/)?.[1];
const generatedVersion = generated.match(/^\/\/ @version\s+([^\s]+)\s*$/m)?.[1];
const generatedBuildVersion = generated.match(/^\/\/ Build version:\s*([^\s]+)\s*$/m)?.[1];
const generatedUpdateUrl = generated.match(/^\/\/ @updateURL\s+([^\s]+)\s*$/m)?.[1];
const generatedDownloadUrl = generated.match(/^\/\/ @downloadURL\s+([^\s]+)\s*$/m)?.[1];
const projectPlanVersion = projectPlanText.match(/현재 배포 버전:\s*\*\*v([^*]+)\*\*/)?.[1];
const statusVersion = statusText.match(/버전:\s*\*\*v([^*]+)\*\*/)?.[1];
const workTrackVersion = workTrackText.match(/Current version:\s*\*\*v([^*]+)\*\*/)?.[1];

if (!sourceVersion) errors.push('src/version.js: missing VERSION');
if (!sourceUpdateUrl) errors.push('src/version.js: missing UPDATE_URL');
if (!generatedVersion) errors.push('ri-retry.user.js: missing @version');
if (!generated.includes('// GENERATED FILE — DO NOT EDIT DIRECTLY.')) errors.push('ri-retry.user.js: generated warning missing; run npm run build');
if (sourceVersion && generatedVersion && sourceVersion !== generatedVersion) errors.push(`version mismatch: source=${sourceVersion}, generated=${generatedVersion}`);
if (sourceVersion && generatedBuildVersion && sourceVersion !== generatedBuildVersion) errors.push(`build header mismatch: source=${sourceVersion}, build=${generatedBuildVersion}`);
if (!projectPlanVersion) errors.push('PROJECT_PLAN.md: missing current deployment version');
if (sourceVersion && projectPlanVersion && sourceVersion !== projectPlanVersion) errors.push(`version mismatch: source=${sourceVersion}, PROJECT_PLAN=${projectPlanVersion}`);
if (generatedVersion && statusVersion && generatedVersion !== statusVersion) errors.push(`version mismatch: generated=${generatedVersion}, STATUS=${statusVersion}`);
if (!workTrackVersion) errors.push('WORK_TRACK.md: missing Current version');
if (sourceVersion && workTrackVersion && sourceVersion !== workTrackVersion) errors.push(`version mismatch: source=${sourceVersion}, WORK_TRACK=${workTrackVersion}`);
if (sourceUpdateUrl && generatedUpdateUrl !== sourceUpdateUrl) errors.push(`update URL mismatch: source=${sourceUpdateUrl}, @updateURL=${generatedUpdateUrl || 'missing'}`);
if (sourceUpdateUrl && generatedDownloadUrl !== sourceUpdateUrl) errors.push(`download URL mismatch: source=${sourceUpdateUrl}, @downloadURL=${generatedDownloadUrl || 'missing'}`);
if (!generated.includes('ri32-update-shortcut') || !generated.includes('업데이트 바로가기')) errors.push('ri-retry.user.js: preserved update shortcut missing');
if (!preservationText.includes('RI Panel/Research Sheet의 큰 업데이트 바로가기')) errors.push('PRESERVATION_BASELINE.md: update shortcut preservation rule missing');

const requiredUiSections = [
  '# 4. 전역 RI Launcher',
  '# 5. Grid — Frozen UI 유지',
  '# 6. Reel Overlay',
  '# 7. RI Research Sheet — 모바일 상세 조사 UI',
  '# 17. 현재 v3.2.3과 Target 비교',
  '# 19. UI Upgrade Migration Plan',
  '# 20. UI Definition of Done'
];
for (const heading of requiredUiSections) {
  if (!uiBaselineText.includes(heading)) errors.push(`UI_BASELINE.md: required section missing: ${heading}`);
}
if (!uiBaselineText.includes('기존 Reel RI')) errors.push('UI_BASELINE.md: preserved Reel RI visual identity rule missing');
if (!uiBaselineText.includes('업데이트 바로가기')) errors.push('UI_BASELINE.md: update shortcut rule missing');

const requiredUiArchitectureSections = [
  '# 2. 5-Layer UI Model',
  '# 3. Context Model',
  '# 4. Single UI Root',
  '# 5. Workspace State Machine',
  '# 6. Route / Identity Change Policy',
  '# 7. Workspace Navigation',
  '# 10. Layout Manager',
  '# 16. Feedback & Activity Layer',
  '# 19. UI Read Model Boundary',
  '# 20. UI State Ownership',
  '# 22. Migration Plan',
  '# 23. Acceptance / Definition of Done'
];
for (const heading of requiredUiArchitectureSections) {
  if (!uiArchitectureText.includes(heading)) errors.push(`UI_ARCHITECTURE.md: required section missing: ${heading}`);
}
if (!uiArchitectureText.includes('CONTENT') || !uiArchitectureText.includes('GLOBAL')) errors.push('UI_ARCHITECTURE.md: context modes missing');
if (!uiArchitectureText.includes('CLOSED') || !uiArchitectureText.includes('COMPACT') || !uiArchitectureText.includes('EXPANDED')) errors.push('UI_ARCHITECTURE.md: workspace state machine markers missing');
if (!uiArchitectureText.includes('active tab만 mount')) errors.push('UI_ARCHITECTURE.md: active-tab lazy mount rule missing');
if (!uiArchitectureText.includes('브라우저 Back') && !uiArchitectureText.includes('browser Back')) errors.push('UI_ARCHITECTURE.md: browser navigation preservation rule missing');

if (!workTrackText.includes('UI_BASELINE.md')) errors.push('WORK_TRACK.md: UI_BASELINE.md reference missing');
if (!workTrackText.includes('UI_ARCHITECTURE.md')) errors.push('WORK_TRACK.md: UI_ARCHITECTURE.md reference missing');
if (!workTrackText.includes('UI-B — Primitive + Layout + Workspace State Foundation')) errors.push('WORK_TRACK.md: UI-B execution checkpoint missing');
if (!workTrackText.includes('UI-C — Global RI Launcher Replacement')) errors.push('WORK_TRACK.md: next UI-C execution step missing');

const requiredUiFoundationFiles = [
  'src/ui/ri-primitives.js',
  'src/ui/layout.js',
  'src/ui/workspace-state.js'
];
const sourceRelative = new Set(sourceFiles.map(rel));
for (const filename of requiredUiFoundationFiles) {
  if (!sourceRelative.has(filename)) errors.push(`${filename}: required UI-B owner missing`);
}

const requiredWorkSections = [
  '# 2. Current Objective',
  '# 4. Preserve — 건드리면 안 되는 승인 개선',
  '# 5. Current Known Issues / Unverified',
  '# 7. Next Execution Order',
  '# 8. Work Update Protocol',
  '# 9. Definition of Done for Each Step'
];
for (const heading of requiredWorkSections) {
  if (!workTrackText.includes(heading)) errors.push(`WORK_TRACK.md: required section missing: ${heading}`);
}

if (/^\/\/ @require\s+/m.test(generated)) errors.push('ri-retry.user.js: runtime @require is forbidden');

const rootStat = await stat(generatedPath);
if (!rootStat.size) errors.push('ri-retry.user.js: generated artifact is empty');

for (const warning of warnings) console.warn(`WARN ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`);
  process.exit(1);
}
console.log(`Architecture check passed (${sourceFiles.length} source files, ${warnings.length} warnings)`);

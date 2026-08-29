import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workspaceView = await readFile(new URL('../../src/ui/research-workspace.js', import.meta.url), 'utf8');
const activityView = await readFile(new URL('../../src/ui/activity-indicator.js', import.meta.url), 'utf8');
const panel = await readFile(new URL('../../src/ui/ri-panel.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../../src/ui/styles.js', import.meta.url), 'utf8');

test('Research Workspace keeps explicit compact/expanded controls and the preserved update shortcut', () => {
  assert.match(workspaceView, /current\.detent === 'expanded'/);
  assert.match(workspaceView, /detentButton\.textContent = expanded \? '축소' : '확장'/);
  assert.match(workspaceView, /ri32-update-shortcut/);
  assert.match(workspaceView, /handleDocumentPointerDown/);
  assert.match(workspaceView, /lastState\.detent !== 'compact'/);
  assert.match(styles, /#ri32-panel\{[\s\S]*?left:8px;right:8px;bottom:/);
  assert.match(styles, /var\(--ri-sheet-compact-height,52vh\)/);
  assert.match(styles, /data-detent="expanded"[\s\S]*?var\(--ri-sheet-expanded-height,82vh\)/);
});

test('Research Workspace separates CONTENT six-tab research from GLOBAL RI Home without removing settings or update access', () => {
  assert.match(panel, /\['summary', '요약'\]/);
  assert.match(panel, /\['content', '콘텐츠'\]/);
  assert.match(panel, /\['comments', '댓글'\]/);
  assert.match(panel, /\['analysis', '분석'\]/);
  assert.match(panel, /\['media', '미디어'\]/);
  assert.match(panel, /\['settings', '설정'\]/);
  assert.match(panel, /state\.mode === 'global'/);
  assert.match(panel, /renderGlobalHome\(body\);\s*renderSettings\(body\);/);
  assert.match(workspaceView, /tabsNode\.hidden = !contentMode/);
  assert.match(panel, /onUpdate:\s*openUpdateShortcut/);
});

test('Feedback activity moves into the open Workspace and keeps actionable errors persistent', () => {
  assert.match(workspaceView, /ri32-activity-host/);
  assert.match(activityView, /activity\.getVisible\(\)/);
  assert.match(activityView, /doc\.querySelector\('#ri32-panel \.ri32-activity-host'\)/);
  assert.match(activityView, /item\?\.state === 'success'[\s\S]*?showToast/);
  assert.match(activityView, /item\?\.state === 'error' && !item\.persistent/);
  assert.match(activityView, /onAction\?\.\(item\)/);
  assert.match(panel, /function openSettings\(\)/);
  assert.match(styles, /#ri32-activity\{[\s\S]*?var\(--ri-feedback-bottom/);
  assert.match(styles, /#ri32-activity\[data-embedded="true"\]/);
});

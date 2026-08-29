import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const styles = await readFile(new URL('../../src/ui/styles.js', import.meta.url), 'utf8');
const panel = await readFile(new URL('../../src/ui/ri-panel.js', import.meta.url), 'utf8');

test('Global RI launcher preserves the v3.1.6 research icon while separating visual size from touch target', () => {
  assert.match(panel, /M4 19V13M9 19V9M14 19V5/);
  assert.match(panel, /circle cx=\\"17\.5\\" cy=\\"14\.5\\" r=\\"3\.5\\"/);
  assert.match(styles, /#ri32-tool\{[\s\S]*?width:44px;height:44px;[\s\S]*?border:0;[\s\S]*?background:transparent/);
  assert.match(styles, /#ri32-tool::before\{[\s\S]*?width:34px;height:34px;[\s\S]*?background:rgba\(0,0,0,\.12\)/);
  assert.match(styles, /#ri32-tool svg\{[\s\S]*?width:21px;height:21px/);
  assert.match(styles, /var\(--ri-launcher-right,12px\)/);
  assert.match(styles, /var\(--ri-launcher-bottom,/);
});

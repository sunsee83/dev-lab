import { readFile, writeFile } from 'node:fs/promises';

const file = new URL('../src/legacy-runtime.js', import.meta.url);
let source = await readFile(file, 'utf8');

if (source.includes('window.__RI32_CAPTURE_PATCH__')) {
  console.log('Legacy capture handoff already applied.');
  process.exit(0);
}

const needle = `    saveItem = function (code, patch, source, confidence) {\n        var item, keys, i, key, changed = false;\n        if (!code) return null;\n`;
const replacement = `    saveItem = function (code, patch, source, confidence) {\n        var item, keys, i, key, changed = false, captured;\n        if (!code) return null;\n        if (typeof window.__RI32_CAPTURE_PATCH__ === 'function') {\n            try {\n                captured = window.__RI32_CAPTURE_PATCH__({\n                    shortcode: code,\n                    patch: patch || {},\n                    source: source || 'embedded',\n                    confidence: confidence\n                });\n                if (captured && captured.item) {\n                    items[code] = captured.item;\n                    if (captured.changed) scheduleRefresh();\n                    return items[code];\n                }\n            } catch (e) {}\n        }\n`;

const index = source.lastIndexOf(needle);
if (index < 0) throw new Error('Active legacy saveItem migration target not found');
source = source.slice(0, index) + replacement + source.slice(index + needle.length);
await writeFile(file, source);
console.log('Applied legacy capture → Data Engine handoff.');

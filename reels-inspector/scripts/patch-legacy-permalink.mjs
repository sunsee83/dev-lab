import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(here, '../src/legacy-runtime.js');
const source = await readFile(target, 'utf8');

const before = `                    if (xhr.status >= 200 && xhr.status < 400) {
                        scanPermalinkJson(xhr.responseText || '');
                        var patch = parsePermalink(xhr.responseText || '', job.url);
                        patch.fetched = Date.now();
                        saveItem(job.code, patch, 'permalink', 'medium');
                    }`;

const after = `                    if (xhr.status >= 200 && xhr.status < 400) {
                        var html = xhr.responseText || '', fetched = Date.now(), captured = null, patch;
                        scanPermalinkJson(html);
                        if (typeof window.__RI32_CAPTURE_PERMALINK__ === 'function') {
                            try {
                                captured = window.__RI32_CAPTURE_PERMALINK__({
                                    html: html,
                                    pageUrl: job.url,
                                    source: 'permalink',
                                    confidence: 'medium',
                                    fetched: fetched
                                });
                                if (captured && captured.item) {
                                    items[job.code] = captured.item;
                                    if (captured.changed) scheduleRefresh();
                                }
                            } catch (e) {}
                        }
                        if (!captured || !captured.item) {
                            patch = parsePermalink(html, job.url);
                            patch.fetched = fetched;
                            saveItem(job.code, patch, 'permalink', 'medium');
                        }
                    }`;

if (source.includes(after)) {
  console.log('Legacy permalink handoff already current.');
  process.exit(0);
}
if (!source.includes(before)) throw new Error('legacy permalink pump block not found');
await writeFile(target, source.replace(before, after));
console.log('Applied legacy permalink HTML → Data Engine handoff.');

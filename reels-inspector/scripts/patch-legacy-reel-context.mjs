import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(here, '../src/legacy-runtime.js');
const source = await readFile(target, 'utf8');

const before = `    function reelContext() {
        var video = activeVideo(), r, code = '', metrics, owner, candidates = [], keys;
        if (!video) return null;`;

const after = `    function reelContext() {
        var bridged, video, r, code = '', metrics, owner, candidates = [], keys;
        if (typeof window.__RI32_REEL_CONTEXT__ === 'function') {
            try {
                bridged = window.__RI32_REEL_CONTEXT__();
                if (bridged && bridged.video) {
                    return {
                        video: bridged.video,
                        code: bridged.shortcode || (bridged.identity && bridged.identity.shortcode) || '',
                        native: bridged.native || { likes: null, comments: null, reposts: null },
                        owner: bridged.username || (bridged.identity && bridged.identity.username) || '',
                        status: bridged.status || ((bridged.shortcode || (bridged.identity && bridged.identity.shortcode)) ? 'IDENTIFIED' : 'IDENTIFYING')
                    };
                }
            } catch (e) {}
        }
        video = activeVideo();
        if (!video) return null;`;

if (source.includes(after)) {
  console.log('Legacy Reel context handoff already current.');
  process.exit(0);
}
if (!source.includes(before)) throw new Error('legacy reelContext entry block not found');
await writeFile(target, source.replace(before, after));
console.log('Applied modern Reel context → legacy visual handoff.');

import { readFile, writeFile } from 'node:fs/promises';

const file = new URL('../src/legacy-runtime.js', import.meta.url);
let source = await readFile(file, 'utf8');

if (source.includes('window.__RI32_CAPTURE_RAW__')) {
  console.log('Legacy raw capture handoff already applied.');
  process.exit(0);
}

const needle = `    rememberObject = function (obj, source) {\n        var code, patch = {}, n, user, videos = [], images = [], i, key, type, directCover, carouselImages;\n        if (!obj || typeof obj !== 'object') return;\n        code = obj.code || obj.shortcode || obj.short_code;\n        if (!code || typeof code !== 'string' || code.length < 5 || code.length > 40) return;\n`;
const replacement = `    rememberObject = function (obj, source) {\n        var code, patch = {}, n, user, videos = [], images = [], i, key, type, directCover, carouselImages, captured, evidenceVideos, evidenceImages;\n        if (!obj || typeof obj !== 'object') return;\n        code = obj.code || obj.shortcode || obj.short_code;\n        if (!code || typeof code !== 'string' || code.length < 5 || code.length > 40) return;\n        if (typeof window.__RI32_CAPTURE_RAW__ === 'function') {\n            try {\n                captured = window.__RI32_CAPTURE_RAW__({\n                    input: obj,\n                    pageUrl: codeFromUrl(location.href) === code ? location.href : '',\n                    source: source || 'embedded',\n                    confidence: source === 'network' ? 'high' : 'medium'\n                });\n                if (captured && captured.item) {\n                    items[code] = captured.item;\n                    evidenceVideos = captured.evidence && captured.evidence.videoUrls || [];\n                    evidenceImages = captured.evidence && captured.evidence.imageUrls || [];\n                    for (i = 0; i < evidenceVideos.length; i++) { key = normalizeUrl(evidenceVideos[i]); if (key) videoMap[key] = code; }\n                    for (i = 0; i < evidenceImages.length; i++) { key = normalizeUrl(evidenceImages[i]); if (key) posterMap[key] = code; }\n                    if (captured.changed) scheduleRefresh();\n                    return;\n                }\n            } catch (e) {}\n        }\n`;

const index = source.lastIndexOf(needle);
if (index < 0) throw new Error('Active legacy rememberObject migration target not found');
source = source.slice(0, index) + replacement + source.slice(index + needle.length);
await writeFile(file, source);
console.log('Applied legacy raw capture → Extractor handoff.');

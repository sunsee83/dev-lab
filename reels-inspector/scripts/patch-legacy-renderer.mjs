import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(here, '../src/legacy-runtime.js');
let source = await readFile(target, 'utf8');

const gridBefore = `    function renderGridCard(anchor, data) {
        var row1 = anchor.querySelector('.ri3-grid-row1');
        var row2 = anchor.querySelector('.ri3-grid-row2');
        var views = fieldValue(data, 'views');
        var likes = fieldValue(data, 'likes');
        var comments = fieldValue(data, 'comments');
        var reposts = fieldValue(data, 'reposts');
        var date = fieldValue(data, 'date');
        var videoCard = isVideoCard(anchor, data);
        var type = effectiveCardType(anchor, data);
        var er = videoCard ? engagement(views, likes, comments, reposts) : null;
        var growth = videoCard && views ? growth24h(data.code, views) : null;
        var multiple = videoCard && views ? accountMultiple(data.code, fieldValue(data, 'owner'), views) : null;
        var line1, line2, key, actions, safe;`;

const gridAfter = `    function renderGridCard(anchor, data) {
        var row1 = anchor.querySelector('.ri3-grid-row1');
        var row2 = anchor.querySelector('.ri3-grid-row2');
        var code = data && (data.code || data.shortcode) || anchor.dataset.ri315Code || codeFromUrl(anchor.href);
        var modern = null, summary = null;
        if (code && typeof window.__RI32_RENDER_VIEW__ === 'function') {
            try {
                modern = window.__RI32_RENDER_VIEW__(code);
                if (modern && modern.post) data = modern.post;
                if (modern && modern.derived) summary = modern.derived;
            } catch (e) {}
        }
        var views = fieldValue(data, 'views');
        var likes = fieldValue(data, 'likes');
        var comments = fieldValue(data, 'comments');
        var reposts = fieldValue(data, 'reposts');
        var date = fieldValue(data, 'date');
        var videoCard = isVideoCard(anchor, data);
        var type = effectiveCardType(anchor, data);
        var er = videoCard ? (summary ? summary.engagementRate : engagement(views, likes, comments, reposts)) : null;
        var growth = videoCard && views ? (summary ? summary.growth24h : growth24h(code, views)) : null;
        var multiple = videoCard && views ? (summary ? summary.accountMultiple : accountMultiple(code, fieldValue(data, 'owner'), views)) : null;
        var line1, line2, key, actions, safe;`;

const reelBefore = `    function renderReelOverlay(ctx) {
        var box = ensureOverlay(), data, views, er, growth, multiple, lines = [], key;
        if (!ctx || !ctx.code) { box.style.display = 'none'; return; }
        data = items[ctx.code] || {};
        views = fieldValue(data, 'views');
        er = engagement(views, ctx.native.likes, ctx.native.comments, ctx.native.reposts);
        growth = views ? growth24h(ctx.code, views) : null;
        multiple = views ? accountMultiple(ctx.code, ctx.owner || fieldValue(data, 'owner'), views) : null;`;

const reelAfter = `    function renderReelOverlay(ctx) {
        var box = ensureOverlay(), data, modern = null, summary = null, views, er, growth, multiple, lines = [], key;
        if (!ctx || !ctx.code) { box.style.display = 'none'; return; }
        if (typeof window.__RI32_RENDER_VIEW__ === 'function') {
            try {
                modern = window.__RI32_RENDER_VIEW__(ctx.code, ctx.native || {});
                if (modern && modern.post) data = modern.post;
                if (modern && modern.derived) summary = modern.derived;
            } catch (e) {}
        }
        if (!data) data = items[ctx.code] || {};
        views = fieldValue(data, 'views');
        er = summary ? summary.engagementRate : engagement(views, ctx.native.likes, ctx.native.comments, ctx.native.reposts);
        growth = views ? (summary ? summary.growth24h : growth24h(ctx.code, views)) : null;
        multiple = views ? (summary ? summary.accountMultiple : accountMultiple(ctx.code, ctx.owner || fieldValue(data, 'owner'), views)) : null;`;

if (source.includes(gridAfter) && source.includes(reelAfter)) {
  console.log('Legacy renderer handoff already current.');
  process.exit(0);
}
if (!source.includes(gridBefore)) throw new Error('legacy Grid renderer block not found');
if (!source.includes(reelBefore)) throw new Error('legacy Reel overlay block not found');
source = source.replace(gridBefore, gridAfter).replace(reelBefore, reelAfter);
await writeFile(target, source);
console.log('Applied Data Engine/Metrics → legacy renderer handoff.');

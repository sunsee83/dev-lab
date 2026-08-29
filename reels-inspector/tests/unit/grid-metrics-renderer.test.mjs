import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  GRID_METRIC_MARKUP,
  GRID_SLOT_COUNT,
  buildGridMetricRows,
  gridCountLabel
} from '../../src/ui/grid-metrics-renderer.js';

const mainSource = await readFile(new URL('../../src/main.js', import.meta.url), 'utf8');

test('staged Grid renderer preserves the frozen 4+4 slot markup and remains unmounted', () => {
  assert.equal(GRID_SLOT_COUNT, 4);
  assert.equal(
    GRID_METRIC_MARKUP,
    '<div class="ri3-grid-row1"><span></span><span></span><span></span><span></span></div><div class="ri3-grid-row2"><span></span><span></span><span></span><span></span></div>'
  );
  assert.doesNotMatch(mainSource, /grid-metrics-renderer/);
});

test('Grid renderer reproduces the frozen Reel/Video eight-slot labels', () => {
  const result = buildGridMetricRows({
    mediaType: 'REEL',
    views: 429000,
    likes: 12300,
    comments: 0,
    reposts: 45,
    date: '2026-08-29'
  }, {
    engagementRate: 2.345,
    growth24h: 8.2,
    accountMultiple: 3.7
  });

  assert.deepEqual(result.row1, ['▶42.9만', '♥1.2만', '●0', '↻45']);
  assert.deepEqual(result.row2, ['2.35%', '+8.2%', '×3.7', '08/29']);
});

test('Grid renderer keeps Photo/Carousel views and derived metrics hidden while preserving real zero counts', () => {
  const photo = buildGridMetricRows({
    mediaType: 'PHOTO',
    views: 999999,
    likes: 0,
    comments: 0,
    reposts: undefined,
    date: '2026-01-02'
  }, {
    engagementRate: 99,
    growth24h: 99,
    accountMultiple: 99
  });

  assert.deepEqual(photo.row1, ['▶-', '♥0', '●0', '↻-']);
  assert.deepEqual(photo.row2, ['-', '-', '-', '01/02']);
});

test('Grid count formatting matches legacy zero/missing/compact behavior', () => {
  assert.equal(gridCountLabel(undefined), '-');
  assert.equal(gridCountLabel(''), '-');
  assert.equal(gridCountLabel(-1), '-');
  assert.equal(gridCountLabel(0), '0');
  assert.equal(gridCountLabel(999), '999');
  assert.equal(gridCountLabel(1000), '1K');
  assert.equal(gridCountLabel(10000), '1만');
  assert.equal(gridCountLabel(100000000), '1억');
});

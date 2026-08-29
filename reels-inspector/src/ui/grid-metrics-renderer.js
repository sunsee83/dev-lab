import { compactCountLabel, multipleLabel, percentLabel } from './metric-format.js';

export const GRID_METRIC_MARKUP = '<div class="ri3-grid-row1"><span></span><span></span><span></span><span></span></div><div class="ri3-grid-row2"><span></span><span></span><span></span><span></span></div>';
export const GRID_SLOT_COUNT = 4;

export function buildGridMetricRows(post = {}, derived = {}, { videoCard = isVideoPost(post) } = {}) {
  const views = post?.views;
  const row1 = [
    `▶${videoCard && positive(views) ? gridCountLabel(views) : '-'}`,
    `♥${gridCountLabel(post?.likes)}`,
    `●${gridCountLabel(post?.comments)}`,
    `↻${gridCountLabel(post?.reposts)}`
  ];
  const row2 = [
    videoCard ? percentLabel(derived?.engagementRate, { missing: '-' }) : '-',
    videoCard ? percentLabel(derived?.growth24h, { sign: true, missing: '-' }) : '-',
    videoCard ? multipleLabel(derived?.accountMultiple, { missing: '-' }) : '-',
    gridDateLabel(post?.date)
  ];
  return {
    row1,
    row2,
    renderKey: [
      String(post?.mediaType || ''),
      views,
      post?.likes,
      post?.comments,
      post?.reposts,
      post?.date,
      derived?.engagementRate,
      derived?.growth24h,
      derived?.accountMultiple
    ].join('|')
  };
}

export function gridCountLabel(value) {
  if (value == null || value === '') return '-';
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return '-';
  if (number === 0) return '0';
  return compactCountLabel(number, { missing: '-' });
}

export function gridDateLabel(value) {
  const text = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}/.test(text)) return '-';
  return text.slice(5, 10).replace('-', '/');
}

export function isVideoPost(post) {
  const type = String(post?.mediaType || '').toUpperCase();
  return type === 'REEL' || type === 'VIDEO';
}

function positive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0;
}

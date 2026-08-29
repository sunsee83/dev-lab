import { addRow, createSection, renderEmpty } from './ri-primitives.js';

const COUNT_FORMATTER = new Intl.NumberFormat('ko-KR');

export function renderRiSummary({ body, post, metrics, doc = globalThis.document } = {}) {
  if (!body || !doc) return;
  if (!post?.shortcode) return renderEmpty(body, '현재 콘텐츠가 선택되지 않았습니다.', doc);

  const derived = metrics?.summarize?.(post) || {};
  const section = createSection(body, '현재 콘텐츠', doc);
  addRow(section, '계정', post.username ? `@${post.username}` : '—', doc);
  addRow(section, 'Shortcode', post.shortcode, doc);
  addRow(section, '유형', post.mediaType || '확인 중', doc);
  addRow(section, '조회수', countLabel(post.views), doc);
  addRow(section, '좋아요', countLabel(post.likes), doc);
  addRow(section, '댓글', countLabel(post.comments), doc);
  addRow(section, '리포스트', countLabel(post.reposts), doc);
  addRow(section, 'ER', percentLabel(derived.engagementRate), doc);
  addRow(section, '24h', percentLabel(derived.growth24h, { sign: true }), doc);
  addRow(section, '계정 대비', multipleLabel(derived.accountMultiple), doc);
  addRow(section, '게시일', post.date || '—', doc);

  const note = doc.createElement('div');
  note.className = 'ri32-note';
  note.textContent = 'ER은 검증된 조회수·좋아요·댓글·리포스트가 모두 있을 때만 계산합니다. 24h는 실제 18~32시간 snapshot, 계정 대비는 최근 비교 표본 5개 이상일 때만 표시합니다.';
  section.appendChild(note);
}

function countLabel(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return '—';
  return COUNT_FORMATTER.format(number);
}

function percentLabel(value, { sign = false } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  const digits = Math.abs(number) >= 10 ? 1 : 2;
  const text = number.toFixed(digits).replace(/0+$/, '').replace(/\.$/, '');
  return `${sign && number >= 0 ? '+' : ''}${text}%`;
}

function multipleLabel(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return '—';
  const digits = number >= 10 ? 1 : 2;
  return `×${number.toFixed(digits).replace(/0+$/, '').replace(/\.$/, '')}`;
}

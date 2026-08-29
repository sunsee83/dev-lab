const COUNT_FORMATTER = new Intl.NumberFormat('ko-KR');

export function countLabel(value, { missing = '—' } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return missing;
  return COUNT_FORMATTER.format(number);
}

export function compactCountLabel(value, { missing = '' } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return missing;
  if (number >= 100000000) return `${trimFixed(number / 100000000, 1)}억`;
  if (number >= 10000) return `${trimFixed(number / 10000, 1)}만`;
  if (number >= 1000) return `${trimFixed(number / 1000, 1)}K`;
  return String(Math.round(number));
}

export function percentLabel(value, { sign = false, missing = '—' } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) return missing;
  const digits = Math.abs(number) >= 10 ? 1 : 2;
  const prefix = sign && number >= 0 ? '+' : '';
  return `${prefix}${trimFixed(number, digits)}%`;
}

export function multipleLabel(value, { missing = '—' } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return missing;
  return `×${trimFixed(number, number >= 10 ? 1 : 2)}`;
}

export function shortDateLabel(value, { missing = '' } = {}) {
  const text = String(value || '').trim();
  const match = text.match(/^(?:\d{4}-)?(\d{1,2})-(\d{1,2})/);
  if (match) return `${match[1].padStart(2, '0')}/${match[2].padStart(2, '0')}`;
  const slash = text.match(/^(?:\d{4}\/)?(\d{1,2})\/(\d{1,2})/);
  if (slash) return `${slash[1].padStart(2, '0')}/${slash[2].padStart(2, '0')}`;
  return missing;
}

function trimFixed(value, digits) {
  return Number(value).toFixed(digits).replace(/0+$/, '').replace(/\.$/, '');
}

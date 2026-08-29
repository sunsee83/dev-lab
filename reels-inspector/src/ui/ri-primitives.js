export function createSection(body, title, doc = globalThis.document) {
  if (!body || !doc) return null;
  const section = doc.createElement('section');
  section.className = 'ri32-section';
  const heading = doc.createElement('div');
  heading.className = 'ri32-section-title';
  heading.textContent = title;
  section.appendChild(heading);
  body.appendChild(section);
  return section;
}

export function addRow(parent, label, value, doc = globalThis.document) {
  if (!parent || !doc) return null;
  const row = doc.createElement('div');
  row.className = 'ri32-setting-row';
  const left = doc.createElement('span');
  const right = doc.createElement('strong');
  left.textContent = label;
  right.textContent = value ?? '—';
  row.append(left, right);
  parent.appendChild(row);
  return row;
}

export function addAction(parent, label, action, {
  doc = globalThis.document,
  className = 'ri32-action',
  disabled = false
} = {}) {
  if (!parent || !doc) return null;
  const button = doc.createElement('button');
  button.type = 'button';
  button.className = className;
  button.disabled = !!disabled;
  button.textContent = label;
  if (typeof action === 'function') button.addEventListener('click', () => void action());
  parent.appendChild(button);
  return button;
}

export function renderEmpty(body, text, doc = globalThis.document) {
  if (!body || !doc) return null;
  const empty = doc.createElement('div');
  empty.className = 'ri32-empty';
  empty.textContent = text;
  body.appendChild(empty);
  return empty;
}

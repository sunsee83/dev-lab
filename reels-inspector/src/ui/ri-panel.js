import { EVENTS } from '../core/app.js';
import { injectStyles } from './styles.js';

const TABS = [
  ['summary', '요약'],
  ['content', '콘텐츠'],
  ['comments', '댓글'],
  ['analysis', '분석'],
  ['media', '미디어'],
  ['settings', '설정']
];

export function mountRiPanel({ app, settings, capabilities, version = '', doc = globalThis.document } = {}) {
  if (!doc?.documentElement || !settings) throw new Error('RI Panel requires document and Settings Store');
  injectStyles(doc);

  let open = false;
  let activeTab = 'summary';
  let settingsState = settings.getState();
  let destroyed = false;
  let button = doc.getElementById('ri32-tool');
  let panel = doc.getElementById('ri32-panel');

  if (!button) {
    button = doc.createElement('button');
    button.id = 'ri32-tool';
    button.type = 'button';
    button.setAttribute('aria-label', '리서치 도구');
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML = researchIcon();
    doc.documentElement.appendChild(button);
  }

  const unsubscribeSettings = settings.subscribe((next) => {
    settingsState = next;
    if (open && activeTab === 'settings') renderBody();
  });

  button.addEventListener('click', toggle);

  function toggle() {
    if (open) closePanel();
    else openPanel();
  }

  function openPanel() {
    if (destroyed || open) return;
    open = true;
    button.setAttribute('aria-expanded', 'true');
    ensurePanel();
    renderTabs();
    renderBody();
  }

  function closePanel() {
    if (!open) return;
    open = false;
    button.setAttribute('aria-expanded', 'false');
    if (panel) panel.remove();
    panel = null;
  }

  function ensurePanel() {
    panel = doc.getElementById('ri32-panel');
    if (panel) return;
    panel = doc.createElement('aside');
    panel.id = 'ri32-panel';
    panel.innerHTML = [
      '<div class="ri32-head">',
      '<strong>Instagram Research</strong>',
      `<span class="ri32-version">v${escapeHtml(version || app?.version || '')}</span>`,
      '<button type="button" class="ri32-close" aria-label="닫기">×</button>',
      '</div>',
      '<div class="ri32-tabs" role="tablist"></div>',
      '<div class="ri32-body"></div>'
    ].join('');
    panel.querySelector('.ri32-close').addEventListener('click', closePanel);
    doc.documentElement.appendChild(panel);
  }

  function renderTabs() {
    const tabs = panel?.querySelector('.ri32-tabs');
    if (!tabs) return;
    tabs.replaceChildren();
    for (const [key, label] of TABS) {
      const tab = doc.createElement('button');
      tab.type = 'button';
      tab.className = 'ri32-tab';
      tab.dataset.tab = key;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(activeTab === key));
      tab.textContent = label;
      tab.addEventListener('click', () => {
        if (activeTab === key) return;
        activeTab = key;
        renderTabs();
        renderBody();
      });
      tabs.appendChild(tab);
    }
  }

  function renderBody() {
    const body = panel?.querySelector('.ri32-body');
    if (!body) return;
    body.replaceChildren();

    if (activeTab === 'settings') {
      renderSettings(body);
      return;
    }

    const identity = app?.getCurrentIdentity?.();
    const empty = doc.createElement('div');
    empty.className = 'ri32-empty';
    empty.textContent = identity?.shortcode
      ? `${identity.shortcode} · ${tabLabel(activeTab)} 연결 준비 중`
      : `${tabLabel(activeTab)} · 현재 콘텐츠 연결 준비 중`;
    body.appendChild(empty);
  }

  function renderSettings(body) {
    const section = doc.createElement('section');
    section.className = 'ri32-section';
    section.innerHTML = '<div class="ri32-section-title">저장 방식</div><div class="ri32-options"></div>';
    const options = section.querySelector('.ri32-options');

    addModeOption(options, 'directory', '지정 폴더', !!capabilities?.directoryPicker);
    addModeOption(options, 'default', '기본 Downloads', true);
    addModeOption(options, 'prompt', '매번 선택', !!(capabilities?.saveFilePicker || capabilities?.directoryPicker));
    body.appendChild(section);

    const folder = doc.createElement('section');
    folder.className = 'ri32-section';
    folder.innerHTML = [
      '<div class="ri32-section-title">저장 폴더</div>',
      '<div class="ri32-setting-row"><span>현재 폴더</span><strong></strong></div>',
      '<div class="ri32-setting-row"><span>권한</span><strong></strong></div>',
      '<button type="button" class="ri32-action"></button>',
      '<div class="ri32-note">영상 · 썸네일 · 사진 · 캐러셀 전체에 같은 저장 정책을 적용합니다.</div>'
    ].join('');
    folder.querySelectorAll('strong')[0].textContent = settingsState.directoryName || '선택 안 됨';
    folder.querySelectorAll('strong')[1].textContent = permissionLabel(settingsState.directoryPermission);
    const action = folder.querySelector('.ri32-action');
    action.disabled = !capabilities?.directoryPicker;
    action.textContent = settingsState.directoryHandle ? '폴더 변경' : '폴더 선택';
    action.addEventListener('click', async () => {
      action.disabled = true;
      const result = await settings.selectDirectory();
      settingsState = settings.getState();
      renderBody();
      if (!result.ok && result.code !== 'cancelled') app?.emit?.(EVENTS.SETTINGS_CHANGED, { error: result });
    });
    body.appendChild(folder);
  }

  function addModeOption(parent, mode, label, enabled) {
    const option = doc.createElement('button');
    option.type = 'button';
    option.className = 'ri32-option';
    option.disabled = !enabled;
    option.setAttribute('aria-pressed', String(settingsState.downloadMode === mode));
    option.innerHTML = '<span class="ri32-dot"></span><span></span>';
    option.lastElementChild.textContent = label;
    option.addEventListener('click', () => {
      if (mode === 'directory' && !settingsState.directoryHandle) {
        void settings.selectDirectory();
        return;
      }
      settings.setDownloadMode(mode);
    });
    parent.appendChild(option);
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    unsubscribeSettings();
    button?.removeEventListener('click', toggle);
    panel?.remove();
    button?.remove();
    panel = null;
    button = null;
  }

  return {
    open: openPanel,
    close: closePanel,
    destroy,
    getState: () => ({ open, activeTab })
  };
}

function tabLabel(key) {
  return TABS.find(([tab]) => tab === key)?.[1] || key;
}

function permissionLabel(permission) {
  if (permission === 'granted') return '허용됨';
  if (permission === 'prompt') return '확인 필요';
  if (permission === 'denied') return '거부됨';
  return '사용 불가';
}

function researchIcon() {
  return '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19V13M9 19V9M14 19V5"/><circle cx="17.5" cy="14.5" r="3.5"/><path d="M20 17l2 2"/></svg>';
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

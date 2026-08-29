import { EVENTS } from '../core/app.js';
import { copyText } from '../core/clipboard.js';
import { injectStyles } from './styles.js';
import { showResult, showToast } from './toast.js';
import { renderRiSummary } from './ri-summary.js';

const TABS = [
  ['summary', '요약'],
  ['content', '콘텐츠'],
  ['comments', '댓글'],
  ['analysis', '분석'],
  ['media', '미디어'],
  ['settings', '설정']
];

export function mountRiPanel({ app, settings, capabilities, downloads, metrics, adapter, version = '', doc = globalThis.document, env = globalThis } = {}) {
  if (!doc?.documentElement || !settings) throw new Error('RI Panel requires document and Settings Store');
  injectStyles(doc);

  let open = false;
  let activeTab = 'summary';
  let settingsState = settings.getState();
  let destroyed = false;
  let button = doc.getElementById('ri32-tool');
  let panel = doc.getElementById('ri32-panel');

  doc.getElementById('ri3-panel')?.remove();

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
  const unsubscribeRoute = app?.on?.(EVENTS.ROUTE_CHANGED, scheduleContextRender) || (() => {});
  const unsubscribeIdentity = app?.on?.(EVENTS.IDENTITY_CHANGED, scheduleContextRender) || (() => {});
  const unsubscribeStore = app?.on?.(EVENTS.STORE_CHANGED, scheduleContextRender) || (() => {});

  button.addEventListener('click', toggle);

  function toggle() {
    if (open) closePanel();
    else openPanel();
  }

  function openPanel() {
    if (destroyed || open) return;
    open = true;
    syncCurrentIdentity();
    button.setAttribute('aria-expanded', 'true');
    ensurePanel();
    renderTabs();
    renderBody();
  }

  function closePanel() {
    if (!open) return;
    open = false;
    button.setAttribute('aria-expanded', 'false');
    panel?.remove();
    panel = null;
  }

  function scheduleContextRender() {
    if (!open || activeTab === 'settings') return;
    if (app?.scheduleRender) {
      app.scheduleRender('ri32-panel-context', () => {
        if (open && activeTab !== 'settings') renderBody();
      });
      return;
    }
    renderBody();
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
        syncCurrentIdentity();
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

    if (activeTab === 'settings') return renderSettings(body);
    const post = currentPost();
    if (activeTab === 'summary') return renderSummary(body, post);
    if (activeTab === 'media') return renderMedia(body, post);
    renderPlaceholder(body, post);
  }

  function renderSummary(body, post) {
    renderRiSummary({ body, post, metrics, doc });
  }

  function renderMedia(body, post) {
    if (!post?.shortcode) return renderEmpty(body, '현재 콘텐츠가 선택되지 않았습니다.');
    const section = createSection(body, '미디어');
    const type = String(post.mediaType || '').toUpperCase();
    let actionCount = 0;

    if ((type === 'REEL' || type === 'VIDEO') && post.videoUrl) {
      addAction(section, '영상 다운로드', () => save({ kind: 'video', shortcode: post.shortcode, url: post.videoUrl }));
      actionCount += 1;
    }
    if ((type === 'REEL' || type === 'VIDEO') && (post.coverUrl || post.thumbUrl)) {
      const url = post.coverUrl || post.thumbUrl;
      addAction(section, '썸네일 다운로드', () => save({ kind: 'cover', shortcode: post.shortcode, url }));
      actionCount += 1;
    }
    if (type === 'PHOTO' && (post.coverUrl || post.thumbUrl)) {
      const url = post.coverUrl || post.thumbUrl;
      addAction(section, '이미지 다운로드', () => save({ kind: 'photo', shortcode: post.shortcode, url }));
      actionCount += 1;
    }
    if (type === 'CAROUSEL' && post.carouselImages?.length) {
      addAction(section, `전체 이미지 다운로드 (${post.carouselImages.length})`, () => saveBatch(post));
      actionCount += 1;
    }
    addAction(section, '링크 복사', () => copyCurrentLink(post));
    if (!actionCount) {
      const note = doc.createElement('div');
      note.className = 'ri32-note';
      note.textContent = '원본 미디어 주소는 아직 확보되지 않았습니다.';
      section.appendChild(note);
    }
  }

  function renderPlaceholder(body, post) {
    const label = tabLabel(activeTab);
    renderEmpty(body, post?.shortcode ? `${post.shortcode} · ${label} 데이터 연결 준비 중` : `${label} · 현재 콘텐츠 연결 준비 중`);
  }

  function renderSettings(body) {
    const section = createSection(body, '저장 방식');
    const options = doc.createElement('div');
    options.className = 'ri32-options';
    addModeOption(options, 'directory', '지정 폴더', !!capabilities?.directoryPicker);
    addModeOption(options, 'default', '기본 Downloads', true);
    addModeOption(options, 'prompt', '매번 선택', !!(capabilities?.saveFilePicker || capabilities?.directoryPicker));
    section.appendChild(options);

    const folder = createSection(body, '저장 폴더');
    addRow(folder, '현재 폴더', settingsState.directoryName || '선택 안 됨');
    addRow(folder, '권한', permissionLabel(settingsState.directoryPermission));
    const action = doc.createElement('button');
    action.type = 'button';
    action.className = 'ri32-action';
    action.disabled = !capabilities?.directoryPicker;
    action.textContent = settingsState.directoryHandle ? '폴더 변경' : '폴더 선택';
    action.addEventListener('click', async () => {
      action.disabled = true;
      const result = await settings.selectDirectory();
      settingsState = settings.getState();
      renderBody();
      if (result.ok) showToast(doc, `저장 폴더: ${result.folderName || '선택 완료'}`);
      else if (result.code !== 'cancelled') showToast(doc, result.message || '폴더를 선택하지 못했습니다.');
    });
    folder.appendChild(action);
    const note = doc.createElement('div');
    note.className = 'ri32-note';
    note.textContent = '영상 · 썸네일 · 사진 · 캐러셀 전체에 같은 저장 정책을 적용합니다. 지정 폴더 저장 실패 시 기본 Downloads로 몰래 전환하지 않습니다.';
    folder.appendChild(note);
  }

  function addModeOption(parent, mode, label, enabled) {
    const option = doc.createElement('button');
    option.type = 'button';
    option.className = 'ri32-option';
    option.disabled = !enabled;
    option.setAttribute('aria-pressed', String(settingsState.downloadMode === mode));
    option.innerHTML = '<span class="ri32-dot"></span><span></span>';
    option.lastElementChild.textContent = label;
    option.addEventListener('click', async () => {
      if (mode === 'directory' && !settingsState.directoryHandle) {
        const result = await settings.selectDirectory();
        if (!result.ok && result.code !== 'cancelled') showToast(doc, result.message || '폴더를 선택하지 못했습니다.');
        return;
      }
      settings.setDownloadMode(mode);
      showToast(doc, `저장 방식: ${label}`);
    });
    parent.appendChild(option);
  }

  async function save(request) {
    if (!downloads) return;
    showToast(doc, '저장 준비 중…');
    showResult(doc, await downloads.download(request));
  }

  async function saveBatch(post) {
    const requests = post.carouselImages.map((url, index) => ({
      kind: 'carousel-slide', shortcode: post.shortcode, url, slideIndex: index + 1
    }));
    showToast(doc, `캐러셀 ${requests.length}장 저장 준비 중…`);
    showResult(doc, await downloads.downloadBatch(requests));
  }

  async function copyCurrentLink(post) {
    const text = post.canonicalUrl || `https://www.instagram.com/${post.mediaType === 'REEL' ? 'reel' : 'p'}/${post.shortcode}/`;
    const ok = await copyText(text, { env, doc, capabilities });
    showToast(doc, ok ? '링크를 복사했습니다.' : '링크 복사에 실패했습니다.');
  }

  function syncCurrentIdentity() {
    const identity = adapter?.getCurrentIdentity?.() || null;
    app?.setCurrentIdentity?.(identity);
    return identity;
  }

  function currentPost() {
    const identity = app?.getCurrentIdentity?.() || syncCurrentIdentity();
    return identity?.shortcode ? adapter?.getPost?.(identity.shortcode) || identity : null;
  }

  function createSection(body, title) {
    const section = doc.createElement('section');
    section.className = 'ri32-section';
    const heading = doc.createElement('div');
    heading.className = 'ri32-section-title';
    heading.textContent = title;
    section.appendChild(heading);
    body.appendChild(section);
    return section;
  }

  function addRow(parent, label, value) {
    const row = doc.createElement('div');
    row.className = 'ri32-setting-row';
    const left = doc.createElement('span');
    const right = doc.createElement('strong');
    left.textContent = label;
    right.textContent = value ?? '—';
    row.append(left, right);
    parent.appendChild(row);
  }

  function addAction(parent, label, action) {
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'ri32-action ri32-media-action';
    button.textContent = label;
    button.addEventListener('click', () => void action());
    parent.appendChild(button);
  }

  function renderEmpty(body, text) {
    const empty = doc.createElement('div');
    empty.className = 'ri32-empty';
    empty.textContent = text;
    body.appendChild(empty);
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    unsubscribeSettings();
    unsubscribeRoute();
    unsubscribeIdentity();
    unsubscribeStore();
    button?.removeEventListener('click', toggle);
    panel?.remove();
    button?.remove();
    panel = null;
    button = null;
  }

  return { open: openPanel, close: closePanel, destroy, getState: () => ({ open, activeTab }) };
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

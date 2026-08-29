import { EVENTS } from '../core/app.js';
import { copyText } from '../core/clipboard.js';
import { updateInstallUrl } from '../version.js';
import { addAction, addRow, createSection, renderEmpty } from './ri-primitives.js';
import { createResearchWorkspaceView } from './research-workspace.js';
import { createWorkspaceState } from './workspace-state.js';
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

export function mountRiPanel({
  app,
  settings,
  capabilities,
  downloads,
  metrics,
  adapter,
  workspace = createWorkspaceState(),
  layout,
  version = '',
  doc = globalThis.document,
  env = globalThis
} = {}) {
  if (!doc?.documentElement || !settings) throw new Error('RI Panel requires document and Settings Store');
  injectStyles(doc);

  let settingsState = settings.getState();
  let destroyed = false;
  let button = doc.getElementById('ri32-tool');
  let workspaceView = null;

  doc.getElementById('ri3-panel')?.remove();
  doc.getElementById('ri32-panel')?.remove();
  doc.getElementById('ri32-scrim')?.remove();

  if (!button) {
    button = doc.createElement('button');
    button.id = 'ri32-tool';
    button.type = 'button';
    button.setAttribute('aria-label', '리서치 도구');
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML = researchIcon();
    doc.documentElement.appendChild(button);
  }

  workspace.rebindContext(currentIdentity());
  layout?.schedule?.();

  const unsubscribeSettings = settings.subscribe((next) => {
    settingsState = next;
    const state = workspace.getState();
    if (state.open && (state.mode === 'global' || state.activeTab === 'settings')) renderBody();
  });
  const unsubscribeRoute = app?.on?.(EVENTS.ROUTE_CHANGED, scheduleContextRender) || (() => {});
  const unsubscribeIdentity = app?.on?.(EVENTS.IDENTITY_CHANGED, scheduleContextRender) || (() => {});
  const unsubscribeStore = app?.on?.(EVENTS.STORE_CHANGED, scheduleContextRender) || (() => {});
  const unsubscribeWorkspace = workspace.subscribe(({ current }) => {
    button?.setAttribute('aria-expanded', String(current.open));
    if (workspaceView && current.open) syncWorkspaceView();
  });

  button.addEventListener('click', toggle);

  function toggle() {
    if (isOpen()) closePanel();
    else openPanel();
  }

  function openPanel() {
    if (destroyed || isOpen()) return;
    workspace.rebindContext(currentIdentity());
    workspace.open();
    ensureWorkspaceView();
    syncWorkspaceView();
    renderBody();
    layout?.schedule?.();
  }

  function closePanel() {
    if (!isOpen()) return;
    workspace.close();
    workspaceView?.destroy();
    workspaceView = null;
    layout?.schedule?.();
  }

  function toggleDetent() {
    const state = workspace.getState();
    if (state.detent === 'expanded') workspace.collapse();
    else workspace.expand();
    layout?.schedule?.();
  }

  function selectTab(key) {
    if (workspace.getState().activeTab === key) return;
    workspace.setActiveTab(key);
    workspaceView?.resetScroll();
    syncWorkspaceView();
    renderBody();
  }

  function scheduleContextRender() {
    const previousEpoch = workspace.getState().contextEpoch;
    const next = workspace.rebindContext(currentIdentity());
    const contextChanged = next.contextEpoch !== previousEpoch;
    layout?.schedule?.();
    if (!isOpen()) return;

    const render = () => {
      if (!isOpen()) return;
      ensureWorkspaceView();
      syncWorkspaceView();
      if (contextChanged) workspaceView?.resetScroll();
      renderBody();
    };
    if (app?.scheduleRender) app.scheduleRender('ri32-panel-context', render);
    else render();
  }

  function ensureWorkspaceView() {
    if (workspaceView) return workspaceView;
    workspaceView = createResearchWorkspaceView({
      doc,
      version: version || app?.version || '',
      onClose: closePanel,
      onToggleDetent: toggleDetent,
      onSelectTab: selectTab,
      onUpdate: openUpdateShortcut
    });
    workspaceView.mount(TABS);
    return workspaceView;
  }

  function syncWorkspaceView() {
    workspaceView?.sync({
      state: workspace.getState(),
      context: currentPost(),
      tabs: TABS
    });
  }

  function renderBody() {
    const body = workspaceView?.getBody();
    if (!body) return;
    body.replaceChildren();

    const state = workspace.getState();
    if (state.mode === 'global') {
      renderGlobalHome(body);
      renderSettings(body);
      return;
    }

    const post = currentPost();
    if (state.activeTab === 'settings') return renderSettings(body);
    if (state.activeTab === 'summary') return renderRiSummary({ body, post, metrics, doc });
    if (state.activeTab === 'media') return renderMedia(body, post);
    renderPlaceholder(body, post, state.activeTab);
  }

  function renderGlobalHome(body) {
    const section = createSection(body, 'RI Home', doc);
    const note = doc.createElement('div');
    note.className = 'ri32-note ri32-home-note';
    note.textContent = '현재 화면에서 특정 콘텐츠가 선택되지 않았습니다. Reel·사진·영상·캐러셀 상세를 열면 콘텐츠 리서치 6탭이 연결됩니다.';
    section.appendChild(note);
  }

  function renderMedia(body, post) {
    if (!post?.shortcode) return renderEmpty(body, '현재 콘텐츠가 선택되지 않았습니다.', doc);
    const section = createSection(body, '미디어', doc);
    const type = String(post.mediaType || '').toUpperCase();
    let actionCount = 0;

    if ((type === 'REEL' || type === 'VIDEO') && post.videoUrl) {
      addMediaAction(section, '영상 다운로드', () => save({ kind: 'video', shortcode: post.shortcode, url: post.videoUrl }));
      actionCount += 1;
    }
    if ((type === 'REEL' || type === 'VIDEO') && (post.coverUrl || post.thumbUrl)) {
      const url = post.coverUrl || post.thumbUrl;
      addMediaAction(section, '썸네일 다운로드', () => save({ kind: 'cover', shortcode: post.shortcode, url }));
      actionCount += 1;
    }
    if (type === 'PHOTO' && (post.coverUrl || post.thumbUrl)) {
      const url = post.coverUrl || post.thumbUrl;
      addMediaAction(section, '이미지 다운로드', () => save({ kind: 'photo', shortcode: post.shortcode, url }));
      actionCount += 1;
    }
    if (type === 'CAROUSEL' && post.carouselImages?.length) {
      addMediaAction(section, `전체 이미지 다운로드 (${post.carouselImages.length})`, () => saveBatch(post));
      actionCount += 1;
    }
    addMediaAction(section, '링크 복사', () => copyCurrentLink(post));
    if (!actionCount) {
      const note = doc.createElement('div');
      note.className = 'ri32-note';
      note.textContent = '원본 미디어 주소는 아직 확보되지 않았습니다.';
      section.appendChild(note);
    }
  }

  function renderPlaceholder(body, post, tab) {
    const label = tabLabel(tab);
    renderEmpty(body, post?.shortcode ? `${label} 데이터 연결 준비 중` : `${label} · 현재 콘텐츠 연결 준비 중`, doc);
  }

  function renderSettings(body) {
    const section = createSection(body, '저장 방식', doc);
    const options = doc.createElement('div');
    options.className = 'ri32-options';
    addModeOption(options, 'directory', '지정 폴더', !!capabilities?.directoryPicker);
    addModeOption(options, 'default', '기본 Downloads', true);
    addModeOption(options, 'prompt', '매번 선택', !!(capabilities?.saveFilePicker || capabilities?.directoryPicker));
    section.appendChild(options);

    const folder = createSection(body, '저장 폴더', doc);
    addRow(folder, '현재 폴더', settingsState.directoryName || '선택 안 됨', doc);
    addRow(folder, '권한', permissionLabel(settingsState.directoryPermission), doc);
    const action = addAction(folder, settingsState.directoryHandle ? '폴더 변경' : '폴더 선택', async () => {
      action.disabled = true;
      const result = await settings.selectDirectory();
      settingsState = settings.getState();
      renderBody();
      if (result.ok) showToast(doc, `저장 폴더: ${result.folderName || '선택 완료'}`);
      else if (result.code !== 'cancelled') showToast(doc, result.message || '폴더를 선택하지 못했습니다.');
    }, { doc, className: 'ri32-action', disabled: !capabilities?.directoryPicker });
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

  function addMediaAction(parent, label, action) {
    return addAction(parent, label, action, { doc, className: 'ri32-action ri32-media-action' });
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

  function openUpdateShortcut() {
    const url = updateInstallUrl(Date.now());
    if (typeof env.open === 'function') {
      env.open(url, '_blank');
      return;
    }
    if (env.location) env.location.href = url;
  }

  function currentIdentity() {
    return app?.getCurrentIdentity?.() || adapter?.getCurrentIdentity?.() || null;
  }

  function currentPost() {
    const identity = currentIdentity();
    return identity?.shortcode ? adapter?.getPost?.(identity.shortcode) || identity : null;
  }

  function isOpen() {
    return workspace.getState().open;
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    unsubscribeSettings();
    unsubscribeRoute();
    unsubscribeIdentity();
    unsubscribeStore();
    unsubscribeWorkspace();
    button?.removeEventListener('click', toggle);
    workspaceView?.destroy();
    button?.remove();
    workspaceView = null;
    button = null;
  }

  return {
    open: openPanel,
    close: closePanel,
    destroy,
    getState: () => workspace.getState()
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

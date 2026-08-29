export function createResearchWorkspaceView({
  doc = globalThis.document,
  version = '',
  launcherId = 'ri32-tool',
  onClose,
  onToggleDetent,
  onSelectTab,
  onUpdate
} = {}) {
  if (!doc?.documentElement) throw new Error('Research Workspace requires document');

  let scrim = null;
  let panel = null;
  let title = null;
  let mediaType = null;
  let versionNode = null;
  let detentButton = null;
  let tabsNode = null;
  let body = null;
  let updateButton = null;
  let lastState = null;
  const tabButtons = new Map();

  function mount(tabs = []) {
    if (panel) return panel;

    scrim = doc.createElement('div');
    scrim.id = 'ri32-scrim';
    scrim.hidden = true;
    scrim.setAttribute('aria-hidden', 'true');

    panel = doc.createElement('aside');
    panel.id = 'ri32-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Instagram Research');
    panel.innerHTML = [
      '<div class="ri32-grabber" aria-hidden="true"><span></span></div>',
      '<div class="ri32-head">',
      '<div class="ri32-context"><strong></strong><span class="ri32-media-type"></span></div>',
      '<span class="ri32-version"></span>',
      '<button type="button" class="ri32-detent"></button>',
      '<button type="button" class="ri32-close" aria-label="닫기">×</button>',
      '</div>',
      '<div class="ri32-tabs" role="tablist"></div>',
      '<div class="ri32-activity-host"></div>',
      '<div class="ri32-body"></div>',
      '<div class="ri32-footer"><button type="button" class="ri32-update-shortcut">업데이트 바로가기</button></div>'
    ].join('');

    title = panel.querySelector('.ri32-context strong');
    mediaType = panel.querySelector('.ri32-media-type');
    versionNode = panel.querySelector('.ri32-version');
    detentButton = panel.querySelector('.ri32-detent');
    tabsNode = panel.querySelector('.ri32-tabs');
    body = panel.querySelector('.ri32-body');
    updateButton = panel.querySelector('.ri32-update-shortcut');

    panel.querySelector('.ri32-close')?.addEventListener('click', handleClose);
    detentButton?.addEventListener('click', handleToggleDetent);
    updateButton?.addEventListener('click', handleUpdate);
    scrim.addEventListener('pointerdown', handleScrimPointerDown, true);
    doc.addEventListener('pointerdown', handleDocumentPointerDown, true);

    createTabs(tabs);
    doc.documentElement.append(scrim, panel);
    return panel;
  }

  function sync({ state, context, tabs = [] } = {}) {
    mount(tabs);
    lastState = state || lastState;
    const current = lastState || {};
    const contentMode = current.mode === 'content';
    const expanded = current.detent === 'expanded';

    panel.dataset.detent = current.detent || 'compact';
    panel.dataset.mode = current.mode || 'global';
    panel.dataset.contextEpoch = String(current.contextEpoch ?? 0);
    panel.setAttribute('aria-modal', String(expanded));

    if (title) title.textContent = contentMode ? contentTitle(context) : 'RI Research';
    if (mediaType) {
      mediaType.textContent = contentMode ? String(context?.mediaType || '') : '';
      mediaType.hidden = !mediaType.textContent;
    }
    if (versionNode) versionNode.textContent = version ? `v${version}` : '';
    if (detentButton) {
      detentButton.textContent = expanded ? '축소' : '확장';
      detentButton.setAttribute('aria-label', expanded ? '리서치 시트 축소' : '리서치 시트 확장');
    }

    if (tabsNode) tabsNode.hidden = !contentMode;
    if (contentMode) {
      if (!tabButtons.size) createTabs(tabs);
      for (const [key, button] of tabButtons) {
        const selected = key === current.activeTab;
        button.setAttribute('aria-selected', String(selected));
        button.tabIndex = selected ? 0 : -1;
        if (selected) ensureTabVisible(button);
      }
    }

    if (scrim) scrim.hidden = !expanded;
  }

  function createTabs(tabs) {
    if (!tabsNode || tabButtons.size) return;
    for (const [key, label] of tabs) {
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'ri32-tab';
      button.dataset.tab = key;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', 'false');
      button.tabIndex = -1;
      button.textContent = label;
      button.addEventListener('click', () => onSelectTab?.(key));
      tabButtons.set(key, button);
      tabsNode.appendChild(button);
    }
  }

  function getBody() {
    return body;
  }

  function resetScroll() {
    if (body) body.scrollTop = 0;
  }

  function destroy() {
    doc.removeEventListener('pointerdown', handleDocumentPointerDown, true);
    panel?.querySelector('.ri32-close')?.removeEventListener('click', handleClose);
    detentButton?.removeEventListener('click', handleToggleDetent);
    updateButton?.removeEventListener('click', handleUpdate);
    scrim?.removeEventListener('pointerdown', handleScrimPointerDown, true);
    scrim?.remove();
    panel?.remove();
    scrim = null;
    panel = null;
    title = null;
    mediaType = null;
    versionNode = null;
    detentButton = null;
    tabsNode = null;
    body = null;
    updateButton = null;
    tabButtons.clear();
    lastState = null;
  }

  function handleClose() {
    onClose?.();
  }

  function handleToggleDetent() {
    onToggleDetent?.();
  }

  function handleUpdate() {
    onUpdate?.();
  }

  function handleScrimPointerDown(event) {
    if (event.target === scrim) onClose?.();
  }

  function handleDocumentPointerDown(event) {
    if (!lastState?.open || lastState.detent !== 'compact') return;
    const target = event.target;
    if (panel?.contains(target)) return;
    if (doc.getElementById(launcherId)?.contains(target)) return;
    onClose?.();
  }

  return { mount, sync, getBody, resetScroll, destroy };
}

function contentTitle(context) {
  const username = String(context?.username || '').replace(/^@/, '').trim();
  return username ? `RI · @${username}` : 'RI · 콘텐츠';
}

function ensureTabVisible(button) {
  if (typeof button?.scrollIntoView !== 'function') return;
  try {
    button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  } catch {
    // Older mobile engines may not support the options object.
  }
}

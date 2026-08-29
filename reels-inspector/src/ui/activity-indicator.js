import { showToast } from './toast.js';

const ACTIVITY_ID = 'ri32-activity';

export function mountActivityIndicator({
  activity,
  workspace,
  doc = globalThis.document,
  onAction
} = {}) {
  if (!activity || !doc?.documentElement) throw new Error('Activity Indicator requires activity store and document');

  let destroyed = false;
  let node = null;
  let labelNode = null;
  let messageNode = null;
  let progressNode = null;
  let progressBar = null;
  let actionButton = null;
  let dismissButton = null;

  const unsubscribeActivity = activity.subscribe((change) => {
    const item = change.activity || null;
    if (item?.state === 'success') {
      if (!item.silent) showToast(doc, item.message || `${item.label || '작업'}을 완료했습니다.`);
      activity.dismiss(item.id);
      return;
    }
    if (item?.state === 'error' && !item.persistent) {
      if (!item.silent) showToast(doc, item.message || `${item.label || '작업'}을 완료하지 못했습니다.`);
      activity.dismiss(item.id);
      return;
    }
    render();
  });
  const unsubscribeWorkspace = workspace?.subscribe?.(() => render()) || (() => {});

  render();

  function render() {
    if (destroyed) return;
    const item = activity.getVisible();
    if (!item) {
      node?.remove();
      return;
    }

    ensureNode();
    node.dataset.state = item.state;
    node.setAttribute('role', item.state === 'error' ? 'alert' : 'status');
    node.setAttribute('aria-live', item.state === 'error' ? 'assertive' : 'polite');
    labelNode.textContent = item.label || (item.kind === 'download' ? '저장' : '작업');
    messageNode.textContent = item.message || progressMessage(item);

    const progress = item.progress;
    progressNode.hidden = !progress || item.state !== 'running';
    if (progress && progressBar) {
      const ratio = Math.max(0, Math.min(1, progress.current / progress.total));
      progressBar.style.width = `${Math.round(ratio * 100)}%`;
      progressNode.setAttribute('aria-valuemin', '0');
      progressNode.setAttribute('aria-valuemax', String(progress.total));
      progressNode.setAttribute('aria-valuenow', String(progress.current));
    }

    const actionable = item.state === 'error' && !!item.action;
    actionButton.hidden = !actionable;
    actionButton.textContent = item.actionLabel || '확인';
    dismissButton.hidden = item.state !== 'error';

    const embeddedHost = workspace?.getState?.().open
      ? doc.querySelector('#ri32-panel .ri32-activity-host')
      : null;
    node.dataset.embedded = embeddedHost ? 'true' : 'false';
    (embeddedHost || doc.documentElement).appendChild(node);
  }

  function ensureNode() {
    if (node) return;
    node = doc.createElement('div');
    node.id = ACTIVITY_ID;
    node.innerHTML = [
      '<div class="ri32-activity-copy">',
      '<strong></strong>',
      '<span class="ri32-activity-message"></span>',
      '<div class="ri32-activity-progress" role="progressbar"><span></span></div>',
      '</div>',
      '<button type="button" class="ri32-activity-action" hidden></button>',
      '<button type="button" class="ri32-activity-dismiss" aria-label="알림 닫기" hidden>×</button>'
    ].join('');
    labelNode = node.querySelector('.ri32-activity-copy strong');
    messageNode = node.querySelector('.ri32-activity-message');
    progressNode = node.querySelector('.ri32-activity-progress');
    progressBar = progressNode?.firstElementChild || null;
    actionButton = node.querySelector('.ri32-activity-action');
    dismissButton = node.querySelector('.ri32-activity-dismiss');
    actionButton?.addEventListener('click', handleAction);
    dismissButton?.addEventListener('click', handleDismiss);
  }

  function handleAction() {
    const item = activity.getVisible();
    if (!item?.action) return;
    onAction?.(item);
    render();
  }

  function handleDismiss() {
    const item = activity.getVisible();
    if (item?.state === 'error') activity.dismiss(item.id);
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    unsubscribeActivity();
    unsubscribeWorkspace();
    actionButton?.removeEventListener('click', handleAction);
    dismissButton?.removeEventListener('click', handleDismiss);
    node?.remove();
    node = null;
  }

  return { render, destroy };
}

function progressMessage(item) {
  const progress = item?.progress;
  if (!progress) return item?.state === 'running' ? '진행 중…' : '';
  return `${progress.current}/${progress.total} 진행 중`;
}

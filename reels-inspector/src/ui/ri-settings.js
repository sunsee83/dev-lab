import { addAction, addRow, createSection } from './ri-primitives.js';
import { showToast } from './toast.js';

export function renderRiSettings({
  body,
  settings,
  settingsState,
  capabilities,
  doc = globalThis.document
} = {}) {
  if (!body || !settings || !doc) return;
  const state = settingsState || settings.getState();

  const section = createSection(body, '저장 방식', doc);
  const options = doc.createElement('div');
  options.className = 'ri32-options';
  addModeOption(options, 'directory', '지정 폴더', !!capabilities?.directoryPicker);
  addModeOption(options, 'default', '기본 Downloads', true);
  addModeOption(options, 'prompt', '매번 선택', !!(capabilities?.saveFilePicker || capabilities?.directoryPicker));
  section.appendChild(options);

  const folder = createSection(body, '저장 폴더', doc);
  addRow(folder, '현재 폴더', state.directoryName || '선택 안 됨', doc);
  addRow(folder, '권한', permissionLabel(state.directoryPermission), doc);
  const action = addAction(folder, state.directoryHandle ? '폴더 변경' : '폴더 선택', async () => {
    action.disabled = true;
    const result = await settings.selectDirectory();
    if (result.ok) showToast(doc, `저장 폴더: ${result.folderName || '선택 완료'}`);
    else if (result.code !== 'cancelled') showToast(doc, result.message || '폴더를 선택하지 못했습니다.');
  }, { doc, className: 'ri32-action', disabled: !capabilities?.directoryPicker });

  const note = doc.createElement('div');
  note.className = 'ri32-note';
  note.textContent = '영상 · 썸네일 · 사진 · 캐러셀 전체에 같은 저장 정책을 적용합니다. 지정 폴더 저장 실패 시 기본 Downloads로 몰래 전환하지 않습니다.';
  folder.appendChild(note);

  function addModeOption(parent, mode, label, enabled) {
    const option = doc.createElement('button');
    option.type = 'button';
    option.className = 'ri32-option';
    option.disabled = !enabled;
    option.setAttribute('aria-pressed', String(state.downloadMode === mode));
    option.innerHTML = '<span class="ri32-dot"></span><span></span>';
    option.lastElementChild.textContent = label;
    option.addEventListener('click', async () => {
      if (mode === 'directory' && !state.directoryHandle) {
        const result = await settings.selectDirectory();
        if (!result.ok && result.code !== 'cancelled') showToast(doc, result.message || '폴더를 선택하지 못했습니다.');
        return;
      }
      settings.setDownloadMode(mode);
      showToast(doc, `저장 방식: ${label}`);
    });
    parent.appendChild(option);
  }
}

function permissionLabel(permission) {
  if (permission === 'granted') return '허용됨';
  if (permission === 'prompt') return '확인 필요';
  if (permission === 'denied') return '거부됨';
  return '사용 불가';
}

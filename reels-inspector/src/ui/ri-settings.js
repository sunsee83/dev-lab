import { addAction, addRow, createSection } from './ri-primitives.js';
import { showToast } from './toast.js';

const SAVE_GROUPS = [
  ['video', '영상'],
  ['image', '사진 · 표지'],
  ['carousel', '슬라이드']
];

export function renderRiSettings({
  body,
  settings,
  settingsState,
  capabilities,
  doc = globalThis.document
} = {}) {
  if (!body || !settings || !doc) return;
  const state = settingsState || settings.getState();

  for (const [profileKey, label] of SAVE_GROUPS) {
    renderSaveGroup(profileKey, label, state.downloadPolicies?.[profileKey]);
  }

  const note = doc.createElement('div');
  note.className = 'ri32-note';
  note.textContent = '미디어 유형별로 저장 정책을 독립 적용합니다. 지정 폴더 저장 실패 시 기본 Downloads로 몰래 전환하지 않습니다.';
  body.appendChild(note);

  function renderSaveGroup(profileKey, label, policy = {}) {
    const section = createSection(body, `${label} 저장`, doc);
    const options = doc.createElement('div');
    options.className = 'ri32-options';
    addModeOption(options, profileKey, policy, 'directory', '지정 폴더', !!capabilities?.directoryPicker);
    addModeOption(options, profileKey, policy, 'default', '기본 Downloads', true);
    addModeOption(options, profileKey, policy, 'prompt', '매번 선택', !!(capabilities?.saveFilePicker || capabilities?.directoryPicker));
    section.appendChild(options);

    addRow(section, '현재 폴더', policy.directoryName || '선택 안 됨', doc);
    addRow(section, '권한', permissionLabel(policy.directoryPermission), doc);
    const action = addAction(section, policy.directoryHandle ? '폴더 변경' : '폴더 선택', async () => {
      action.disabled = true;
      try {
        const result = await settings.selectDirectory(profileKey);
        if (result.ok) showToast(doc, `${label} 저장 폴더: ${result.folderName || '선택 완료'}`);
        else if (result.code !== 'cancelled') showToast(doc, result.message || '폴더를 선택하지 못했습니다.');
      } finally {
        if (action.isConnected) action.disabled = !capabilities?.directoryPicker;
      }
    }, { doc, className: 'ri32-action', disabled: !capabilities?.directoryPicker });
  }

  function addModeOption(parent, profileKey, policy, mode, label, enabled) {
    const option = doc.createElement('button');
    option.type = 'button';
    option.className = 'ri32-option';
    option.disabled = !enabled;
    option.setAttribute('aria-pressed', String(policy.downloadMode === mode));
    option.innerHTML = '<span class="ri32-dot"></span><span></span>';
    option.lastElementChild.textContent = label;
    option.addEventListener('click', async () => {
      if (mode === 'directory' && !policy.directoryHandle) {
        const result = await settings.selectDirectory(profileKey);
        if (!result.ok && result.code !== 'cancelled') showToast(doc, result.message || '폴더를 선택하지 못했습니다.');
        return;
      }
      settings.setDownloadMode(profileKey, mode);
      showToast(doc, `${SAVE_GROUPS.find(([key]) => key === profileKey)?.[1] || '미디어'} 저장 방식: ${label}`);
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

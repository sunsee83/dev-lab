# YouTube 수집도구 통합 프로토콜

하나의 YouTube 북마클릿 코어와 공개 UI 사이의 통신 기준입니다.

실제 YouTube 전용 추출/스트림 판별 코드는 공개 저장소에 두지 않습니다.

## 공통 규칙

- 실행마다 임의 `token`을 생성합니다.
- 모든 메시지는 같은 `token`을 포함합니다.
- 수신 측은 token이 다르면 무시합니다.
- UI에는 실제 스트림 URL을 초기화 정보로 보내지 않습니다.
- API 키, 비밀번호, OAuth 토큰, 세션 토큰, 인증 쿠키는 메시지로 전달하지 않습니다.

---

# 1. UI → 코어

## 준비 완료

```js
{
  type: 'YT_TOOL_READY',
  token
}
```

## 통합 저장

```js
{
  type: 'YT_TOOL_ACTION',
  token,
  action: 'save',
  types: ['video', 'audio', 'data'],
  videoQuality: 'video-option-id',
  audioQuality: 'audio-option-id',
  target: 'local' | 'drive',
  data: {
    fields: [],
    format: 'raw' | 'txt' | 'json',
    comments: {
      count: 100,
      sort: 'top' | 'newest'
    }
  },
  drive: {
    file: '',
    sheet: '',
    category: ''
  },
  management: {
    tags: '',
    priority: 0,
    status: '미분석',
    memo: ''
  },
  duplicateMode: 'update' | 'new' | ''
}
```

`types`는 복수 선택 가능합니다.

선택하지 않은 기능의 세부 필드는 무시합니다.

## 최초 설정 시작

```js
{
  type: 'YT_TOOL_ACTION',
  token,
  action: 'setup-start'
}
```

## 설정 완료

```js
{
  type: 'YT_TOOL_ACTION',
  token,
  action: 'setup-complete'
}
```

## 새 Drive 항목

```js
{
  type: 'YT_TOOL_ACTION',
  token,
  action: 'create-drive-item',
  kind: 'file' | 'sheet' | 'category',
  name: '사용자 입력값'
}
```

## Drive 항목 열기

```js
{
  type: 'YT_TOOL_ACTION',
  token,
  action: 'open-drive-item',
  kind: 'file' | 'sheet',
  id: '현재 선택 ID'
}
```

## 기존 기록 열기

```js
{
  type: 'YT_TOOL_ACTION',
  token,
  action: 'open-existing'
}
```

## 닫기

```js
{
  type: 'YT_TOOL_ACTION',
  token,
  action: 'close'
}
```

---

# 2. 코어 → UI

## 초기화

```js
{
  type: 'YT_TOOL_INIT',
  token,
  setup: {
    configured: false,
    path: 'Drive / YouTube 수집/'
  },
  video: {
    thumbnail: '',
    title: '',
    channel: '',
    publishedAt: '',
    duration: '',
    views: ''
  },
  media: {
    video: [
      { id: 'v1', label: '360p' }
    ],
    audio: [
      { id: 'a1', label: '최고 음질' }
    ]
  },
  drive: {
    files: [],
    sheets: [],
    categories: []
  },
  duplicate: null
}
```

`media.video[].id`, `media.audio[].id`는 현재 실행 중 코어 내부 후보를 가리키는 임시 ID입니다.

UI는 이 ID를 그대로 저장 요청에 돌려줄 뿐 실제 스트림 주소를 알 필요가 없습니다.

## 상태

```js
{
  type: 'YT_TOOL_STATUS',
  token,
  state: 'ready' | 'working' | 'success' | 'error',
  message: '표시할 문구'
}
```

## Drive 선택지 갱신

```js
{
  type: 'YT_TOOL_OPTIONS',
  token,
  drive: {
    files: [],
    sheets: [],
    categories: []
  }
}
```

## 설정 상태 갱신

```js
{
  type: 'YT_TOOL_SETUP',
  token,
  configured: true,
  path: 'Drive / YouTube 수집/'
}
```

## 중복 발견

```js
{
  type: 'YT_TOOL_DUPLICATE',
  token,
  duplicate: {
    found: true,
    recordId: '',
    label: '이미 수집된 영상입니다.'
  }
}
```

중복이 없으면 `duplicate: null` 또는 `found: false`로 처리합니다.

## Drive 미디어 일시 전달

영상/음성을 Google Drive 저장 방식에서 실제 원격 URL이 필요한 경우에만 사용합니다.

```js
{
  type: 'YT_TOOL_DRIVE_MEDIA',
  token,
  kind: 'video' | 'audio',
  src: '현재 저장 동작용 임시 URL',
  filename: '파일명'
}
```

UI는 이 값을 저장하지 않고 즉시 저장 동작에만 사용합니다.

---

# 3. 실패 분리

영상/음성/데이터는 가능한 한 독립적으로 처리합니다.

예:

- 영상 성공 + 데이터 실패 → 영상 결과는 유지
- 음성 후보 없음 → 음성 선택지만 비활성/미표시
- Drive 실패 → 로컬 저장 기능은 영향을 받지 않음

---

# 4. 기준 문서

- 화면 구조: `UI_SPEC.md`
- 북마클릿 코어 역할: `CORE_SPEC.md`
- 통신 형식: 이 문서

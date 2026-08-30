# YouTube 수집도구 통합 프로토콜

하나의 YouTube 북마클릿 코어와 통합 UI 사이의 통신 기준입니다.

실제 YouTube 전용 식별/추출/스트림 판별 코드는 공개 저장소에 두지 않습니다.

## 공통 규칙

- 실행마다 임의 `token`을 생성한다.
- 모든 메시지는 같은 `token`을 포함한다.
- token이 다르면 메시지를 무시한다.
- UI 초기화 시 실제 미디어 URL은 전달하지 않는다.
- 영상/음성 선택지는 현재 실행에서만 유효한 임시 ID를 사용한다.
- API 키, 비밀번호, OAuth 토큰, 세션 토큰, 인증 쿠키를 메시지에 넣지 않는다.

---

# 1. UI → 코어

## 준비 완료

```js
{
  type: 'YT_TOOL_READY',
  token
}
```

## 로컬 저장

```js
{
  type: 'YT_TOOL_ACTION',
  token,
  action: 'save-local',
  types: ['video', 'audio', 'data'],
  target: 'local',
  video: {
    id: 'video-option-id'
  },
  audio: {
    id: 'audio-option-id'
  },
  data: {
    fields: [],
    format: 'original' | 'txt' | 'json',
    comments: {
      count: 100,
      sort: 'top' | 'newest'
    }
  }
}
```

`types`는 복수 선택 가능하다. 선택하지 않은 항목의 세부 필드는 무시한다.

영상/음성의 `id`는 실제 URL이 아니라 코어 내부 후보표를 가리키는 임시 ID다.

### 로컬 영상 저장

코어는 `video.id`를 실제 영상 후보로 해석한 뒤 다음 순서로 처리한다.

1. 저장 파일명 결정
2. Android 브라우저 파일 저장 선택창 표시
3. 선택된 영상 URL을 `fetch`
4. 응답 스트림을 선택한 파일에 기록
5. 완료 상태 반환

### 로컬 음성 저장

영상과 동일하되 `audio.id`를 음성 후보로 해석하고 음성용 확장자를 사용한다.

현재 검증된 저장 방식은 `showSaveFilePicker()` → 미디어 `fetch` → `response.body.pipeTo(await handle.createWritable())` 흐름이다.

## Drive 저장

```js
{
  type: 'YT_TOOL_ACTION',
  token,
  action: 'save-drive',
  types: ['video', 'audio', 'data'],
  target: 'drive',
  video: { id: 'video-option-id' },
  audio: { id: 'audio-option-id' },
  data: { fields: [], format: 'original' },
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
  duplicateMode: 'update' | 'new'
}
```

Drive 동작은 후속 단계에서 연결한다.

## 최초 설정

```js
{ type:'YT_TOOL_ACTION', token, action:'google-continue' }
{ type:'YT_TOOL_ACTION', token, action:'setup-start' }
{ type:'YT_TOOL_ACTION', token, action:'setup-complete' }
```

## Drive 항목 동작

```js
{
  type: 'YT_TOOL_ACTION',
  token,
  action: 'new-file' | 'new-sheet' | 'new-category' | 'open-file' | 'open-sheet',
  drive: {
    file: '',
    sheet: '',
    category: ''
  }
}
```

## 기존 기록 열기 / 닫기

```js
{ type:'YT_TOOL_ACTION', token, action:'open-existing' }
{ type:'YT_TOOL_ACTION', token, action:'close' }
```

---

# 2. 코어 → UI

## 초기화

```js
{
  type: 'YT_TOOL_INIT',
  token,
  configured: true,
  storagePath: 'Drive / YouTube 수집/',
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
      { id:'v1', label:'360p' }
    ],
    audio: [
      { id:'a1', label:'최고 음질' }
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

`media.video[].id`, `media.audio[].id`는 현재 실행 중에만 유효하다.

## 상태

```js
{
  type: 'YT_TOOL_STATUS',
  token,
  state: 'ready' | 'working' | 'success' | 'error',
  message: '표시할 문구',
  item: 'video' | 'audio' | 'data' | null,
  setup: false
}
```

복수 선택 저장에서는 항목별 상태를 순서대로 보낼 수 있다.

## Drive 선택지 갱신

```js
{
  type: 'YT_TOOL_OPTIONS',
  token,
  files: [],
  sheets: [],
  categories: []
}
```

## 설정 상태

```js
{
  type: 'YT_TOOL_SETUP',
  token,
  configured: true,
  storagePath: 'Drive / YouTube 수집/',
  message: '설정 완료'
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

---

# 3. 로컬 저장 오류 분리

영상/음성/데이터를 독립적으로 처리한다.

예:

- 영상 저장 성공 + 음성 저장 실패 → 영상 성공 결과 유지
- 음성 후보 없음 → 영상 로컬 저장은 계속 가능
- 데이터 기능 미구현/실패 → 영상·음성 로컬 저장에는 영향 없음

사용자가 파일 선택창을 취소한 경우에는 다른 오류와 구분하여 `취소됨` 상태로 처리한다.

---

# 4. 기준 문서

- 화면 구조: `UI_SPEC.md`
- 북마클릿 코어 역할: `CORE_SPEC.md`
- 로컬 저장 연결: `LOCAL_SAVE_FLOW.md`
- 통신 형식: 이 문서

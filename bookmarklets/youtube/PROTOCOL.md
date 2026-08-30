# YouTube Bookmarklet UI Protocol

공개 UI(`bridge.html`)와 YouTube 페이지 안의 짧은 북마클릿 코어 사이에서 사용하는 메시지 규격입니다.

모든 메시지는 임의 생성된 `token`을 포함해야 합니다. UI와 코어는 token이 일치하지 않는 메시지를 무시합니다.

## UI → 코어

### 준비 완료

```js
{
  type: 'YT_BM_READY',
  token
}
```

### 미디어 저장

```js
{
  type: 'YT_BM_ACTION',
  token,
  action: 'save-media',
  kind: 'video' | 'audio',
  quality: '선택값',
  target: 'local' | 'drive'
}
```

### 데이터 저장

```js
{
  type: 'YT_BM_ACTION',
  token,
  action: 'save-data',
  fields: ['thumbnail', 'title', 'url', 'channel', 'publishedAt', 'duration', 'views', 'description', 'tags', 'transcript', 'comments'],
  format: 'text' | 'json',
  target: 'local' | 'drive',
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
  }
}
```

### 새 항목 생성 요청

```js
{
  type: 'YT_BM_ACTION',
  token,
  action: 'create-drive-item',
  kind: 'file' | 'sheet' | 'category',
  name: '사용자 입력값'
}
```

### 닫기

```js
{
  type: 'YT_BM_ACTION',
  token,
  action: 'close'
}
```

## 코어 → UI

### 초기화

```js
{
  type: 'YT_BM_INIT',
  token,
  mode: 'media' | 'collect',
  video: {
    title: '',
    channel: '',
    thumbnail: '',
    publishedAt: '',
    duration: '',
    views: ''
  },
  media: {
    video: [{ label: '360p', value: '360' }],
    audio: [{ label: '최고 음질', value: 'best' }]
  },
  drive: {
    files: [],
    sheets: [],
    categories: []
  },
  duplicate: null
}
```

### 상태

```js
{
  type: 'YT_BM_STATUS',
  token,
  state: 'working' | 'success' | 'error',
  message: '표시할 문구'
}
```

### Drive 목록 갱신

```js
{
  type: 'YT_BM_DRIVE_OPTIONS',
  token,
  files: [],
  sheets: [],
  categories: []
}
```

## 보안 규칙

- `token`은 실행 때마다 새로 생성합니다.
- `postMessage` 수신 시 token을 검증합니다.
- API 키, OAuth 토큰, 세션 쿠키는 메시지에 넣지 않습니다.
- YouTube 전용 추출 결과 중 실제 미디어 URL은 필요한 동작 시에만 코어가 사용하고 UI에 영구 저장하지 않습니다.
- 공개 UI는 사용자 계정 비밀값을 저장하지 않습니다.

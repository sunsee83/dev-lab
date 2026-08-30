# YouTube Bookmarklet UI Protocol

공개 UI와 YouTube 페이지 안의 짧은 북마클릿 코어 사이에서 사용하는 메시지 규격입니다.

모든 메시지는 실행 때 생성한 임의 `token`을 포함합니다. UI와 코어는 token이 일치하지 않는 메시지를 무시합니다.

## 1. YT 미디어

공개 UI 파일: `media.html`

### UI → 코어: 준비 완료

```js
{
  type: 'YT_MEDIA_READY',
  token
}
```

### 코어 → UI: 초기화

```js
{
  type: 'YT_MEDIA_INIT',
  token,
  video: {
    title: '',
    channel: '',
    thumbnail: '',
    duration: ''
  },
  media: {
    video: [
      { label: '360p', value: '360' }
    ],
    audio: [
      { label: '최고 음질', value: 'best' }
    ]
  }
}
```

`value`는 공개 UI가 해석하지 않는 선택 식별자입니다. 실제 스트림 URL이나 YouTube 전용 판별 정보는 넣지 않습니다.

### UI → 코어: 로컬 저장

```js
{
  type: 'YT_MEDIA_ACTION',
  token,
  action: 'save-local',
  kind: 'video' | 'audio',
  quality: '선택 식별자'
}
```

실제 파일 fetch와 File System Access API 호출은 YouTube 페이지 안의 코어가 담당합니다.

### UI → 코어: Drive용 주소 요청

```js
{
  type: 'YT_MEDIA_ACTION',
  token,
  action: 'request-drive-source',
  kind: 'video' | 'audio',
  quality: '선택 식별자'
}
```

### 코어 → UI: Drive용 일회성 주소

```js
{
  type: 'YT_MEDIA_DRIVE_SOURCE',
  token,
  src: '현재 실행에서 얻은 임시 미디어 URL',
  filename: '저장 파일명.mp4'
}
```

`media.html`은 이 값을 저장하지 않고 즉시 Google 공식 `Save to Drive` 위젯을 렌더링하는 데만 사용합니다.

Drive 위젯은 OAuth Client ID나 API Key를 북마클릿에 저장하지 않는 1차 방식입니다. 파일은 사용자의 Google 브라우저 세션으로 `My Drive`에 저장됩니다. 폴더 지정은 이 방식의 범위에 포함하지 않습니다.

### 상태

```js
{
  type: 'YT_MEDIA_STATUS',
  token,
  state: 'working' | 'success' | 'error',
  message: '표시할 문구'
}
```

### 닫기

```js
{
  type: 'YT_MEDIA_ACTION',
  token,
  action: 'close'
}
```

---

## 2. YT 수집

공개 수집 UI는 미디어 검증 후 별도 파일로 분리합니다.

### UI → 코어: 데이터 저장

```js
{
  type: 'YT_COLLECT_ACTION',
  token,
  action: 'save-data',
  fields: ['thumbnail', 'title', 'url', 'channel', 'publishedAt', 'duration', 'views', 'description', 'tags', 'transcript', 'comments'],
  format: 'text' | 'json',
  target: 'clipboard' | 'local' | 'drive',
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
  type: 'YT_COLLECT_ACTION',
  token,
  action: 'create-drive-item',
  kind: 'file' | 'sheet' | 'category',
  name: '사용자 입력값'
}
```

## 공통 보안 규칙

- `token`은 실행 때마다 새로 생성합니다.
- 코어는 `event.source`와 token을 함께 확인합니다.
- API 키, OAuth 토큰, 세션 쿠키, 비밀번호를 메시지에 넣지 않습니다.
- YouTube 전용 스트림 판별 로직은 공개 UI로 보내지 않습니다.
- 미디어 URL은 Drive 버튼을 실제로 준비할 때만 일회성으로 전달하고 저장하지 않습니다.
- 공개 UI는 localStorage/IndexedDB에 인증정보나 미디어 URL을 저장하지 않습니다.

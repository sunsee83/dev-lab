# YouTube 데이터 추출 규격

이 문서는 `ui.html`이 `데이터` 선택 시 만드는 현재 데이터 결과 형식과 추출 원칙을 정의합니다.

실제 YouTube 전용 endpoint/continuation/caption 해석 코드는 `ui.html`의 실행 코어에 둡니다. 모바일 `bookmarklet.js`에는 추출 로직을 넣지 않습니다.

## 1. 선택 가능한 필드

### 기본정보

- `thumbnail` : 썸네일 URL
- `title` : 제목
- `url` : 영상 URL
- `channel` : 채널명
- `publishedAt` : 업로드일
- `duration` : 영상 길이
- `views` : 조회수

### 내용

- `description` : 설명
- `tags` : 태그 배열
- `transcript` : 읽기용 대본
- `comments` : 댓글 배열

### 고급

- `likes` : 좋아요 수
- `rawCaptions` : 선택 자막 트랙의 원본 데이터
- `videoId` : 영상 ID
- `channelId` : 채널 ID
- `rawMetadata` : 원본 메타데이터 스냅샷

## 2. 추출 원칙

1. UI가 요청하지 않은 추가 필드는 조사하지 않습니다.
2. `youtubei/player`에서 이미 확보한 기본정보는 재요청하지 않습니다.
3. 대본/자막은 선택된 경우에만 caption track을 추가 요청합니다.
4. 대본과 자막 원본을 함께 선택하면 같은 caption 응답을 재사용합니다.
5. 댓글은 선택된 경우에만 현재 YouTube `youtubei/v1/next`의 comment continuation을 사용합니다.
6. 댓글 정렬은 `top` 또는 `newest`, 수량은 최대 300개입니다.
7. 좋아요는 현재 영상 페이지의 버튼/초기 데이터에서 확인합니다.
8. 특정 필드가 실패해도 확보된 다른 필드는 유지합니다.
9. 결과는 JSON 직렬화 가능한 값만 사용합니다.
10. 인증정보, 쿠키, 세션값, 미디어 스트림 URL은 데이터 결과에 포함하지 않습니다.

## 3. 대본

선택할 자막 트랙 우선순위는 현재 사용 가능한 트랙 중 한국어와 수동 자막을 우선하는 방식입니다. 사용 가능한 트랙이 없으면 해당 필드만 실패 처리합니다.

```js
{
  language:'ko',
  languageName:'한국어',
  text:'전체 대본 텍스트',
  segments:[
    {startMs:0,durationMs:1200,text:'문장'}
  ]
}
```

`json3` 자막 응답을 우선 사용하고, 실패하면 기본 timedtext 응답을 다시 해석합니다.

## 4. 자막 원본

`rawCaptions`는 선택된 자막 트랙의 언어/종류 정보와 원본 이벤트 또는 구간 데이터를 JSON 직렬화 가능한 형태로 보존합니다.

```js
{
  track:{
    language:'ko',
    languageName:'한국어',
    kind:'',
    isTranslatable:true
  },
  events:[]
}
```

자막 `baseUrl` 자체는 결과에 저장하지 않습니다.

## 5. 댓글

```js
[
  {
    author:'작성자',
    text:'댓글 내용',
    likes:0,
    publishedAt:'표시된 작성 시점',
    replyCount:0
  }
]
```

처리 순서:

```text
현재 ytInitialData에서 댓글 continuation 검색
→ 없으면 youtubei/v1/next(videoId)로 진입점 조회
→ 댓글 continuation 호출
→ top/newest 정렬 continuation 선택
→ 후속 continuation을 최대 요청 수까지 반복
→ 중복 댓글 제거
```

- 수량: 50 / 100 / 300
- 정렬: 인기순 / 최신순
- 요청 수보다 적게 확보되면 확보된 결과만 사용
- 댓글 비활성화/구조 변경/요청 실패 시 `errors.comments`만 기록

## 6. 좋아요

현재 영상의 상단 좋아요 버튼의 `aria-label`, `title`, 표시문구를 우선 확인합니다. 필요하면 `ytInitialData`의 좋아요 관련 표시 문자열을 보조로 확인합니다.

`천`, `만`, `억`, `K`, `M`, `B` 축약 표시는 가능한 경우 정수 카운트로 변환합니다.

## 7. 원본 메타데이터

`rawMetadata`는 `videoDetails`와 `playerMicroformatRenderer`의 진단/보존용 스냅샷입니다.

제외 대상:

```text
streamingData의 미디어 URL
playback 추적 URL
caption baseUrl
인증/세션/쿠키 관련 값
OAuth access/refresh token
```

## 8. 코어 결과

```js
{
  videoId:'현재 영상 ID',
  requested:['title','transcript','comments'],
  result:{
    title:'영상 제목',
    transcript:{language:'ko',languageName:'한국어',text:'...',segments:[]},
    comments:[]
  },
  errors:{
    comments:'댓글 목록 진입점을 찾지 못했습니다.'
  },
  complete:true
}
```

`errors`는 필드별 부분 실패만 기록합니다. 성공한 필드는 `result`에 유지합니다.

로컬 출력은 `DATA_OUTPUT_FLOW.md`, Sheets 저장은 `SHEET_RULES.md`를 따릅니다.

# YouTube 데이터 추출 코어 연결

이 문서는 통합 북마클릿의 **데이터 추출 단계**에서 코어가 만들어야 하는 결과 형식을 정리합니다.

실제 YouTube 전용 식별자, 내부 요청 방식, selector, endpoint, continuation 해석 코드는 공개 저장소에 두지 않습니다. 이 문서는 역할과 입출력만 고정합니다.

## 목적

사용자가 `데이터`를 선택했을 때 **선택한 필드만** 조사하고, 가능한 결과부터 부분 성공으로 반환합니다.

영상/음성 저장과 데이터 추출은 서로 독립적으로 처리합니다.

## 선택 가능한 필드

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
- `rawCaptions` : 자막 원본 데이터
- `videoId` : 영상 ID
- `channelId` : 채널 ID
- `rawMetadata` : 원본 메타데이터 스냅샷

## 추출 원칙

1. UI가 요청하지 않은 필드는 조사하지 않는다.
2. 이미 현재 실행에서 확보한 기본정보는 재요청하지 않는다.
3. 대본/자막은 선택된 경우에만 추가 조사한다.
4. 댓글은 선택된 경우에만 요청하고 지정 수량 또는 더 이상 결과가 없을 때까지 수집한다.
5. 댓글 정렬은 `top` 또는 `newest` 요청값을 따른다.
6. 특정 필드가 실패해도 확보된 다른 필드는 유지한다.
7. 결과는 JSON 직렬화 가능한 값만 사용한다.
8. 실행 중 인증정보, 세션값, 미디어 스트림 URL은 데이터 결과에 포함하지 않는다.

## 대본

`transcript`는 사람이 바로 읽을 수 있는 정리용 데이터입니다.

```js
{
  language: 'ko',
  languageName: '한국어',
  text: '전체 대본 텍스트',
  segments: [
    { startMs: 0, durationMs: 1200, text: '문장' }
  ]
}
```

대본이 없으면 `null`로 반환하고 `errors.transcript`에 사유를 기록할 수 있습니다.

## 자막 원본

`rawCaptions`는 선택된 자막 트랙의 원본 응답을 JSON 직렬화 가능한 형태로 보존합니다.

공개 결과에는 인증값, 세션값, 미디어 스트림 주소를 포함하지 않습니다.

## 댓글

```js
[
  {
    author: '작성자',
    text: '댓글 내용',
    likes: 0,
    publishedAt: '표시된 작성 시점',
    replyCount: 0
  }
]
```

- 요청 수량: UI의 `count`
- 정렬: `top` 또는 `newest`
- 요청 수량보다 적게 확보되면 확보된 결과를 그대로 반환
- 댓글을 사용할 수 없으면 빈 배열 또는 `null`과 함께 오류 사유 반환

## 원본 메타데이터

`rawMetadata`는 현재 영상에서 확보한 메타데이터의 진단/보존용 스냅샷입니다.

다음 값은 제거한 뒤 반환합니다.

- 미디어 스트림 URL
- playback 추적 URL
- 인증/세션/쿠키 관련 값
- access/refresh token
- 기타 계정 접근에 사용될 수 있는 값

즉 UI의 `원본 메타데이터`는 **영상 메타데이터 원형을 최대한 유지하되 비밀값과 일회성 재생값을 제외한 스냅샷**을 의미합니다.

## 코어 결과

코어는 데이터 수집이 끝나면 `YT_TOOL_DATA_RESULT`를 보냅니다.

```js
{
  type: 'YT_TOOL_DATA_RESULT',
  token,
  videoId: '현재 영상 ID',
  requested: ['title', 'transcript', 'comments'],
  result: {
    title: '영상 제목',
    transcript: { language:'ko', languageName:'한국어', text:'...', segments:[] },
    comments: []
  },
  errors: {
    comments: '댓글을 가져오지 못했습니다.'
  },
  complete: true
}
```

`errors`는 필드별 부분 실패를 표시합니다. 오류가 없는 필드는 생략합니다.

## 단계 6 완료 기준

- 선택 필드와 댓글 옵션을 코어 입력으로 사용
- 선택된 필드만 조사
- 대본/댓글/고급정보를 필요할 때만 추가 조사
- 필드별 부분 실패 허용
- `YT_TOOL_DATA_RESULT` 결과 형식 확정
- 데이터 결과에 인증정보/미디어 스트림 URL 미포함

실제 YouTube 전용 추출 구현은 계속 북마클릿 내부에 유지합니다.

## 다음 단계

단계 7에서 `YT_TOOL_DATA_RESULT`를 UI의 실행 메모리로 받아 `원문 / TXT / JSON` 변환과 로컬 저장에 연결합니다.

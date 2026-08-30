# YouTube 데이터 추출 규격

이 문서는 통합 북마클릿 코어가 `데이터` 선택 시 만드는 **현재 데이터 결과 형식과 추출 원칙**만 정의합니다.

실제 YouTube 전용 selector, endpoint, continuation 해석 코드는 모바일 북마클릿 내부에 유지합니다.

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
- `rawCaptions` : 자막 원본 데이터
- `videoId` : 영상 ID
- `channelId` : 채널 ID
- `rawMetadata` : 원본 메타데이터 스냅샷

## 2. 추출 원칙

1. UI가 요청하지 않은 필드는 조사하지 않습니다.
2. 현재 실행에서 이미 확보한 기본정보는 재요청하지 않습니다.
3. 대본/자막은 선택된 경우에만 추가 조사합니다.
4. 댓글은 선택된 경우에만 요청합니다.
5. 댓글 정렬은 `top` 또는 `newest`를 사용합니다.
6. 특정 필드가 실패해도 확보된 다른 필드는 유지합니다.
7. 결과는 JSON 직렬화 가능한 값만 사용합니다.
8. 인증정보, 세션값, 미디어 스트림 URL은 데이터 결과에 포함하지 않습니다.

## 3. 대본

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

대본을 얻지 못하면 `result.transcript`를 생략하고 `errors.transcript`에 사유를 기록합니다.

## 4. 자막 원본

`rawCaptions`는 선택된 자막 트랙의 원본 응답을 JSON 직렬화 가능한 형태로 보존합니다.

다음 값은 포함하지 않습니다.

- 인증값
- 세션값
- 미디어 스트림 주소
- 계정 접근에 사용될 수 있는 값

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

- 수량: UI `comments.count`
- 정렬: `top` 또는 `newest`
- 요청 수보다 적게 확보되면 확보된 결과만 반환
- 사용할 수 없으면 해당 필드를 생략하고 `errors.comments` 기록

## 6. 원본 메타데이터

`rawMetadata`는 영상 메타데이터의 진단/보존용 스냅샷입니다.

제외 대상:

```text
미디어 스트림 URL
playback 추적 URL
인증/세션/쿠키 관련 값
OAuth access/refresh token
기타 계정 접근용 값
```

## 7. 코어 결과

```js
{
  type:'YT_TOOL_DATA_RESULT',
  token,
  videoId:'현재 영상 ID',
  requested:['title','transcript','comments'],
  result:{
    title:'영상 제목',
    transcript:{language:'ko',languageName:'한국어',text:'...',segments:[]},
    comments:[]
  },
  errors:{
    comments:'댓글을 가져오지 못했습니다.'
  },
  complete:true
}
```

`errors`는 필드별 부분 실패만 기록합니다. 성공한 필드는 `result`에 유지합니다.

로컬 출력은 `DATA_OUTPUT_FLOW.md`, Sheets 저장은 `PROTOCOL.md`와 `SHEET_RULES.md`를 따릅니다.

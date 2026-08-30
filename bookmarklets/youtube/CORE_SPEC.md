# 유튜브다운로드 실행 코어 규격

## 1. 코드 배치

```text
bookmarklet.js
→ 짧은 로더

ui.html
→ 실제 YouTube 추출/저장 코어

Transport.gs / Code.gs
→ Google 통신과 Sheets 처리
```

북마클릿 길이를 줄이기 위해 YouTube 추출·저장 로직을 `bookmarklet.js`에 누적하지 않습니다.

## 2. bookmarklet.js 책임

```text
공용 Apps Script /exec 주소 보유
실행 token 생성
숨은 iframe + form POST 브리지 생성
bridgeNonce 발급/갱신
get-ui 호출
ui.html을 iframe.srcdoc으로 표시
ui.html에 Apps Script call 함수 제공
Google 승인 실패 시 최소 fallback 화면 표시
종료 시 iframe/listener/전역 실행값 정리
```

목표는 모바일 Whale 북마크 URL 길이를 짧게 유지하는 것입니다.

## 3. ui.html 책임

```text
일반 영상/Shorts ID 확인
youtubei/player 호출
영상/음성 후보 생성
전체 사용자 화면
로컬 영상/음성 저장
데이터 선택/출력
파일 → 시트 → 카테고리 선택
관리정보
중복 처리
Apps Script action 호출
Drive 저장 영역
```

`ui.html`은 `iframe.srcdoc`으로 YouTube 페이지 컨텍스트에서 실행되므로 부모 YouTube 문서와 fetch 기능을 사용합니다.

## 4. YouTube player

```js
fetch('https://www.youtube.com/youtubei/v1/player',{
  method:'POST',
  credentials:'omit',
  headers:{
    'content-type':'application/json',
    'x-youtube-client-name':'3',
    'x-youtube-client-version':'20.10.38'
  },
  body:JSON.stringify({
    videoId,
    context:{client:{
      clientName:'ANDROID',
      clientVersion:'20.10.38',
      androidSdkVersion:30,
      hl:'ko',
      gl:'KR'
    }}
  })
})
```

- 영상: `streamingData.formats`의 direct `video/mp4`
- 음성: `adaptiveFormats`의 direct `audio/mp4`
- 실제 URL은 실행 메모리의 후보 Map에만 보관
- UI select에는 후보 ID와 품질 표시만 사용

## 5. Google 초기화

```text
ui.html 시작
→ create-storage
   ├─ 기존 연결 있으면 재사용
   └─ 없으면 유튜브다운로드sheet_v1 생성
→ get-state
→ defaultFileId
→ list-sheets
→ 수집 우선 선택
→ list-categories
→ 기본 카테고리 보장
→ check-duplicate
```

## 6. 로컬 저장

한 종류:

```text
저장 클릭
→ showSaveFilePicker
→ 파일 기록
```

복수 종류:

```text
저장 클릭
→ showDirectoryPicker
→ 선택 항목별 파일 생성
```

파일 선택 API는 `저장` 클릭 핸들러에서 네트워크 작업보다 먼저 실행합니다.

## 7. 현재 데이터 수집

현재 즉시 확보하는 항목:

```text
썸네일
제목
영상 URL
채널명
업로드일
영상 길이
조회수
설명
태그
영상 ID
채널 ID
원본 메타데이터(스트리밍 URL 제외)
```

`좋아요 / 대본 / 댓글 / 자막 원본`은 아직 실제 값을 확보하지 못하면 빈 성공값을 만들지 않고 오류로 표시합니다.

## 8. Sheets 저장

```text
데이터 + Drive 저장
→ 선택 필드 수집
→ 관리정보 결합
→ save-record
→ 영상 ID 기준 중복/업데이트
```

중요도 미선택은 Apps Script에 전달하지 않습니다.

## 9. 영구 저장 금지

```text
실행 중 media URL
OAuth access/refresh token
로그인 쿠키
인증 세션 비밀값
```

# 유튜브다운로드 북마클릿 코어 규격

## 1. 고정 이름

```text
북마클릿      유튜브다운로드
Apps Script  유튜브다운로드앱_v1
기본 Sheets  유튜브다운로드sheet_v1
기본 시트     수집
기본 카테고리 기본
```

## 2. 북마클릿 책임

```text
현재 일반 영상/Shorts ID 확인
youtubei/player 호출
영상·음성 직접 스트림 후보 보관
Apps Script POST 브리지 관리
Apps Script에서 ui.html 원본 받기
ui.html을 iframe.srcdoc으로 화면에 표시
UI action 처리
로컬 파일 저장
선택 데이터 수집
Sheets 저장 요청
중복 처리
```

실제 미디어 URL은 북마클릿 실행 메모리에만 두고 UI에는 후보 ID만 전달합니다.

## 3. UI 로딩

```text
bookmarklet.js
→ Apps Script get-ui
→ ui.html 문자열
→ 이름/실행 token을 현재 실행값으로 주입
→ iframe.srcdoc
→ YT_TOOL_READY
→ 코어 초기화
```

따라서 `ui.html` 전체를 모바일 북마크 URL에 넣지 않습니다.

## 4. Google 초기화

```text
get-state
→ 연결 파일 없음
   → create-storage
   → 유튜브다운로드sheet_v1 자동 생성
→ defaultFileId
→ list-sheets
→ 수집 시트 우선 선택
→ list-categories
→ 기본 카테고리 보장
→ check-duplicate
→ YT_TOOL_INIT
```

기존 Sheets는 사용자가 추가 연결할 때만 `connect-file`을 사용합니다.

## 5. YouTube player

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
- 음성: `streamingData.adaptiveFormats`의 direct `audio/mp4`
- Android Whale 일반 영상/Shorts에서 직접 저장 경로 검증
- 통합 영상 검증 화질은 360p

## 6. 로컬 저장

한 종류만 저장할 때:

```text
사용자 저장 클릭
→ showSaveFilePicker
→ media fetch 또는 데이터 생성
→ writable 저장
```

여러 종류를 동시에 저장할 때:

```text
사용자 저장 클릭
→ showDirectoryPicker
→ 선택한 영상/음성/데이터 파일을 같은 폴더에 생성
```

파일 선택 API는 사용자 클릭 직후 실행하고 그 전에 네트워크 `await`를 두지 않습니다.

## 7. 현재 데이터 수집

현재 코어가 바로 채울 수 있는 항목:

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

현재 페이지/API에서 확보하지 못한 `좋아요 / 대본 / 댓글 / 자막 원본`은 성공한 것처럼 채우지 않고 `errors`에 기록합니다. 해당 추출기는 별도 데이터 추출 규격에서 추가합니다.

## 8. Sheets 저장

```text
UI save-drive + data
→ 선택 필드만 수집
→ save-record
→ 영상 ID로 중복 확인/수정
```

중요도 `0`은 미선택 상태이므로 Apps Script에 보내지 않습니다. 나머지 관리정보는 사용자가 명시적으로 넣은 값과 현재 UI 상태만 전달합니다.

## 9. Drive 미디어

```text
영상/음성 Drive 선택
→ 선택 후보 ID를 실제 임시 URL로 해석
→ YT_TOOL_DRIVE_MEDIA
→ ui.html의 Google Save to Drive 영역
```

미디어 URL은 저장소나 문서에 기록하지 않습니다.

## 10. 종료

닫기 또는 재실행 시:

```text
UI iframe 제거
브리지 iframe 제거
message listener 제거
대기 요청 정리
실행 메모리 폐기
```

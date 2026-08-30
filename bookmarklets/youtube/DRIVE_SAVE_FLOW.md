# YouTube 영상·음성 Drive 저장

이 문서는 영상/음성을 Google Drive에 저장하는 **현재 미디어 경로**만 정의합니다.

데이터의 Google Sheets 저장은 이 경로와 별개이며 `Apps Script + SpreadsheetApp`을 사용합니다.

## 1. 구조

```text
영상/음성
YouTube 북마클릿 코어
→ 선택 미디어 URL/파일명
→ YT_TOOL_DRIVE_MEDIA
→ ui.html
→ Google 공식 Save to Drive 버튼
→ 사용자가 버튼을 눌러 My Drive 저장
```

```text
데이터
YouTube 북마클릿 코어
→ GAS_WEBAPP_URL
→ Apps Script
→ SpreadsheetApp
→ 사용자가 연결한 Sheets
```

두 경로를 혼합하지 않습니다.

## 2. 미디어 URL 전달

실제 YouTube 미디어 URL은 저장 버튼을 준비하는 순간에만 UI로 전달합니다.

```js
{
  type:'YT_TOOL_DRIVE_MEDIA',
  token,
  kind:'video'|'audio',
  src:'현재 저장 동작에만 사용하는 HTTPS 미디어 URL',
  filename:'저장 파일명.mp4'
}
```

실제 URL은 localStorage, IndexedDB, GitHub 파일, 문서에 저장하지 않습니다.

## 3. UI 처리

`ui.html`은 `YT_TOOL_DRIVE_MEDIA`를 받으면:

```text
src HTTPS 확인
→ https://apis.google.com/js/platform.js 로드
→ gapi.savetodrive.render()
→ 영상/음성별 공식 저장 버튼 렌더링
```

선택 화질/음질, 선택 항목, 저장 위치가 바뀌면 기존 버튼을 제거합니다.

## 4. Google 공식 Save to Drive 범위

이 방식은 Drive API 직접 업로드가 아닙니다.

- 별도 OAuth Client ID/API Key를 북마클릿에 넣지 않음
- Google 브라우저 세션 사용
- 대상은 `My Drive`
- 특정 Drive 폴더를 프로그램으로 지정하지 않음
- 사용자가 수집도구의 `[저장]` 후 Google 공식 저장 버튼을 한 번 더 누름

따라서 Sheets의 `파일 → 시트 → 카테고리` 선택 구조는 영상/음성 Drive 버튼에 적용하지 않습니다.

## 5. 복수 선택

영상과 음성을 함께 선택하면 각각 독립된 Google 저장 버튼을 렌더링합니다.

```text
영상 [Google Drive에 저장]
음성 [Google Drive에 저장]
```

한 항목 실패가 다른 항목에 영향을 주지 않습니다.

## 6. 실패 처리

- Google 스크립트 로드 실패 → 해당 Drive 버튼만 실패
- 미디어 URL 조건 불충족 → 해당 항목만 실패
- Drive 버튼 실패 → 로컬 저장 경로 유지

GoogleVideo 스트림의 실제 Save to Drive 성공 여부는 브라우저/CORS/Range 조건에 영향을 받을 수 있습니다.

UI 동작은 `UI_SPEC.md`, 메시지 형식은 `PROTOCOL.md`를 따릅니다.

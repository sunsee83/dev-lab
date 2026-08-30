# 영상·음성 Drive 저장 1차 연결

이 문서는 `ui.html`과 북마클릿 코어 사이의 **영상·음성 Drive 저장 1차 경로**를 정리합니다.

## 목적

- 별도 백엔드 없이 동작
- 북마클릿에 OAuth Client ID/API Key를 넣지 않음
- Google 공식 `Save to Drive` 버튼 사용
- 실제 YouTube 미디어 URL은 저장 버튼을 준비하는 순간에만 UI로 전달
- URL을 localStorage, IndexedDB, GitHub 파일에 저장하지 않음

## 동작 순서

1. 사용자가 `영상` 또는 `음성`을 선택
2. 저장 위치에서 `Drive` 선택
3. `[저장]` 선택
4. UI가 코어에 `save-drive` 요청
5. 코어가 임시 후보 ID를 실제 미디어 스트림으로 해석
6. 코어가 선택 항목별로 `YT_TOOL_DRIVE_MEDIA` 전달
7. UI가 `https://apis.google.com/js/platform.js`를 필요할 때만 로드
8. `gapi.savetodrive.render()`로 Google 공식 저장 버튼 생성
9. 사용자가 Google 공식 저장 버튼을 눌러 Drive 저장 실행

영상과 음성을 함께 선택한 경우 각각 별도의 Google 공식 저장 버튼을 준비합니다.

## 코어 → UI 메시지

```js
{
  type: 'YT_TOOL_DRIVE_MEDIA',
  token,
  kind: 'video' | 'audio',
  src: '현재 저장 동작에만 사용하는 HTTPS 미디어 URL',
  filename: '저장 파일명.mp4'
}
```

음성은 실제 포맷에 맞는 파일명을 사용합니다.

## UI 동작

`ui.html`은 `YT_TOOL_DRIVE_MEDIA`를 받으면 다음을 수행합니다.

- `src`가 HTTPS인지 확인
- Google Save to Drive 스크립트 로드
- 영상/음성별 공식 버튼 렌더링
- 화질/음질/항목/저장 위치가 변경되면 기존 버튼 제거
- 실제 미디어 URL을 브라우저 저장소에 기록하지 않음

Google 스크립트 로드에 실패하면 UI에 오류를 표시하고 코어에 `drive-widget-error`를 보냅니다.

## Google 공식 버튼의 범위

이 1차 방식은 Google Drive API 직접 업로드가 아닙니다.

따라서:

- Google 브라우저 세션을 사용해 저장
- 별도 OAuth Client ID/API Key 불필요
- 저장 대상은 `My Drive`
- 특정 폴더를 프로그램으로 지정하지 않음
- 사용자가 `[저장]`을 누른 뒤 Google 공식 저장 버튼을 한 번 더 눌러야 함

전용 폴더 지정/자동 분류가 필요하면 이후 Drive API 기반 경로가 필요합니다.

## CORS 조건

Google 공식 Save to Drive는 버튼 페이지와 미디어 소스가 다른 도메인일 경우 미디어 응답의 CORS/Range 지원이 필요합니다.

따라서 YouTube/GoogleVideo 실제 스트림이 이 조건을 만족하는지는 Android Whale에서 최종 검증해야 합니다.

## 단계 5 판정

코드 연결은 완료 상태입니다.

아직 검증되지 않은 항목:

- Android 모바일 Whale에서 Google 공식 버튼 스크립트 로드
- GoogleVideo 스트림의 Save to Drive CORS 처리
- 영상 실제 저장 완료
- 음성 실제 저장 완료

이 네 항목은 사용자 기기에서 한 번의 통합 테스트로 확인합니다.

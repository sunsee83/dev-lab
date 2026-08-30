# YouTube 수집도구

Android 모바일 YouTube용 통합 북마클릿 프로젝트입니다.

## 구조

```text
북마클릿 1개
├─ 영상
├─ 음성
└─ 데이터
```

- YouTube 핵심 추출: 북마클릿 내부
- UI/일반 로직: GitHub
- Sheets: Apps Script + `SpreadsheetApp`
- 인증 토큰/쿠키/비밀번호 저장 안 함

## Sheets

```text
북마클릿 → Apps Script → 연결한 Google Sheets
```

```text
1번 탭   안내
2~11번   데이터 시트 최대 10개
```

가로 = 항목(열) / 세로 = 영상(행) / 한 영상 = 한 행.

제한: 연결 파일 10개 / 시트당 2,000개 / 1,800개부터 경고.

## 기준 파일

- `ui.html` : 통합 UI
- `PROTOCOL.md` : 북마클릿 ↔ UI
- `APPS_SCRIPT_BRIDGE.md` : YouTube ↔ Apps Script
- `apps-script/Code.gs` : Sheets 처리
- `apps-script/Transport.gs` : 모바일 iframe POST 브리지
- `SHEET_RULES.md` : 저장 규칙

## 현재

- Apps Script 웹앱 배포 완료
- `window.opener` 방식은 Android Whale에서 실패 확인
- 숨은 iframe + form POST 방식으로 교체

## 다음

1. `Transport.gs` 추가 후 기존 웹앱 새 버전 배포
2. Android Whale에서 `ping` 1회 확인
3. 사용자 Sheets 연결/시트 생성
4. 데이터 1건 저장
5. 전체 통합 후 북마클릿 축약

영상/음성 Save to Drive는 별도 경로입니다.

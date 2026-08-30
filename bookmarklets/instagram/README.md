# Instagram RI Bookmarklet

현재 활성 버전: **v0.8.6**

## 파일 구조

```text
bookmarklets/instagram/
├─ current.js           현재 실행 본체
├─ bridge-stable.svg    업데이트 중계
├─ bookmarklet-url.txt  휴대폰 북마클릿 원본
├─ README.md            현재 상태 / 검증 / 운영 규칙
└─ SPEC.md              제품 / UI / 저장 전체 사양
```

이 5개만 활성 파일로 유지한다. 과거 실험과 버전별 파일은 Git 기록으로 확인하며 활성 폴더에 복사본을 만들지 않는다.

## 실행 / 업데이트
- 일반 실행은 휴대폰에 캐시된 `current.js`를 바로 실행한다.
- 일반 실행에서는 업데이트용 외부 창을 열지 않는다.
- `RI 업데이트`를 직접 눌렀을 때만 `bridge-stable.svg`가 GitHub 최신 `main`의 `current.js`를 받아 캐시를 교체한다.
- 기능 업데이트는 **`current.js` 내용만 교체**한다.
- 정상적인 기능 릴리스에서 `bookmarklet-url.txt`와 `bridge-stable.svg`는 변경하지 않는다.

## 현재 확인된 동작
- Reel 소리 포함 영상 저장
- Reel 음원 단독 저장
- Reel 이미지 저장
- 기본 다운로드
- 지정 폴더 저장
- 캐러셀 전체 저장
- 단일 사진 원본 저장
- 상태 패널에 PASS / PARTIAL / FAIL / WAIT 표시
- shortcode 중심의 짧은 파일명
- 영상 저장 시 실시간 재인코딩을 사용하지 않음

## v0.8.6 그리드 동작
- 그리드 카드의 `저장`은 즉시 일괄 다운로드하지 않는다.
- 영상 / Reel: `영상 저장` / `음원 저장` / `이미지 저장` / `3개 모두 저장` 중 사용자가 선택한다.
- 단일 사진: `사진 저장`을 선택한다.
- 캐러셀: `캐러셀 전체 저장`을 선택한다.
- 그리드에서 선택한 콘텐츠의 정보와 저장 결과는 기존 상태 패널에 계속 표시한다.
- 저장 위치는 현재 설정한 기본 다운로드 / 지정 폴더 / 매번 선택 규칙을 공유한다.

## 기존 reels-inspector 재사용 기준
새 UI/수치 로직을 처음부터 다시 만들지 않는다. 아래 기존 소스를 기준본으로 사용하고 북마클릿에 필요한 부분만 이식한다.

- `reels-inspector/src/metrics/metrics.js` — ER / 24h / 계정대비 계산
- `reels-inspector/src/ui/grid-metrics-renderer.js` — Grid 2행 × 4칸, 총 8-slot
- `reels-inspector/src/ui/metric-format.js` — 수치 축약/퍼센트/배수/날짜 형식
- `reels-inspector/src/ui/reel-overlay.js` — Reel 최소 지표 UI
- `reels-inspector/src/ui/research-workspace.js` + `styles.js` — Research Workspace와 모바일 UI 골격

기존 reels-inspector에서 자동 테스트가 통과한 코드라도 북마클릿 환경에서는 별도 Android Edge 실기기 확인 전 PASS로 승격하지 않는다.

## 작업 우선순위

### P0 — v0.8.6 그리드 선택 저장 검증
- 영상 카드 `저장`을 눌렀을 때 선택 UI만 열리고 즉시 다운로드되지 않아야 한다.
- `영상 저장` / `음원 저장` / `이미지 저장`은 선택한 항목만 저장한다.
- `3개 모두 저장`을 선택한 경우에만 영상 + 음원 + 이미지 3개를 저장한다.
- 선택한 카드와 저장 파일의 shortcode가 일치해야 한다.

### P0.5 — UI + 수치 골격 이식
저장 기능을 더 확장하기 전에 기존 reels-inspector의 UI/metrics를 북마클릿에 맞게 이식한다.
- Instagram 원래 3열 Grid 유지
- Grid 2행 8-slot 표시
  - 1행: 조회수 / 좋아요 / 댓글 / 재게시
  - 2행: ER / 24h / 계정대비 / 날짜
- Reel: 조회수 / ER / 24h / 계정대비 / 날짜의 가벼운 overlay
- Research Workspace: CLOSED / COMPACT / EXPANDED 골격
- 상세 탭: 요약 / 콘텐츠 / 댓글 / 분석 / 미디어
- 저장 선택창과 상태/진행 UI를 Workspace 구조와 충돌하지 않게 정리
- missing 수치를 0으로 만들지 않는다.

### P1 — 콘텐츠 인식 / API 오류 보강
- 특정 게시물에서 발생하는 Instagram API 404를 재현하고 실패 경로를 수집한다.
- API가 실패해도 현재 화면의 identity/DOM/검증된 데이터로 복구할 수 있는 범위를 보강한다.
- 잘못된 인접 카드나 다른 shortcode를 저장·표시하는 fallback은 허용하지 않는다.

### P2 — 지정 폴더 지속성 검증
- 지정 폴더 선택 후 같은 세션에서 모든 저장 진입점이 같은 폴더를 사용해야 한다.
- Edge 완전 종료 후 재실행했을 때 IndexedDB의 폴더 핸들이 복원되어야 한다.
- 권한이 만료된 경우 저장 시에만 권한을 다시 요청한다.

### P3 — 이미지 / 속도 최종 검증
- 명시적 표지가 있는 영상은 실제 표지를 저장한다.
- 표지가 없으면 정확히 0.000초 첫 프레임을 저장한다.
- 일반 Reel 영상 저장은 실시간 재인코딩 없이 수 초 수준을 목표로 한다.

### P4 — 콘텐츠 데이터 확장
UI/metrics 골격과 저장 안정화 뒤 진행한다.
- caption
- hashtags / mentions
- 작성자 / 게시일
- 댓글 / 답글
- 이후 STT / OCR / 분석

## 완료 기준
- 선택한 콘텐츠와 저장 파일/수치의 shortcode가 일치한다.
- 영상은 소리가 포함되고 정상 재생된다.
- 사용자가 선택한 저장 항목만 저장된다.
- Grid는 원래 3열을 유지하고 수치 때문에 카드 크기나 행 높이가 바뀌지 않는다.
- 확인되지 않은 수치는 `0`이 아니라 missing 상태로 표시한다.
- 캐러셀은 누락 없이 원래 순서를 유지한다.
- 지정 폴더 모드에서는 모든 저장 진입점이 같은 폴더를 사용한다.
- 한 항목이 실패해도 가능한 나머지 저장은 계속되고 상태 UI에 결과가 남는다.

## 문서 관리 규칙
- 현재 상태와 테스트 결과 → `README.md`
- 제품 구조, UI, 저장 동작, 수치 규칙, 파일명, 데이터 구조 → `SPEC.md`
- 같은 규칙을 두 문서에 중복 작성하지 않는다.
- 과거 상태 문서를 새 파일로 만들지 않는다. 변경 이력은 Git commit으로 관리한다.

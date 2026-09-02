# Instagram Content Research Tool

Android Edge + Tampermonkey + Instagram 모바일 웹에서 **발굴 → 비교 → 저장 → 조사 → 분석**을 빠르게 수행하는 userscript입니다.

## 설치 / 업데이트

`https://github.com/sunsee83/open_lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js`

Instagram 새로고침만으로 userscript가 갱신되는 것은 아닙니다. raw `.user.js`를 열어 Tampermonkey에서 설치/업데이트합니다.

## 문서 — 5개만 기준으로 사용

| 문서 | 역할 |
|---|---|
| `PROJECT_PLAN.md` | 제품 목적·범위·장기 로드맵 |
| `STATUS.md` | **현재 상태·미확인·다음 작업·작업 절차** |
| `ARCHITECTURE.md` | source 구조·owner·data flow·migration |
| `BASELINE.md` | **삭제/회귀 금지 기준 + Grid/UI/미디어 승인선** |
| `tests/README.md` | 자동/실기기 acceptance |

작업 시작 순서: **STATUS → BASELINE → 관련 ARCHITECTURE/PROJECT_PLAN → 코드**.

## 제품 역할

```text
Grid               = 빠른 비교/발굴
Grid media action  = 현재 카드 빠른 저장
Reel Overlay       = 시청 중 핵심 파생지표
Global RI          = 전체 리서치 진입
Research Workspace = 상세 조사/미디어/설정
Feedback/Activity  = 진행·성공·오류
```

Research Workspace CONTENT 탭:

`요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정`

## 핵심 원칙

- `src/*`만 개발 source; `ri-retry.user.js`는 generated artifact
- good behavior는 refactor 때문에 되돌리지 않음
- 기존 기능 교체는 `PRESERVE / REPLACE / REMOVE-APPROVED` gate 적용
- Grid 3열/8-slot/no-flicker/actual cover 보존
- metric missing을 `0`으로 추정하지 않음
- 지정폴더 실패 시 Downloads로 silent fallback하지 않음
- runtime hotfix `@require` chain 없음
- Android Edge 동작은 실기기 확인 전 Verified로 기록하지 않음

## Build

```bash
npm test
npm run build
npm run check
node --check ri-retry.user.js
```

현재 버전·검증 상태·다음 정확한 작업은 `STATUS.md`만 확인합니다.

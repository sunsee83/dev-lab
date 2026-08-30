# Instagram RI Bookmarklet

## Active runtime
- `bookmarklet-url.txt` — 휴대폰에 저장하는 고정 북마클릿 로더.
- `bridge-stable.svg` — 최신 `main` 커밋 SHA를 확인하고 그 SHA의 `current.js`를 전달하는 중계.
- `current.js` — 유일한 실행 본체. 기능 업데이트는 이 파일만 교체한다.

## Product docs
- `PRODUCT_STRUCTURE.md` — 현재 제품/UI 구조와 개발 순서.
- `MEDIA_SAVE_RULES.md` — 저장 동작, 파일명, 그리드 저장 규칙.
- `SAVE_STATUS.md` — 실제 기기 검증 상태와 남은 확인 항목.

## 고정 규칙
1. 실행 본체는 항상 `current.js` 하나만 사용한다.
2. 기능 버전별 JS 파일을 활성 루트에 만들지 않는다.
3. 일반 기능 업데이트 때 `bookmarklet-url.txt`와 `bridge-stable.svg`는 수정하지 않는다.
4. 과거 실험 파일은 Git 기록으로 확인하며 활성 폴더에 중복 보관하지 않는다.
5. 업데이트 경로: `bookmarklet → bridge-stable.svg → GitHub main SHA → current.js → postMessage → Blob 실행`.

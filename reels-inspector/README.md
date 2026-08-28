# Reels Inspector

Instagram 모바일 웹에서 콘텐츠를 빠르게 조사하기 위한 Tampermonkey 리서치 도구입니다.

## 현재 구조
이 폴더의 실제 실행 파일은 **`ri-retry.user.js` 하나뿐**입니다.

- `ri-retry.user.js` — 설치/업데이트/실행을 모두 담당하는 단일 self-contained userscript
- `README.md` — 구조와 개발 원칙 문서

과거의 `@require` 체인, hotfix 파일, 테스트 설치 파일, 구형 모듈 파일은 모두 제거했습니다. 이전 버전은 Git 히스토리에서 복구할 수 있습니다.

## 설치 URL
`https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js`

## 개발 원칙
- 새 수정은 별도 hotfix 파일을 추가하지 않고 `ri-retry.user.js` 안에서만 합니다.
- 한 버전에서 동일 UI/데이터를 여러 루프가 동시에 수정하지 않게 합니다.
- 사진/카드뉴스(`/p/`)에는 검증된 조회수가 없으면 조회수를 표시하지 않습니다.
- Reels 피드와 게시물 상세 화면을 구분합니다.
- 값이 확인되지 않으면 임의 숫자를 만들지 않고 숨기거나 `—`/`확인 중`으로 표시합니다.
- `@version`을 올린 뒤 문법 검사 후 main에 반영합니다.

## 현재 목표 UI
### 그리드
- 1줄: 조회수(릴스만) · 좋아요 · 댓글 · 리포스트
- 2줄: ER · 24h 증감 · 계정 대비 배수 · 게시일
- 사진/카드뉴스는 조회수 기반 지표 제외
- 이미지/순수영상 버튼 유지

### Reels 피드
화면 직접 표시:
- 조회수
- ER
- 24h 증감
- 계정 대비 배수
- 게시일

도구 패널:
- 조회수 · 좋아요 · 댓글 · 리포스트
- ER · 24h · 계정 대비 · 게시일
- 영상 길이/해상도
- 순수 영상 · 썸네일 · 링크 복사 · 업데이트
- 하단 닫기 버튼

## 실행 환경
- Android Microsoft Edge
- Tampermonkey
- Instagram 모바일 웹

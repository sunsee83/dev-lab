# Reels Inspector

Instagram 모바일 웹에서 릴스·게시물을 빠르게 조사하고 저장하기 위한 실험용 리서치 도구입니다.

## 목적
- 검색/프로필 그리드에서 성과 지표 비교
- 릴스·이미지·썸네일·영상 저장
- 릴스 상세 정보 확인
- 이후 STT/OCR/AI 분석 기능 확장

## 실행 환경
- Android Microsoft Edge
- Tampermonkey
- Instagram 모바일 웹

## 구조
- `reels-inspector.user.js` — Tampermonkey에 한 번 설치하는 로더
- `manifest.json` — 현재 버전과 로드할 모듈 목록
- `core.js` — 공통 기능/상태
- `network.js` — Instagram 응답 데이터 수집
- `data.js` — 공개 지표/미디어 정보 추출
- `grid.js` — 그리드 오버레이·정렬·다운로드 버튼
- `ui.js` — 릴스 상세 도구 패널
- `main.js` — 실행 시작점

## 업데이트 방식
기능 파일만 GitHub에서 수정합니다. 설치 코드를 다시 붙여넣을 필요 없이 Instagram을 새로고침하면 최신 모듈을 불러옵니다.

## 현재 상태
프로토타입 개발 중. 그리드 지표, 정렬, 썸네일/이미지 저장, 영상 저장, 릴스 상세 정보 기능을 우선 개발합니다.

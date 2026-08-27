# Instagram Research Extension

Instagram 모바일 웹에서 콘텐츠를 빠르게 조사·저장하기 위한 실험용 브라우저 확장 프로젝트입니다.

## 목적
- 검색/프로필 그리드에서 성과 지표를 빠르게 비교
- 릴스·이미지·썸네일·영상 저장
- 릴스 상세 정보 확인
- 이후 STT/OCR/AI 분석 기능 확장

## 주요 기능
- 좋아요·댓글·리포스트·조회수 등 공개 지표 표시
- 그리드 정렬 및 비교
- 썸네일/이미지/영상 다운로드
- 릴스 상세 정보 패널
- 향후 대본·OCR·Hook/CTA 분석

## 실행 환경
- Android Microsoft Edge
- Tampermonkey
- Instagram 모바일 웹

## 파일
- `reels-inspector.user.js` — Tampermonkey 설치용 로더
- `app.js` — 실제 기능 코드

## 현재 상태
프로토타입 개발 중. `app.js`를 업데이트하면 설치 코드를 다시 붙여넣지 않고 새로고침으로 최신 기능을 불러오는 구조를 사용합니다.

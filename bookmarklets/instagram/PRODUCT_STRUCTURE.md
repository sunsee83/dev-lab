# Instagram Bookmarklet — Product Structure Guide

이 문서는 Instagram 모바일 웹 위에 얹는 리서치 북마클릿의 **제품 구조 가이드라인**입니다.

- 확정 사양이 아니라 구현·실기기 검증에 따라 조정합니다.
- 이미 검증된 좋은 동작은 우선 보존합니다.
- Instagram 원래 UI를 최대한 유지하고, 리서치 기능만 최소 침범으로 추가합니다.
- 데이터가 없거나 확인되지 않은 값은 숫자로 추정하지 않습니다.

## 방향 정리

기존 userscript 계획과 현재 북마클릿 방향을 합쳐 다음처럼 정리합니다.

1. **Grid는 발굴/비교에 집중**
   - Instagram 원래 3열 구조 유지
   - 카드 크기/행 높이 변경 금지
   - 하단 2줄 8-slot 지표 유지
   - 빠른 저장만 카드 내부에 둠

2. **리서치 창은 하나의 Shell로 통일**
   - 닫힘 → 간단 보기 → 상세 보기
   - 현재 콘텐츠가 있으면 CONTENT 모드
   - 현재 콘텐츠가 없으면 GLOBAL 모드
   - Settings는 콘텐츠 탭에 섞지 않고 GLOBAL에서 관리

3. **미디어 확보를 첫 번째 핵심 기능으로 둠**
   - 영상 / 사진 / 슬라이드 원본 저장
   - 실제 표지 우선
   - 실제 표지가 없으면 영상 첫 프레임으로 썸네일 생성
   - 저장 파일과 게시물 데이터(JSON)를 같은 identity로 연결

4. **수집과 분석을 분리**
   - 먼저 identity / 원본 / 본문 / 지표 / 댓글을 사실 데이터로 수집
   - 그 다음 STT / OCR / 분석을 별도 단계로 수행
   - 근거 데이터가 없으면 분석 결과를 만들지 않음

5. **UI와 데이터 엔진을 분리**
   - 화면별 parser/formula 복제 금지
   - 하나의 콘텐츠 identity를 중심으로 Verified Data를 만들고 Grid/Reel/Research가 공유

6. **북마크 URL과 공개 본체 역할 분리**
   - 북마크 URL: 서비스 전용 핵심 판별·식별·짧은 추출·외부 연결
   - GitHub 공개 본체: UI·저장·IndexedDB·썸네일·CSV/JSON·일반 유틸리티

---

## 화면 / 기능 구조

```text
Instagram 모바일
└─ Research Bookmarklet UI
│
├─ 공통 런타임
│  ├─ Bookmark URL Core
│  │  ├─ Instagram 전용 핵심 판별
│  │  ├─ 콘텐츠 identity 식별
│  │  ├─ 중요한 짧은 추출
│  │  └─ 외부 본체 연결
│  │
│  ├─ Public Body
│  │  ├─ UI
│  │  ├─ 파일 저장
│  │  ├─ IndexedDB
│  │  ├─ 썸네일 생성
│  │  ├─ CSV / JSON 출력
│  │  └─ 일반 유틸리티
│  │
│  └─ Data Engine
│     └─ Instagram
│        → Identity
│        → Extractor
│        → Normalizer
│        → Verified Store
│        → Metrics / Media / Text / Comments
│        → Grid / Reel / Feed / Research Workspace
│
├─ 공통 진입
│  └─ 리서치 [전체 화면 · 하단 안전영역 고정]
│     ├─ 기본: 우측 하단
│     ├─ Reel: 우측 액션 레일 충돌 시 좌측 하단
│     ├─ 하단 내비 / 앱 배너 / 본문 자동 회피
│     └─ 화면당 1개만 유지
│
├─ 프로필 / Grid
│  └─ 콘텐츠 카드 [Instagram 원래 3열 유지]
│     ├─ 썸네일 [카드 내부 · 전체]
│     │
│     ├─ 콘텐츠 유형 [썸네일 내부 · 우측 위]
│     │  ├─ Reel
│     │  ├─ Video
│     │  ├─ Photo
│     │  └─ Carousel
│     │
│     ├─ 기본 지표 [카드 내부 · 하단 첫째 줄 · 4 fixed slots]
│     │  ├─ 조회수
│     │  ├─ 좋아요
│     │  ├─ 댓글
│     │  └─ 재게시
│     │
│     ├─ 파생 지표 [카드 내부 · 하단 둘째 줄 · 4 fixed slots]
│     │  ├─ 참여율
│     │  ├─ 24시간
│     │  ├─ 계정대비
│     │  └─ 게시일
│     │
│     └─ 빠른 저장 [썸네일 내부 · 좌측 아래]
│        ├─ Reel / Video → 영상
│        ├─ Reel / Video → 표지
│        │  └─ 실제 표지 없음 → 첫 프레임 생성
│        ├─ Photo → 원본 사진
│        └─ Carousel → 전체 개별 저장
│
├─ Reel
│  ├─ Instagram 기본 UI [우측 액션 레일]
│  │  ├─ 좋아요
│  │  ├─ 댓글
│  │  ├─ 재게시
│  │  └─ 공유
│  │
│  └─ 리서치 핵심 지표 [Reel 영상 영역 · 좌측 아래 · 본문 위]
│     ├─ 조회수
│     ├─ 참여율
│     ├─ 24시간
│     ├─ 계정대비
│     └─ 게시일
│
├─ Feed / 게시물
│  ├─ Instagram 기본 UI [게시물 내부]
│  │
│  └─ 최소 추가 지표 [게시물 내부 · 성과정보 인접 영역]
│     ├─ 참여율
│     ├─ 24시간
│     ├─ 계정대비
│     └─ 게시일
│
└─ Research Workspace [전체 화면 · Bottom Sheet]
   │
   ├─ CLOSED
   │
   ├─ COMPACT / 간단 보기
   │  ├─ 헤더 [상단 고정]
   │  │  ├─ 계정명 [좌측]
   │  │  ├─ 콘텐츠 유형 [계정명 옆]
   │  │  ├─ 펼치기 [우측]
   │  │  └─ 닫기 [우측 끝]
   │  │
   │  ├─ 핵심 지표 [중앙]
   │  │  ├─ 조회수
   │  │  ├─ 참여율
   │  │  ├─ 24시간
   │  │  └─ 계정대비
   │  │
   │  ├─ 보조 정보
   │  │  ├─ 게시일
   │  │  └─ 데이터 상태
   │  │
   │  └─ 원본 저장 [하단 고정]
   │
   └─ EXPANDED / 상세 보기
      ├─ 헤더 [상단 고정]
      │  ├─ 계정명 [좌측]
      │  ├─ 콘텐츠 유형 [계정명 옆]
      │  ├─ 접기 [우측]
      │  └─ 닫기 [우측 끝]
      │
      ├─ 메뉴 [헤더 아래 · 가로 스크롤]
      │  ├─ 요약
      │  ├─ 콘텐츠
      │  ├─ 댓글
      │  ├─ 분석
      │  └─ 미디어
      │
      ├─ 요약
      │  ├─ 기본 성과
      │  │  ├─ 조회수
      │  │  ├─ 좋아요
      │  │  ├─ 댓글
      │  │  └─ 재게시
      │  │
      │  ├─ 파생 성과
      │  │  ├─ 참여율
      │  │  ├─ 24시간
      │  │  └─ 계정대비
      │  │
      │  ├─ 콘텐츠 정보
      │  │  ├─ 계정명
      │  │  ├─ 콘텐츠 유형
      │  │  ├─ 게시일
      │  │  ├─ shortcode / identity
      │  │  └─ 원본 주소
      │  │
      │  └─ 데이터 상태
      │     ├─ 확인 중
      │     ├─ 확인됨
      │     ├─ 값 없음
      │     ├─ 사용 불가
      │     └─ 검증 중
      │
      ├─ 콘텐츠
      │  ├─ 본문
      │  │  ├─ 전체 본문
      │  │  ├─ 해시태그
      │  │  └─ 언급 계정
      │  │
      │  ├─ 음성 내용 [향후]
      │  │  ├─ 전체 음성 변환
      │  │  └─ 시간대별 문장
      │  │
      │  └─ 화면 글자 [향후]
      │     ├─ 인식 문구
      │     ├─ 표시 시간
      │     └─ 화면 위치
      │
      ├─ 댓글
      │  ├─ 댓글 현황
      │  │  ├─ 전체 댓글 수
      │  │  ├─ 수집된 댓글 수
      │  │  └─ 답글 수
      │  │
      │  ├─ 핵심 반응 [분석 단계]
      │  │  ├─ 질문
      │  │  ├─ 구매의도
      │  │  ├─ 긍정
      │  │  ├─ 부정 / 불만
      │  │  ├─ 반론
      │  │  └─ 팁 / 정보
      │  │
      │  └─ 원문
      │     ├─ 댓글
      │     └─ 답글
      │
      ├─ 분석 [수집 데이터가 확보된 뒤]
      │  ├─ 시작부
      │  │  ├─ 시작 훅
      │  │  └─ 첫 핵심 메시지
      │  │
      │  ├─ 콘텐츠 구성
      │  │  ├─ 도입
      │  │  ├─ 전개
      │  │  ├─ 핵심 내용
      │  │  └─ 마무리
      │  │
      │  ├─ 표현 요소
      │  │  ├─ 행동유도
      │  │  ├─ 강조 문구
      │  │  ├─ 숫자
      │  │  └─ 가격
      │  │
      │  └─ 종합 분석
      │     ├─ 성과 특징
      │     ├─ 콘텐츠 특징
      │     └─ 댓글 반응 특징
      │
      ├─ 미디어
      │  ├─ Reel / Video
      │  │  ├─ 영상 미리보기
      │  │  └─ 영상 저장 [해당 항목 · 우측]
      │  │
      │  ├─ 표지
      │  │  ├─ 실제 표지 미리보기
      │  │  ├─ 실제 표지 없음 → 첫 프레임 생성
      │  │  ├─ thumbnailSource = cover | firstFrame | none
      │  │  └─ 표지 저장 [해당 항목 · 우측]
      │  │
      │  ├─ Photo
      │  │  ├─ 원본 미리보기
      │  │  └─ 사진 저장 [해당 항목 · 우측]
      │  │
      │  └─ Carousel
      │     ├─ 전체 개수
      │     ├─ 현재 순서
      │     ├─ 각 원본 미리보기
      │     └─ 전체 저장 [미디어 탭 · 하단]
      │
      └─ 작업 상태 [필요할 때만 하단 표시]
         ├─ 확인 중
         ├─ 수집 중
         ├─ 저장 중
         │  └─ 현재 / 전체
         ├─ 분석 중
         └─ 오류
            ├─ 다시 시도
            └─ 설정 열기

전역 리서치 [현재 콘텐츠 identity가 없을 때]
├─ Research Home
│  └─ 현재 콘텐츠 인식 상태
│
├─ 저장 설정
│  ├─ 영상
│  │  └─ 기본 다운로드 | 지정 폴더 | 매번 선택
│  ├─ 사진 / 표지
│  │  └─ 기본 다운로드 | 지정 폴더 | 매번 선택
│  └─ 슬라이드
│     └─ 기본 다운로드 | 지정 폴더 | 매번 선택
│
├─ 저장 위치
│  ├─ 현재 폴더
│  └─ 폴더 변경
│
└─ 업데이트
   ├─ 현재 버전
   └─ 업데이트 바로가기
```

---

## 저장되는 콘텐츠 단위

```text
Post Package
├─ identity
│  ├─ shortcode
│  ├─ URL
│  ├─ 작성자
│  ├─ 게시일
│  └─ media type
│
├─ media
│  ├─ video
│  ├─ images[]
│  ├─ cover
│  └─ thumbnailSource
│
├─ text
│  ├─ caption
│  ├─ hashtags[]
│  └─ mentions[]
│
├─ metrics
│  ├─ views
│  ├─ likes
│  ├─ comments
│  ├─ reposts
│  ├─ ER
│  ├─ 24h
│  └─ accountRelative
│
├─ comments
│  ├─ comment
│  └─ replies[]
│
├─ savedFiles
│  ├─ video
│  ├─ cover
│  ├─ images[]
│  └─ savedAt
│
└─ research [향후]
   ├─ transcript
   ├─ OCR
   └─ analysis
```

미디어 파일만 따로 저장하지 않고 가능한 경우 같은 identity의 `data.json`과 연결합니다.

---

## 구현 우선순위

```text
Phase 0  실행 기반
└─ 짧은 Bookmark Loader → bridge → postMessage → Blob script

Phase 1  Media Acquisition
├─ Reel / Video 실제 URL
├─ Photo 원본
├─ Carousel 전체
├─ 실제 cover
├─ cover 없음 → 첫 프레임
├─ 기본 다운로드
├─ 지정 폴더
└─ 폴더 복원

Phase 2  Content Data
├─ identity
├─ 작성자 / 게시일 / URL
├─ caption
├─ hashtags / mentions
└─ 공개 metrics

Phase 3  Comments
├─ 댓글 / 답글
├─ 중복 제거
├─ 실제 로드된 범위 표시
└─ 추가 로딩 동작 검증

Phase 4  Research Analysis
├─ STT
├─ OCR
├─ 댓글 분류
└─ 콘텐츠 분석
```

Phase 1이 안정적으로 통과하기 전에는 Phase 2~4 때문에 저장 경로를 복잡하게 만들지 않습니다.

---

## 보존 / 변경 기준

```text
PRESERVE
├─ Instagram 원래 3열 Grid
├─ Grid 하단 2줄 8 fixed slots
├─ native action 비침범
├─ missing ≠ 0
├─ no-flicker
└─ actual media 우선

ADJUSTABLE
├─ Global Research 실제 좌/우 위치
├─ Compact / Expanded 높이
├─ 버튼 크기·간격
├─ 탭 세부 순서
└─ 충돌 회피 offset

FUTURE
├─ STT
├─ OCR
├─ AI 분석
└─ 다중 SNS 확장
```

실제 Android Edge에서 확인되지 않은 좌표·권한·저장 동작은 문서상 확정으로 표시하지 않습니다.

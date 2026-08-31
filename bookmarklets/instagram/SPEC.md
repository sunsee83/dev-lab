# Instagram RI — Specification

현재 기준: **v0.9.7**

이 문서는 Instagram 모바일 웹용 RI 북마클릿의 UI, 수치, 저장, 데이터, 검증 기준을 정의한다.

## 1. 제품 원칙

1. Instagram 콘텐츠가 항상 1순위다.
2. RI는 별도 앱을 화면 위에 덮는 제품이 아니라 Instagram 맥락 안에 최소한으로 결합한다.
3. Grid / Reel / Feed / Research UI는 하나의 정보 체계로 설계한다.
4. 실제 데이터가 있으면 적극적으로 보여주고, 없는 값을 `0`, `-`, 아이콘-only placeholder로 만들지 않는다.
5. 기본 UI는 작고 상세 UI는 사용자가 직접 열 때만 확장한다.
6. 큰 빈 검은 영역을 만들지 않는다.
7. PASS / WAIT / FAIL 같은 개발용 진단 UI는 일반 사용자 화면에 노출하지 않는다.
8. Instagram native UI를 제거하거나 재배치하지 않는다.
9. Grid 3-column 크기와 행 높이를 변경하지 않는다.
10. 저장 / 수치 / 댓글 / 분석은 shortcode를 공통 identity로 사용한다.
11. Android Edge 실기기에서 확인하기 전 PASS 처리하지 않는다.
12. `reels-inspector/**`는 읽기 전용 참고자료이며 수정·삭제·정리·커밋하지 않는다.

## 2. 파일 / 런타임

활성 파일은 정확히 5개다.

```text
bookmarklets/instagram/
├─ README.md
├─ SPEC.md
├─ bookmarklet-url.txt
├─ bridge-stable.svg
└─ current.js
```

- archive / 임시 파일 / 버전 복사본을 만들지 않는다.
- 과거 버전은 Git history로 관리한다.
- `current.js`는 평문 JS 본체를 유지한다.
- 북마크 주소는 기능 업데이트마다 교체하지 않는다.
- `RI 업데이트`가 GitHub 최신 `current.js`를 받아 캐시를 교체한다.
- 본체 정상 실행 시 Loader 업데이트 버튼은 숨긴다.
- 본체 실행 실패 시에만 Loader 업데이트 버튼을 비상 복구용으로 사용한다.

GitHub 또는 bookmark URL에 저장 금지:

- API key
- password
- login token
- access / refresh token
- session cookie
- 인증 세션 값

## 3. 전체 UI 구조

```text
Instagram 모바일
└─ RI Research
   ├─ 화면 정보
   │  ├─ Grid 비교 지표
   │  ├─ Reel 핵심 지표
   │  └─ Feed 최소 지표
   │
   ├─ 빠른 작업
   │  └─ 콘텐츠별 선택 저장
   │
   ├─ 공통 진입
   │  └─ RI launcher
   │
   ├─ 간단 보기
   │  ├─ 현재 콘텐츠
   │  ├─ 실제 핵심 수치
   │  ├─ 저장
   │  ├─ 상세
   │  └─ 관리
   │
   ├─ 상세 보기
   │  ├─ 요약
   │  ├─ 콘텐츠
   │  ├─ 댓글
   │  ├─ 분석
   │  └─ 미디어
   │
   ├─ 전역 관리
   │  ├─ 저장
   │  ├─ 데이터
   │  ├─ 리서치 설정
   │  ├─ 업데이트
   │  ├─ 진단
   │  └─ 종료
   │
   └─ 작업 상태
      ├─ Grid 해당 버튼
      ├─ 열린 RI UI 내부
      └─ 실제 오류만 임시 알림
```

시각 우선순위:

```text
Instagram 콘텐츠
> 실제 수치 / 실제 연구 결과
> 현재 작업
> 저장
> 상세 리서치
> 설정 / 진단
```

## 4. Grid UI

### 4.1 DOM 부착

Grid UI는 반드시 Instagram 카드 anchor 내부에 직접 부착한다.

```text
Instagram card anchor [position: relative]
└─ RI card UI [absolute inset: 0]
   ├─ quick save
   └─ metrics
      ├─ row 1
      └─ row 2
```

금지:

- fixed global card overlay
- 스크롤마다 카드 좌표를 다시 계산해 overlay를 이동하는 방식
- 카드 폭 / 높이 / 3-column 구조 변경
- Instagram native Reel / carousel 아이콘 제거
- 과도한 DOM style mutation

Instagram SPA 대응:

- 가벼운 카드 재스캔 허용
- 현재 유효한 Grid anchor 재판정
- 더 이상 Grid 카드가 아닌 anchor의 RI UI 제거
- 클릭 순간 현재 anchor `href`에서 shortcode 재해석

### 4.2 Grid metrics

`reels-inspector`의 좋은 표시 구조를 읽기 전용으로 참고한다.

고정 8-slot:

```text
1행: ▶조회수 | ♥좋아요 | ●댓글 | ↻재게시
2행: 참여율 | 24시간 | 계정대비 | 게시일
```

시각 규칙:

- 카드 하단 gradient
- 2행 × 4칸 고정 슬롯
- `font-variant-numeric: tabular-nums`
- 슬롯별 고정 폭
- 1행: 흰색 굵은 글자 + dark shadow
- 2행: 어두운 글자 + 밝은 stroke / shadow
- 작은 카드에서도 열 위치가 흔들리지 않도록 percentage 기반 고정 slot 사용

missing 규칙:

- 값이 없으면 해당 슬롯은 완전히 빈 칸
- 값이 없으면 아이콘도 만들지 않음
- `▶`, `♥`, `●`, `↻` 단독 노출 금지
- `0` 임의 생성 금지
- `-` 반복 placeholder 금지
- 게시일만 있는 경우 metrics 영역을 띄우지 않음
- 실제 성과값이 하나 이상 있을 때 게시일을 보조 슬롯으로 함께 표시 가능

### 4.3 Grid quick save

v0.9.7 기준:

- 좌측 상단 24px 원형 버튼
- download SVG 14px
- 얇은 밝은 테두리
- 낮은 불투명도 dark background
- 썸네일보다 먼저 눈에 띄지 않게 함

상태:

```text
기본   download icon
진행   spinner
성공   ✓
실패   !
```

일정 시간이 지나면 기본 아이콘으로 복귀한다.

## 5. Grid 수치 저장

확장프로그램 저장공간과 공유하지 않는다.

북마클릿 전용 최소 구조:

```text
shortcode
├─ username
├─ type
├─ postedAt
├─ views
├─ likes
├─ comments
├─ reposts
├─ updatedAt
└─ history
   └─ { t, v }
```

현재 저장소는 북마클릿 전용 `localStorage`를 사용한다.

Grid 수집 원칙:

- 화면 주변 카드부터 낮은 동시성으로 원본 정보 확인
- 무제한 병렬 요청 금지
- 최근 확인 데이터는 짧은 시간 재사용
- 성공적으로 확인된 값만 store에 반영
- 실패한 값 추정 금지

## 6. 파생 지표

### 참여율 ER

```text
(좋아요 + 댓글 + 재게시) / 조회수 × 100
```

조건:

- 조회수 > 0
- 좋아요 / 댓글 / 재게시가 모두 확인되어야 함
- 조건이 부족하면 missing

### 24시간

history snapshot 중:

- 현재 기준 18~32시간 전
- 24시간에 가장 가까운 snapshot 사용
- 현재 조회수가 과거 snapshot보다 작으면 계산하지 않음

### 계정대비

같은 계정 최근 확인 게시물:

- 현재 콘텐츠 제외
- 최대 20개
- 최소 5개 필요
- 조회수 중앙값 계산
- 현재 조회수 / 중앙값

표본 부족 시 missing.

## 7. Reel UI

Instagram 기본 우측 action rail은 절대 건드리지 않는다.

표시 대상:

- 조회수
- 참여율
- 24시간
- 계정대비
- 게시일

노출 규칙:

- 조회 / ER / 24h / 계정대비 중 실제 성과값이 하나 이상 있어야 overlay 표시
- 게시일만 단독 노출 금지
- 성과값이 있을 때만 게시일을 보조 정보로 추가
- 큰 박스형 panel 금지
- 텍스트 중심 overlay
- `tabular-nums`
- 영상 배경 위 가독성을 위한 강한 text shadow 허용

위치:

- 우측 action rail과 분리
- 본문 / 하단 navigation을 피하는 좌측 안전영역

## 8. RI launcher

v0.9.7 기준:

- 추상 research SVG 대신 `RI` 문자 사용
- 작은 원형 버튼
- 기본 화면에서는 우측 하단 안전영역
- Reel에서는 좌측 안전영역
- 콘텐츠보다 먼저 보이지 않는 낮은 contrast
- sheet가 열리면 숨김
- sheet가 닫히면 다시 표시

## 9. RI 간단 보기

기본 UI는 **작은 bottom dock**이다.

v0.9.7 기준:

- 좌우 8px margin
- compact에서는 grabber 숨김
- header 34px
- action 34px
- 최대 높이 118px
- 실제 수치가 없으면 수치 strip 자체를 제거해 더 낮아짐
- 저장 방식 텍스트는 기본 화면에서 숨김

구조:

```text
@계정 · 유형                  게시일      ×
[실제 핵심 수치가 있을 때만]
저장                                  상세   •••
```

핵심 수치 strip 후보 우선순위:

```text
조회 → 좋아요 → 댓글 → ER → 24h → 계정대비
```

최대 4개만 표시한다.

게시일은 KPI가 아니라 작은 metadata다.

동작 계층:

1. 저장 = primary
2. 상세 = secondary
3. 관리 = tertiary
4. 닫기

## 10. 저장 선택 UI

Grid quick save와 RI compact의 저장은 같은 선택 체계를 사용한다.

Reel / 영상:

```text
영상      음원
이미지    3개 모두
```

사진:

```text
원본 사진
```

슬라이드:

```text
슬라이드 전체
```

규칙:

- 중앙 modal 금지
- 전체 화면 dim 금지
- 누른 버튼 가까이에 compact floating menu
- bottom navigation 침범 금지
- 선택 후 즉시 닫기

## 11. 상세 Research UI

상세는 사용자가 `상세`를 눌렀을 때만 열린다.

탭:

```text
요약 | 콘텐츠 | 댓글 | 분석 | 미디어
```

### 11.1 공통 레이아웃

v0.9.7 기준:

- fixed `68vh` 높이 금지
- `height: auto`
- 최대 높이만 72vh 제한
- 내용이 짧으면 내용만큼만 열림
- 내용이 많으면 body만 scroll
- 큰 빈 검은 공간 금지
- card / KPI / row density 통일
- 미연결 기능도 최종 정보 구조 안에서 작은 상태 card로 표현

### 11.2 요약

성과 KPI:

- 조회수
- 좋아요
- 댓글
- 재게시
- 참여율
- 24시간
- 계정대비

게시일은 KPI가 아니라 콘텐츠 정보 영역에 표시.

콘텐츠 정보:

- 계정
- 유형
- 게시일
- shortcode
- 저장 방식

### 11.3 콘텐츠

구조:

- 본문
- 해시태그
- 언급 계정
- STT 전체
- 시간대별 문장
- OCR 문구
- OCR 노출 시간
- OCR 위치

기능 미연결 시:

- 큰 빈 패널 금지
- `미수집` 상태 card 사용

### 11.4 댓글

향후 데이터:

- 전체 댓글 수
- 실제 수집 댓글 수
- 답글 수
- 질문
- 구매의도
- 긍정
- 부정 / 불만
- 반론
- 팁 / 정보
- 원문 / 답글

missing UI 규칙:

- 아직 연결되지 않은 `수집`, `답글` 값을 `—`로 만들지 않음
- 실제 전체댓글 값이 있으면 그것만 표시
- 나머지는 상태 card로 설명

### 11.5 분석

구조:

- 시작 훅
- 첫 핵심 메시지
- 도입
- 전개
- 핵심
- 마무리
- CTA
- 강조 문구
- 숫자
- 가격
- 성과 특징
- 콘텐츠 특징
- 댓글 반응 특징

### 11.6 미디어

영상:

- 영상
- 음원
- 이미지

사진:

- 원본 사진

슬라이드:

- 슬라이드 전체

현재 콘텐츠 유형과 무관한 저장 버튼은 표시하지 않는다.

## 12. 전역 관리

`•••` 진입 구조:

```text
관리
├─ 저장
├─ 데이터
├─ 리서치 설정
└─ 업데이트

시스템
├─ 진단 복사
└─ RI 종료
```

원칙:

- 기본 콘텐츠 화면에 전역 관리 기능을 펼쳐두지 않음
- 목록형 UI
- 현재 값은 우측 작은 value 영역
- 하위 화면이 있으면 chevron
- 미구현 항목은 disabled / 상태 텍스트로 표현

### 저장

- 기본 다운로드
- 지정 폴더
- 매번 선택

### 데이터

- 수집 콘텐츠 수
- snapshot 수
- 계정 수

### 리서치 설정

- 댓글
- STT
- OCR
- 분석

## 13. Feed / Post

Instagram 기본 UI를 유지한다.

최종 목표:

- 성과정보 인접 위치에 최소 추가 지표
- 참여율
- 24시간
- 계정대비
- 게시일

Feed에 별도의 대형 RI panel을 상시 추가하지 않는다.

Grid / Reel / Research UI 실기기 확정 후 Feed DOM 위치를 연결한다.

## 14. 알림 / 작업 상태

- 지속적인 하단 Activity / Toast 금지
- `AbortError`는 정상 취소이므로 무알림
- Grid 저장 진행은 해당 카드 버튼에서 표시
- RI UI가 열려 있으면 상태는 내부 표시
- 실제 오류만 상단에 짧은 임시 알림

## 15. 저장 규칙

영상 / Reel:

- 영상
- 음원
- 이미지
- 3개 모두

사용자가 고른 항목만 저장한다.

사진:

- 원본 사진 저장

슬라이드:

- 전체 원본 개별 저장

Reel 이미지:

1. explicit cover가 있으면 실제 cover 저장
2. 없으면 영상의 정확한 0.000초 첫 표시 프레임 생성

금지:

- 대표 2초 임의 프레임
- MediaRecorder fallback
- 실시간 길이만큼 녹화

영상 저장 성공 기준:

- 소리 포함 정상 MP4

## 16. 실기기 검증 원칙

- Android Edge + Instagram 모바일 웹 기준
- 실기기 확인 전 PASS 금지
- 기능이 된 것처럼 추정하지 않음
- 한 번에 테스트 하나

현재 v0.9.7 첫 테스트는 Grid UI다.

확인 항목:

- missing 아이콘 단독 노출이 사라졌는지
- 실제 값만 고정 slot에 보이는지
- 게시일-only 카드가 metrics를 띄우지 않는지
- 24px quick save가 덜 방해되는지
- 스크롤 시 카드와 지표가 함께 움직이는지

다음 단계는 Grid 확인 후에만 진행한다.

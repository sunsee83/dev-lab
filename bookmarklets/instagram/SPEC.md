# Instagram RI — Specification

현재 기준: **v0.9.6**

이 문서는 Instagram 모바일 웹용 RI 북마클릿의 UI, 수치, 저장, 데이터, 검증 기준을 정의한다.

## 1. 제품 원칙

1. Instagram 콘텐츠가 항상 1순위다.
2. RI는 화면 위에 별도 앱을 덮는 방식이 아니라 Instagram 맥락 안에 최소한으로 결합한다.
3. Grid / Reel / Feed / Research UI를 각각 따로 디자인하지 않고 하나의 정보 체계로 운영한다.
4. 실제 데이터가 있는 곳에서는 수치를 적극적으로 보여주고, 없는 값을 `0`이나 `-`로 꾸며서 채우지 않는다.
5. 기본 화면은 작고, 상세 화면은 사용자가 직접 열 때만 확장한다.
6. PASS / WAIT / FAIL 같은 개발 진단 UI를 일반 화면에 노출하지 않는다.
7. Instagram native UI를 제거하거나 재배치하지 않는다.
8. Grid의 3-column 크기와 행 높이를 변경하지 않는다.
9. 저장 / 수치 / 댓글 / 분석은 shortcode를 공통 identity로 사용한다.
10. Android Edge 실기기에서 확인하기 전 PASS 처리하지 않는다.
11. `reels-inspector/**`는 읽기 전용 참고자료이며 수정·삭제·정리·커밋하지 않는다.

## 2. 파일 / 런타임 원칙

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
- `current.js`는 가능한 한 평문 JS 본체를 유지한다.
- 북마크 주소는 기능 업데이트마다 교체하지 않는다.
- `RI 업데이트`가 GitHub 최신 `current.js`를 받아 캐시를 교체한다.
- 본체 정상 실행 시 Loader 업데이트 버튼은 숨긴다.
- 본체 실행 실패 시에만 Loader 버튼을 비상 복구용으로 사용한다.

GitHub 또는 bookmark URL에 저장하지 않는 값:

- API key
- password
- login token
- access / refresh token
- session cookie
- 인증 세션 값

## 3. 전체 UI 아키텍처

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
      ├─ 열린 RI sheet 내부
      └─ 실제 오류만 임시 알림
```

UI 우선순위:

```text
Instagram 콘텐츠
> 실제 수치 / 실제 연구 결과
> 현재 작업
> 저장
> 상세 리서치
> 설정 / 진단
```

## 4. v0.9.6 UI 설계 기준

v0.9.5의 문제는 팝업 외형을 줄이는 데 치우쳐 Grid 수치, Reel 수치, 상세 탭, 전역 관리가 하나의 제품 UI로 연결되지 않은 것이었다.

v0.9.6부터 다음을 하나의 UI 시스템으로 본다.

- Grid의 항상 보이는 비교 정보
- Reel의 항상 보이는 핵심 정보
- RI launcher
- compact bottom sheet
- 상세 5탭
- 저장 floating menu
- 전역 관리
- 데이터 상태

기능이 아직 미연결이어도 최종 정보 구조와 레이아웃은 먼저 고정한다.

## 5. Grid UI

### 5.1 DOM 구조

Grid UI는 Instagram 카드 anchor 내부에 직접 부착한다.

```text
Instagram card anchor [position: relative]
└─ RI card UI [absolute inset: 0]
   ├─ quick save [좌측 상단]
   └─ metrics [하단]
      ├─ row 1
      └─ row 2
```

금지:

- fixed global card overlay
- 스크롤 좌표를 계속 다시 계산해 overlay를 이동하는 방식
- 카드 폭 / 높이 / 3-column 구조 변경
- Instagram native Reel / carousel 아이콘 제거
- 과도한 inline style mutation

Instagram SPA의 DOM 재사용 대응:

- 가벼운 카드 재스캔 허용
- 현재 유효한 Grid anchor를 다시 판정
- 더 이상 Grid 카드가 아닌 anchor의 RI UI 제거
- 클릭 순간 현재 anchor `href`에서 shortcode를 다시 읽음

### 5.2 Grid metrics

`reels-inspector`의 검증된 표시 구조를 읽기 전용으로 참고해 북마클릿용으로 다시 구현한다.

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
- 1행: 흰색 굵은 글자 + 강한 dark shadow
- 2행: 어두운 글자 + 밝은 stroke / shadow
- 작은 카드에서도 열 간 위치가 흔들리지 않도록 absolute/fixed slot percentages 사용

missing 규칙:

- 값이 없으면 해당 슬롯을 빈 칸으로 둔다.
- `0`을 임의 생성하지 않는다.
- `-` placeholder를 반복해서 보여주지 않는다.
- 카드에서 표시할 수 있는 실제 값이 하나도 없을 때만 metrics 영역 전체를 숨긴다.

### 5.3 Grid quick save

- 좌측 상단 27~28px 수준 원형 touch target
- 단순 download SVG
- 얇은 밝은 테두리
- 약한 반투명 dark background
- 썸네일보다 버튼이 먼저 보이지 않도록 대비 제한

상태:

```text
기본   download icon
진행   spinner / …
성공   ✓
실패   !
```

일정 시간이 지나면 기본 아이콘으로 복귀한다.

## 6. Grid 수치 수집 / 저장

확장프로그램 저장공간과 공유하지 않는다.

북마클릿 전용 최소 저장 구조:

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

현재 v0.9.6은 `localStorage`의 북마클릿 전용 metric store를 사용한다.

Grid에서는 화면 주변 카드부터 낮은 동시성으로 원본 정보를 확인한다.

- 무제한 병렬 요청 금지
- 최근 확인 데이터는 짧은 시간 재사용
- 성공적으로 확인된 값만 store에 반영
- API 확인이 실패한 카드의 값을 임의 추정하지 않음

## 7. 파생 지표

### 참여율 ER

```text
(좋아요 + 댓글 + 재게시) / 조회수 × 100
```

- 조회수 > 0 필요
- 좋아요 / 댓글 / 재게시 값이 모두 확인된 경우에만 계산
- 필요한 값이 빠지면 missing

### 24시간

실제 history snapshot 중:

- 현재 시점 기준 18~32시간 전
- 24시간에 가장 가까운 snapshot 사용
- 현재 조회수가 과거 snapshot보다 작으면 계산하지 않음

표시값은 해당 snapshot 이후 증가율이다.

### 계정대비

같은 계정의 최근 확인 게시물:

- 현재 콘텐츠 제외
- 최대 20개
- 최소 5개 필요
- 조회수 중앙값 계산
- 현재 조회수 / 중앙값

표본이 부족하면 missing이다.

## 8. Reel 화면 UI

Instagram 기본 우측 action rail은 절대 건드리지 않는다.

RI 핵심 지표는 영상 내용과 본문 / navigation을 피하는 좌측 안전영역을 사용한다.

표시 대상:

- 조회수
- 참여율
- 24시간
- 계정대비
- 게시일

원칙:

- 실제 값이 있는 항목만 렌더링
- 큰 박스나 panel 금지
- 텍스트 중심 overlay
- `tabular-nums`
- 강한 text shadow로 영상 배경 위 가독성 확보

RI launcher도 Reel에서는 우측 action rail과 분리한다.

## 9. Feed / Post UI

Instagram 기본 Feed/Post UI를 유지한다.

최종 목표는 성과 정보 인접 위치에 다음만 최소 추가하는 것이다.

- 참여율
- 24시간
- 계정대비
- 게시일

Feed에 별도의 상시 대형 RI panel을 붙이지 않는다.

**v0.9.6에서는 Feed/Post 실제 부착 위치와 DOM 안정성은 아직 실기기 확정 전이다.** Grid / Reel / Research UI를 먼저 확정한 뒤 연결한다.

## 10. 공통 RI launcher

기본:

- 작은 원형 research icon
- 우측 하단 안전영역
- 투명에 가까운 배경
- 콘텐츠보다 먼저 눈에 띄지 않음

Reel:

- 좌측 안전영역으로 이동
- Instagram 우측 action rail 침범 금지

Sheet 열림:

- launcher 숨김
- sheet 닫힘 시 재표시

## 11. RI 간단 보기

기본 UI는 작은 **edge-to-edge bottom sheet**다.

좁은 floating card 안에 버튼을 몰아넣지 않는다.

구조:

```text
grabber
@계정 · 유형                                ×

[실제 핵심 수치가 있을 때만 compact strip]

저장            현재 저장 방식       상세   •••
```

핵심 수치 strip 후보:

- 조회
- ER
- 24h
- 계정대비
- 게시일

실제 값이 없는 항목은 생성하지 않는다.

동작 계층:

1. `저장` = 대표 primary action
2. `상세` = research workspace 진입
3. `•••` = 전역 관리
4. `×` = 닫기

작업 상태는 작업 중 / 성공 / 오류가 있을 때만 sheet 안에 짧게 표시한다.

## 12. 저장 선택 UI

Grid quick save와 RI compact sheet의 저장은 같은 선택 체계를 사용한다.

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

- 전체 화면 modal 금지
- dimmed full screen 금지
- 누른 버튼 근처 compact floating menu
- Instagram bottom navigation 침범 금지
- 선택 후 즉시 menu 닫기

## 13. 상세 Research UI

상세는 사용자가 `상세`를 눌렀을 때만 열린다.

탭:

```text
요약 | 콘텐츠 | 댓글 | 분석 | 미디어
```

### 13.1 공통 레이아웃

- bottom sheet expanded mode
- 상단 header 고정
- tabs 한 줄 가로 스크롤 가능
- body만 세로 스크롤
- 큰 빈 검은 공간 금지
- card / KPI / row의 density를 통일
- 미연결 기능도 최종 정보 구조 안에서 작은 상태 카드로 표현

### 13.2 요약

기본 성과:

- 조회수
- 좋아요
- 댓글
- 재게시

파생 성과:

- 참여율
- 24시간
- 계정대비
- 게시일

콘텐츠 identity:

- 계정
- 유형
- shortcode
- 저장 방식

표현:

- 상단 compact KPI grid
- 하단 identity rows
- 값이 없는 KPI는 억지로 `0` 처리하지 않음

### 13.3 콘텐츠

UI 구조를 미리 고정한다.

```text
본문
├─ 전체 본문
├─ 해시태그
└─ 언급 계정

음성
├─ 전체 STT
└─ 시간대별 문장

화면 글자
├─ OCR 문구
├─ 표시 시간
└─ 화면 위치
```

아직 데이터가 없으면 각 영역 안에서 `미수집` 상태만 짧게 표시한다.

### 13.4 댓글

상단 요약:

- 전체 댓글
- 실제 수집
- 답글

반응 분류:

- 질문
- 구매의도
- 긍정
- 부정 / 불만
- 반론
- 팁 / 정보

원문:

- 댓글
- 답글

아직 수집하지 않았더라도 이 정보 구조는 유지한다.

### 13.5 분석

시작부:

- 시작 훅
- 첫 핵심 메시지

구성:

- 도입
- 전개
- 핵심
- 마무리

표현 / 전환:

- CTA
- 강조 문구
- 숫자
- 가격

종합:

- 성과 특징
- 콘텐츠 특징
- 댓글 반응 특징

### 13.6 미디어

현재 콘텐츠 유형에 맞는 항목만 표시한다.

Reel / 영상:

- 영상
- 음원
- 이미지 / 실제 cover / 0.000초 첫 프레임

사진:

- 원본 사진

슬라이드:

- 전체 개별 저장

## 14. 전역 관리 UI

`•••`는 설정 타일 팝업이 아니라 목록형 관리 entry다.

```text
RI 관리
├─ 관리
│  ├─ 저장
│  ├─ 데이터
│  ├─ 리서치 설정
│  └─ 업데이트
│
└─ 시스템
   ├─ 진단 복사
   └─ RI 종료
```

목록 row 구성:

- 좌측 작은 icon
- 중앙 label + 설명
- 우측 현재 값 / 상태
- 하위 화면이면 chevron

### 저장

```text
기본 다운로드
지정 폴더
매번 선택
```

- 현재 선택은 check
- 지정 폴더 handle이 있으면 폴더명 표시

### 데이터

현재 최소 UI:

- 저장된 콘텐츠 수
- snapshot 수
- 계정 수

향후:

- History
- JSON
- CSV

### 리서치 설정

최종 항목:

- 댓글
- STT
- OCR
- 분석

아직 미연결이면 disabled / 향후 상태로 표시한다.

### 업데이트

- 현재 버전 표시
- `RI 업데이트` 실행
- 정상 본체 실행 중 Loader 복구 버튼은 별도 노출하지 않음

## 15. 알림 / 작업 상태

기본 화면에 지속적인 하단 Activity / Toast를 띄우지 않는다.

`AbortError`:

- 파일 선택 취소
- 폴더 선택 취소

사용자의 정상 취소이므로 **아무 알림도 표시하지 않는다.**

Grid 저장:

- 해당 quick save 버튼 자체에서 진행 / 성공 / 실패 표시

RI sheet가 열려 있을 때:

- sheet 내부 activity row

실제 오류:

- 화면 상단에 작은 임시 알림

## 16. 저장 규칙

### Reel / 영상

사용자가 선택:

- 영상
- 음원
- 이미지
- 3개 모두

Grid 저장 버튼을 눌렀다고 자동으로 세 항목을 전부 저장하지 않는다.

영상 저장 성공 조건:

- 소리 포함 정상 MP4

금지:

- MediaRecorder fallback
- 실시간 재생 길이만큼 녹화
- 무음 MP4를 성공 처리

### Reel 이미지

1. Instagram explicit cover가 있으면 실제 cover
2. 없으면 영상의 정확한 0.000초 첫 표시 프레임

임의 2초 대표 프레임 금지.

### 사진

- 원본 사진 저장

### 슬라이드

- 전체 원본 개별 저장

## 17. 실기기 검증 순서

한 번에 하나만 검증한다.

### 첫 테스트 — Grid UI

1. `RI 업데이트`
2. 프로필 Grid 진입
3. 저장 버튼은 누르지 않음
4. Grid만 확인

확인 항목:

- 실제 값이 확보된 카드에 1행 수치가 표시되는가
- 파생 값이 확보되면 2행에 표시되는가
- missing 슬롯이 `-`로 도배되지 않는가
- 2행 × 4칸 고정 정렬이 유지되는가
- 수치가 thumbnail을 과도하게 가리지 않는가
- 스크롤할 때 수치와 카드가 함께 움직이는가
- Grid 3-column 크기와 행 높이가 변하지 않는가

이 테스트가 확인된 뒤 다음 UI를 하나씩 진행한다.

순서:

```text
Grid
→ Reel 핵심 지표
→ RI 간단 보기
→ 상세 5탭
→ 전역 관리
→ 저장 menu
→ Feed/Post 최소 지표
```

## 18. 현재 우선순위

### P0.5

전체 UI 시스템 실기기 확정.

### P0.6

- 수치 추출 fallback 강화
- metric/history 저장 안정화
- API 404 fallback

### P0.7

- Grid / Reel 실측 수치 안정화
- Feed/Post 최소 지표 연결

### 이후

- 지정 폴더 지속성 최종 검증
- cover / 0.000초 / 저장 속도 최종 검증
- 본문 / 댓글 / STT / OCR / 분석
- JSON / CSV / 기록 관리

## 19. PASS 기준

실기기에서 확인되기 전에는 PASS라고 기록하지 않는다.

최종 UI 기준:

- Instagram 원래 3열 Grid가 변하지 않는다.
- Grid 수치가 카드 내부에 붙어 흔들리지 않는다.
- 실제 수치가 확보된 경우 8-slot 구조가 보인다.
- missing 값을 placeholder로 화면에 반복 노출하지 않는다.
- Reel native action rail을 침범하지 않는다.
- RI compact sheet가 콘텐츠 감상을 과도하게 막지 않는다.
- 요약 / 콘텐츠 / 댓글 / 분석 / 미디어의 역할이 명확하다.
- 저장 / 데이터 / 설정 / 업데이트 / 진단이 상세 연구 탭과 섞이지 않는다.
- 사용자가 취소한 작업은 오류처럼 보이지 않는다.
- 영상 저장 성공은 소리 포함 정상 MP4다.

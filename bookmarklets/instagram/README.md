# Instagram RI Bookmarklet

현재 활성 버전: **v0.9.8**

## 활성 파일

```text
bookmarklets/instagram/
├─ README.md
├─ SPEC.md
├─ bookmarklet-url.txt
├─ bridge-stable.svg
└─ current.js
```

활성 파일은 정확히 5개만 유지한다. 과거 버전은 Git history로 관리한다.

`reels-inspector/**`는 읽기 전용 참고자료다. 수정·삭제·정리·커밋하지 않는다.

## 실행 / 업데이트

- `current.js`는 평문 JS 본체를 유지한다.
- `RI 업데이트`가 GitHub 최신 본체를 받아 localStorage 캐시를 교체한다.
- 기능 업데이트마다 북마크 주소를 교체하지 않는다.
- 본체 정상 실행 시 Loader 업데이트 버튼은 숨긴다.
- 본체 실행 실패 때만 Loader 버튼을 비상 복구용으로 사용한다.

## 제품 사용 전제 — v0.9.8부터 고정

RI는 일반 Instagram 감상 UI가 아니다.

사용자가 북마클릿을 직접 실행했다는 것은 **리서치 모드에 들어갔다는 뜻**으로 본다.

따라서 UI 우선순위는 다음과 같다.

```text
실제 리서치 정보
> 비교 가능성
> 현재 콘텐츠
> 저장 / 작업
> 설정 / 진단
```

평소 감상은 Instagram 앱/웹에서 하고, RI를 실행한 상태에서는 정보 밀도를 의도적으로 높인다.

핵심 원칙:

- 확보한 수치는 숨기지 않는다.
- 게시일도 핵심 비교 정보로 취급한다.
- Grid / Reel / Feed / RI 간단 보기 / 상세 탭에서 같은 핵심 지표 체계를 사용한다.
- 값이 없다고 `0`을 만들지 않는다.
- Grid에서 `-` placeholder를 반복 노출하지 않는다.
- 상세/Research UI에서는 미확인 값을 `확인중` 상태로 명시할 수 있다.

## 공통 핵심 8지표

RI가 사용하는 기본 성과 정보 세트는 고정한다.

```text
조회수 | 좋아요 | 댓글 | 재게시
ER     | 24h    | 계정대비 | 게시일
```

파생 지표:

- ER = `(좋아요 + 댓글 + 재게시) / 조회수 × 100`
- 24h = 실제 snapshot 중 18~32시간 범위에서 24시간에 가장 가까운 기록 사용
- 계정대비 = 같은 계정 최근 게시물 최대 20개 / 최소 5개 조회수 중앙값 대비 현재 조회수 배수

필요한 데이터가 부족하면 값을 추정하지 않는다.

## v0.9.8 — Research-first Metrics UI

### 1. Grid

`reels-inspector`에서 검증했던 좋은 구조를 계속 참고한다.

- Instagram 카드 anchor 내부 absolute attachment
- 2행 × 4칸 고정 슬롯
- 하단 gradient
- `font-variant-numeric: tabular-nums`
- 고정 슬롯 폭
- 강한 text shadow
- 좌측 상단 작은 원형 저장 버튼

표시:

```text
1행: ▶조회수 | ♥좋아요 | ●댓글 | ↻재게시
2행: ER | 24h | 계정대비 | 게시일
```

v0.9.7과 달리 **게시일만 확보돼도 게시일은 표시한다.**

값이 없는 슬롯은 빈 슬롯으로 남긴다. 아이콘-only placeholder나 `-`는 만들지 않는다.

### 2. Reel

Instagram 우측 action rail은 건드리지 않는다.

RI는 Reel 화면 상단 안전영역에 8지표를 **2행 × 4칸**으로 표시한다.

- 조회수
- 좋아요
- 댓글
- 재게시
- ER
- 24h
- 계정대비
- 게시일

값이 아직 없으면 해당 셀은 작은 대기 상태로 남는다. 게시일만 있다고 overlay 전체를 숨기지 않는다.

Instagram DOM에 이미 보이는 좋아요 / 댓글 / 재게시 수치는 API 결과가 부족할 때 native UI에서 보조 수집한다.

### 3. Feed / Post

Feed에서도 8지표를 같은 순서로 보여준다.

- 현재 보이는 `article`의 shortcode를 인식
- media 영역 안에 compact research strip 부착
- Instagram native UI는 제거하지 않음
- native 좋아요 / 댓글 / 재게시 / 게시일을 보조 수집
- API 데이터와 북마클릿 metric store를 함께 사용

### 4. RI 간단 보기

RI 버튼을 눌렀을 때 현재 콘텐츠의 8지표를 **2행 × 4칸**으로 모두 보여준다.

```text
@계정 · 유형                         ×

조회 | 좋아요 | 댓글 | 재게시
ER   | 24h    | 계정대비 | 게시일

저장      현재 저장 방식      상세   •••
```

간단 보기에서도 게시일을 숨기거나 최대 4개만 골라 표시하지 않는다.

### 5. 상세 5탭

```text
요약 | 콘텐츠 | 댓글 | 분석 | 미디어
```

각 탭에서도 상단에 동일한 8지표 세트를 유지한다.

즉 탭을 옮겨도 현재 콘텐츠 성과를 다시 찾을 필요가 없다.

- 요약: 8지표 + 콘텐츠 identity
- 콘텐츠: 8지표 + 본문 / 해시태그 / 언급 / STT / OCR
- 댓글: 8지표 + 댓글 분류 / 원문 / 답글
- 분석: 8지표 + 훅 / 구성 / CTA / 숫자 / 가격
- 미디어: 8지표 + 영상 / 음원 / 이미지 / 사진 / 슬라이드 저장

미연결 연구 기능은 큰 빈 화면 대신 작은 상태 카드로 표시한다.

### 6. 수치 추출 보강

기존 direct key 확인에 더해 중첩 Instagram media tree를 제한 깊이로 탐색한다.

확인 대상 예:

- `play_count`, `video_view_count`, `view_count`, `plays`
- `like_count`, `likes_count`
- `comment_count`, `comments_count`
- `repost_count`, `reshare_count`, `reposts_count`
- `taken_at`, `taken_at_timestamp`

Reel / Feed에서는 현재 DOM의 native action UI도 fallback으로 사용한다.

실패한 값을 임의 추정하지 않는다.

## 북마클릿 전용 수치 저장

확장프로그램 저장공간과 공유하지 않는다.

```text
shortcode
├─ username
├─ type
├─ postedAt
├─ views
├─ likes
├─ comments
├─ reposts
├─ apiAt
├─ nativeAt
├─ updatedAt
└─ history[]
   └─ { t, v }
```

- 화면 주변 콘텐츠부터 낮은 동시성으로 확인
- API 요청 동시성 제한
- 최근 API 확인 데이터는 재사용
- 조회수 snapshot은 북마클릿 전용 history에 저장

## 저장 엔진 기준

Android Edge 실기기에서 이전에 확인된 기반 기능:

- Reel 소리 포함 영상 저장
- Reel 음원 단독 저장
- Reel 이미지 저장
- 단일 사진 원본 저장
- 캐러셀 전체 개별 저장
- 기본 다운로드 / 지정 폴더 / 매번 선택
- shortcode 기반 짧은 파일명
- MediaRecorder 실시간 재인코딩 사용 안 함

영상 저장 성공은 **소리 포함 정상 MP4** 기준이다.

Reel 이미지:

1. explicit cover가 있으면 실제 cover 저장
2. 없으면 영상의 정확한 0.000초 첫 표시 프레임 생성

## 알림 정책

- 지속적인 하단 Activity / Toast 금지
- `AbortError`는 정상 취소이므로 무알림
- Grid 저장 진행은 해당 카드 버튼 자체에서 표시
- RI가 열려 있으면 작업 상태는 RI 내부에 표시
- 실제 오류만 상단에 짧게 표시

## 현재 우선순위

### P0.5 — Research UI 실기기 확정

v0.9.8에서 먼저 다음을 확인한다.

- Grid 8지표 정렬 / 밀도 / 게시일 표시
- Reel 8지표 위치 / native 수치 fallback
- Feed 8지표 부착 위치
- RI 간단 보기 8지표 밀도
- 상세 5탭 공통 8지표와 정보 구조

실기기 확인 전 PASS 처리하지 않는다.

### 이후

- API 404 fallback 보강
- 지정 폴더 지속성 최종 검증
- 표지 / 0.000초 / 저장 속도 최종 검증
- 본문 / 댓글 / STT / OCR / 분석 / JSON / CSV

## 다음 실기기 확인

한 번에 하나만 확인한다.

첫 테스트는 **Grid Research UI**다.

1. `RI 업데이트`
2. 프로필 Grid 진입
3. 저장 버튼 / RI 버튼은 누르지 않음
4. 3~5초 기다림
5. Grid 화면 한 장 확인

판정 항목:

- 게시일이 있는 카드에서 게시일이 항상 보이는지
- 확보된 조회 / 좋아요 / 댓글 / 재게시가 고정 슬롯에 표시되는지
- ER / 24h / 계정대비가 확보되면 2행 고정 위치에 표시되는지
- 값 없는 슬롯에 `-`나 아이콘-only placeholder가 생기지 않는지
- 스크롤 시 카드와 지표가 함께 움직이는지

이 테스트가 끝난 뒤에 Reel → Feed → RI 간단 보기 → 상세 탭 순서로 한 번에 하나씩 확인한다.

## 파일 관리

- `README.md` → 현재 활성 상태 / 변경 이유 / 실기기 검증 순서
- `SPEC.md` → 제품 전체 구조 / 고정 UI / 수치 / 데이터 / 저장 규칙
- `reels-inspector/**` → 읽기 전용 참고자료

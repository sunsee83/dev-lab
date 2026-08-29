# Instagram Content Research Tool — Project Plan

제품 목적·범위·장기 방향만 유지합니다. 현재 버전/진행=`STATUS.md`, 구현 owner=`ARCHITECTURE.md`, 보존선=`BASELINE.md`.

## 1. 목적

Android Instagram mobile web를 그대로 사용하면서 중요 지표를 빠르게 확인하고 필요한 원본/상세 데이터를 확보하는 **모바일 리서치 확장도구**입니다.

```text
발굴 → 비교 → 콘텐츠 확인 → 원본 확보 → 상세 조사 → 분석
```

대상:

- Reel / Feed Video / Photo / Carousel
- Caption / hashtags / mentions
- Comments / replies
- 공개 성과 지표 / 계정 상대 비교
- 원본 media acquisition
- 향후 STT / OCR / AI research

즐겨찾기·메모 같은 별도 콘텐츠 관리 기능보다 Instagram 위 리서치 편의성을 우선합니다.

## 2. UI 역할

```text
Grid               = 빠른 발굴/비교 + quick-save
Reel Overlay       = 시청 방해 없는 핵심 파생지표
Global RI          = 상세 리서치 진입
Research Workspace = 지표/콘텐츠/댓글/분석/미디어/설정
```

- Instagram native action을 제거/중복하지 않음
- 위치는 `[전체 화면 | 카드·썸네일 | Reel 영상 | Workspace 내부 · 위치]`로 정의
- 한손 조작, 최소 터치, 하단 nav/Reel rail/caption 충돌 회피
- 실제 좌표는 Android Edge evidence 후 승인

## 3. 제품 데이터 흐름

```text
Instagram
→ Identity
→ Extractor
→ Normalizer
→ Verified Store
→ History / Metrics / media[]
→ Grid / Reel / Research Workspace
```

한 identity에 동일 콘텐츠 데이터만 결합하고 source/confidence/conflict를 유지합니다. UI별 parser/formula 복제와 missing=`0` 추정은 금지합니다.

## 4. Metrics

```text
ER = (likes + comments + reposts) / views × 100
24h = 실제 18–32h snapshot 중 24h에 가장 가까운 값
계정대비 = 동일 계정 최근 최대20개, 최소5개, views median 대비 배수
```

불충분하면 숫자를 만들지 않습니다.

## 5. Research Workspace

CONTENT:

```text
요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정
```

- **요약**: identity, views/likes/comments/reposts, ER, 24h, account relative, date
- **콘텐츠**: caption, hashtags, mentions, transcript, OCR
- **댓글**: thread, 질문/구매의도/반응/불만/반론/팁
- **분석**: 훅, 포맷, 구성, 전환 장치, CTA, 표현/신뢰 요소
- **미디어**: video, actual cover, photo, Carousel slides
- **설정**: 미디어별 save mode/directory + update

CONTENT identity가 없으면 빈 6탭 대신 GLOBAL RI Home/Settings를 사용합니다.

## 6. Comments / Analysis

댓글:

```text
Instagram comments
→ thread 유지
→ dedupe
→ low-value filter
→ Research Score
→ top candidate
→ AI 분류/요약
```

분석 목표:

```text
포맷
→ 문제제기형 | 리스트형 | Before/After | 튜토리얼 | 리뷰 | 스토리 | 비교 | 뉴스/정보

전환 장치
→ 댓글 유도 | 저장 유도 | 공유 유도 | 프로필 이동 | 링크 클릭 | 구매 | DM

보조
→ 훅 | CTA 위치 | 신뢰 장치 | 감정/긴급성
```

AI 이전에 deterministic extraction/filtering을 먼저 적용하고 근거 데이터가 없으면 분석값을 만들지 않습니다.

## 7. STT / OCR

```text
browser
→ analysis server
→ STT / OCR
→ timestamp/coordinate alignment
→ AI research
```

- Instagram login cookie를 서버로 보내지 않음
- 전체 영상을 기본적으로 multimodal AI에 직접 보내지 않음
- FFmpeg + timestamped STT + OCR coordinate/confidence 먼저 구조화
- async job 우선

## 8. Media / Storage

미디어 성격에 맞게 저장 설정을 분리합니다.

```text
영상       → directory | default | prompt
사진·표지  → directory | default | prompt
슬라이드   → directory | default | prompt
```

- 각 profile은 별도 폴더 지정 가능
- v1 전역 정책은 v2 첫 migration에서 세 profile에 승계
- Carousel은 ZIP 금지, individual files
- prompt Carousel은 destination 1회 선택
- 지정폴더 실패는 사용자에게 보이고 silent fallback 금지

향후 Library는 다운로드/리서치 핵심 흐름을 복잡하게 만들지 않는 범위에서 별도 검토합니다.

## 9. Roadmap

```text
v3.1  Core/Grid stabilization
v3.2  Mobile UI/Foundation + Reel context/metrics migration
v3.3  Content types / common media model
v3.4  Research detail data
v3.5  Comments/replies
v3.6  Research scoring/features
v4.0  Analysis server
v4.1  STT
v4.2  OCR
v4.3  STT/OCR alignment
v4.4  AI research
v5.0  MV3/extension packaging 검토
```

Migration:

```text
Foundation → UI/metrics → Identity/Extractor/Verified Store
→ common media[]/renderer → legacy removal → Research data → STT/OCR/AI
```

## 10. 계획 변경 규칙

1. 기존 결정 목적 확인
2. 유지 / 수정 / 추가 구분
3. `BASELINE.md`에서 `PRESERVE / REPLACE / REMOVE-APPROVED`
4. `STATUS.md` 순서 갱신
5. 구현/test/build/check
6. Android 항목은 실기기 확인 전 Unverified

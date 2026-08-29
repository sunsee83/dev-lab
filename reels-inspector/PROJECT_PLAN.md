# Instagram Content Research Tool — Project Plan

이 문서는 **제품 목적·범위·장기 방향**만 유지합니다. 현재 버전/진행률은 `STATUS.md`, 구현 owner는 `ARCHITECTURE.md`, 보존선은 `BASELINE.md`가 기준입니다.

## 1. 목적

Instagram 콘텐츠를 보면서 별도 앱을 오가지 않고 다음 흐름을 수행합니다.

```text
발굴
→ 비교
→ 콘텐츠 확인
→ 원본 확보
→ 상세 조사
→ 분석
→ 참고 소재 저장
```

대상:

- Reel / Feed Video / Photo / Carousel
- Caption / hashtags / mentions
- Comments / replies
- 공개 성과 지표 / 계정 상대 비교
- 원본 media acquisition
- 향후 STT / OCR / AI research
- 향후 content library

## 2. UI 역할

```text
Grid               = 발굴/비교
Grid media action  = 빠른 저장
Reel Overlay       = 현재 콘텐츠 핵심 파생지표
Global RI          = 상세 조사 진입
Research Workspace = 요약/콘텐츠/댓글/분석/미디어/설정
```

Grid에 상세설정과 분석 기능을 반복 배치하지 않습니다. Instagram native action을 제거하거나 불필요하게 복제하지 않습니다.

## 3. 제품 데이터 흐름

목표 architecture:

```text
Instagram
→ Identity
→ Extractor
→ Normalizer
→ Verified Store
→ History / Metrics / media[]
→ Grid / Reel / Research Workspace
```

핵심 규칙:

- 한 콘텐츠 identity에 같은 콘텐츠의 metric/media만 결합
- source/confidence/conflict를 잃지 않음
- UI별 parser/formula 복제 금지
- missing을 `0`으로 만들지 않음

## 4. Metrics

```text
ER = (likes + comments + reposts) / views × 100
24h = 실제 18–32h snapshot 중 24h에 가장 가까운 값
계정 대비 = 동일 계정 최근 최대20개, 최소5개, views median 대비 배수
```

불충분하면 숫자를 만들지 않고 `—`를 사용합니다.

## 5. Research Workspace

CONTENT 정보구조는 유지합니다.

```text
요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정
```

목표 내용:

- **요약**: identity, views/likes/comments/reposts, ER, 24h, account relative, date
- **콘텐츠**: caption, hashtags, mentions, transcript, OCR
- **댓글**: 질문, 구매의도, 후기, 불만, 반론, 팁, 아이디어
- **분석**: Hook, CTA, 강조, 숫자/가격, 구조, 발화
- **미디어**: video, actual cover, photo, Carousel slides
- **설정**: global save mode/directory/update

콘텐츠 identity가 없는 화면은 빈 6탭 대신 GLOBAL RI Home/Settings를 사용합니다.

## 6. Comments / Analysis

댓글 처리 방향:

```text
Instagram comments
→ thread 유지
→ dedupe
→ low-value filter
→ Research Score
→ 상위 candidate
→ AI 분류/요약
```

AI category 예:

`질문 / 구매의도 / 긍정 / 부정 / 불만 / 반론 / 팁 / 정보 / 콘텐츠 아이디어`

AI 이전에 deterministic filtering/scoring을 먼저 적용합니다.

## 7. STT / OCR

장기 구조:

```text
browser
→ analysis server
→ STT / OCR
→ timestamp/coordinate 기반 alignment
→ AI research
```

원칙:

- Instagram 로그인 cookie를 분석 서버로 전달하지 않음
- 전체 영상을 기본적으로 multimodal AI에 직접 보내지 않음
- FFmpeg + timestamped STT + OCR coordinate/confidence를 먼저 구조화
- 서버는 async job 형태를 우선

## 8. Media / Storage

전역 저장정책 하나를 video/cover/photo/carousel에 공통 적용합니다.

```text
default Downloads
지정 폴더
매번 선택
```

Carousel은 ZIP이 아니라 개별 파일입니다. 지정폴더 실패는 사용자에게 보이고 silent fallback하지 않습니다.

향후 Library는 다운로드 시스템과 분리된 **research material metadata** 저장소로 설계합니다.

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

Migration 순서:

```text
Foundation
→ UI/metrics
→ Identity/Extractor/Verified Store
→ common media[] / renderer
→ legacy removal
→ Research data
→ STT/OCR/AI
```

## 10. 계획 변경 규칙

방향을 바꿀 때 기존 문서를 통째로 버리지 않습니다.

1. 기존 결정의 목적 확인
2. 유지 / 수정 / 추가 구분
3. 기존 기능은 `BASELINE.md`에서 `PRESERVE / REPLACE / REMOVE-APPROVED` 분류
4. `STATUS.md`의 다음 순서 갱신
5. 구현/테스트
6. 실제 결과를 `STATUS.md`에 기록

장기 계획은 자주 바꾸지 않고, 실행 상태는 `STATUS.md`에서 짧게 관리합니다.

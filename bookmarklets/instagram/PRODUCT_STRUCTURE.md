# Instagram RI — Product Structure

이 문서는 현재 구현과 앞으로의 제품 구조만 남긴 가이드입니다. 과거 실험 방식과 폐기된 버전별 파일 구조는 제외합니다.

## 현재 원칙
- Instagram 원래 3열 Grid와 native UI를 최대한 유지한다.
- missing / 미확인 값은 0으로 취급하지 않는다.
- 콘텐츠 identity(shortcode)를 저장·지표·댓글·분석의 공통 키로 사용한다.
- 수집과 분석을 분리한다.
- 저장 기능을 먼저 안정화한 뒤 본문/지표/댓글/분석을 확장한다.
- 실행 본체는 `current.js` 하나만 유지한다.

## 실행 구조

```text
휴대폰 북마클릿
└─ bridge-stable.svg
   └─ GitHub main 최신 커밋 SHA 확인
      └─ 해당 SHA의 current.js 수신
         └─ postMessage
            └─ Instagram Blob script 실행
```

일반 기능 업데이트는 `current.js`만 교체한다. 버전별 실행 JS를 활성 폴더에 추가하지 않는다.

## UI 구조

```text
Instagram 모바일
└─ RI
   ├─ 프로필 3열 Grid
   │  └─ 콘텐츠 카드
   │     ├─ 콘텐츠 유형 [우측 위]
   │     ├─ 기본 지표 [하단 첫째 줄]
   │     ├─ 파생 지표 [하단 둘째 줄]
   │     └─ 저장 [좌측 아래]
   │        ├─ 영상 / Reel → 영상 + 음원 + 이미지
   │        ├─ 사진 → 원본 사진 1개
   │        └─ 캐러셀 → 전체 원본
   │
   ├─ Reel
   │  ├─ Instagram 기본 액션 [우측]
   │  └─ 리서치 지표 [좌측 아래]
   │
   ├─ Feed / 게시물
   │  └─ 추가 지표 [기본 성과정보 인접]
   │
   └─ 리서치 [하단]
      ├─ 간단 보기
      │  ├─ 계정명 [좌측 위]
      │  ├─ 콘텐츠 유형 [계정명 우측]
      │  ├─ 핵심 지표 [중앙]
      │  ├─ 데이터 상태 [중앙 아래]
      │  └─ 저장 [하단]
      │
      └─ 상세 보기
         ├─ 요약 [상단 메뉴]
         ├─ 콘텐츠 [상단 메뉴]
         ├─ 댓글 [상단 메뉴]
         ├─ 분석 [상단 메뉴]
         └─ 미디어 [상단 메뉴]
            ├─ 영상 저장
            ├─ 음원 저장
            ├─ 이미지 저장
            ├─ 사진 저장
            └─ 캐러셀 전체 저장
```

## 상태 정보
- PASS / PARTIAL / FAIL / WAIT 상태 표시는 유지한다.
- 현재 콘텐츠, 대상 선택 방식, 미디어 정보, 저장 위치, 저장 결과를 확인할 수 있어야 한다.
- 그리드 빠른 저장도 같은 상태창에 결과를 남긴다.

## 저장 동작
- 영상 저장은 소리 포함 정상 MP4다.
- 음원 저장은 별도 음원 파일이다.
- 영상 이미지는 실제 표지가 있으면 표지, 없으면 0.000초 첫 프레임이다.
- 단일 사진은 원본 1개를 저장한다.
- 캐러셀은 사진/영상/혼합 여부와 관계없이 원래 순서대로 전체 저장한다.
- 기본 다운로드 / 지정 폴더 / 브라우저 지원 시 매번 선택을 지원한다.
- 그리드 저장도 현재 저장 위치 설정을 그대로 사용한다.
- 상세 파일명 규칙은 `MEDIA_SAVE_RULES.md`를 기준으로 한다.

## 콘텐츠 데이터 구조

```text
Post Package
├─ identity
│  ├─ shortcode
│  ├─ URL
│  ├─ 작성자
│  ├─ 게시일
│  └─ 콘텐츠 유형
├─ media
│  ├─ video
│  ├─ audio
│  ├─ images[]
│  ├─ cover
│  └─ thumbnailSource
├─ text
│  ├─ caption
│  ├─ hashtags[]
│  └─ mentions[]
├─ metrics
│  ├─ views
│  ├─ likes
│  ├─ comments
│  ├─ reposts
│  └─ derived
├─ comments
│  ├─ comment
│  └─ replies[]
├─ savedFiles
│  ├─ video
│  ├─ audio
│  ├─ image
│  ├─ carousel[]
│  └─ savedAt
└─ research
   ├─ transcript
   ├─ OCR
   └─ analysis
```

## 개발 순서

```text
Phase 1  저장 안정화
├─ 영상
├─ 음원
├─ 이미지 / 첫 프레임
├─ 사진
├─ 캐러셀 전체
├─ 그리드 빠른 저장
├─ 지정 폴더
└─ 파일명 / identity 검증

Phase 2  콘텐츠 데이터
├─ caption
├─ hashtags / mentions
├─ 게시일 / 작성자
└─ 공개 metrics

Phase 3  댓글
├─ 댓글
├─ 답글
├─ 중복 제거
└─ 수집 범위 표시

Phase 4  리서치 분석
├─ STT
├─ OCR
├─ 댓글 분류
└─ 콘텐츠 분석
```

Phase 1이 실제 Android Edge에서 안정적으로 통과하기 전에는 이후 기능 때문에 저장 경로를 복잡하게 만들지 않는다.

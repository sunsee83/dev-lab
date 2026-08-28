# Instagram Content Research Tool — Code Structure

이 문서는 실제 코드를 **어디에 작성하고, 어떤 책임으로 나누며, 언제 파일을 분리할지** 정하는 구현 구조 기준입니다.

상위 기준:

- `PROJECT_PLAN.md` — 제품/데이터/UI/로드맵
- `STATUS.md` — 현재 배포/실기기 상태
- `GRID_BASELINE.md` — Grid Frozen UI 기준
- `tests/README.md` — 회귀/실기기 승인 기준
- `CODE_STRUCTURE.md` — 코드 파일 구조와 파일 관리 규칙

구조 변경 시 기존 설계를 먼저 검토하고, 관련 없는 승인 기능을 삭제하거나 과거 방식으로 되돌리지 않습니다.

---

# 1. 핵심 원칙

1. **파일 수를 늘리는 것이 목적이 아니다.**
   - 찾기 쉽고, 수정 범위가 작고, 다른 기능을 덜 깨뜨리는 구조가 목적입니다.
2. **Progressive Modularization**을 사용합니다.
   - 처음부터 목표 디렉터리 전체를 만들지 않습니다.
   - 실제 책임이 생길 때만 파일을 생성합니다.
3. **초기에는 약 10~15개의 의미 있는 소스 파일로 시작**합니다.
   - 과분할을 피하고, 필요할 때만 20~30개 수준으로 확장합니다.
4. **배포 파일은 계속 하나**입니다.
   - Tampermonkey 설치 대상은 `ri-retry.user.js` 하나입니다.
5. **최종적으로 `src/*`가 개발 원본, `ri-retry.user.js`는 build 결과물**이 됩니다.
6. **UI가 Instagram raw data를 직접 파싱하지 않습니다.**
7. **모든 UI가 동일 Verified Store를 읽습니다.**
8. **모든 다운로드는 하나의 Download Manager를 통과합니다.**
9. **metrics/store/normalizer는 가능한 한 DOM 비의존으로 유지**합니다.
10. **hotfix 파일, old 파일, backup 파일을 만들지 않습니다.**
    - 과거 버전은 Git history로 관리합니다.

---

# 2. 현재 단계의 실제 목표 구조

v3.2에서 바로 사용할 구조는 아래처럼 단순하게 시작합니다.

```text
reels-inspector/
├─ README.md
├─ PROJECT_PLAN.md
├─ STATUS.md
├─ GRID_BASELINE.md
├─ CODE_STRUCTURE.md
├─ .gitignore
│
├─ src/
│  ├─ main.js
│  │
│  ├─ core/
│  │  ├─ app.js
│  │  └─ capability.js
│  │
│  ├─ instagram/
│  │  ├─ identity.js
│  │  └─ extractor.js
│  │
│  ├─ store/
│  │  ├─ verified-store.js
│  │  └─ settings-store.js
│  │
│  ├─ metrics/
│  │  └─ metrics.js
│  │
│  ├─ media/
│  │  ├─ media-resolver.js
│  │  └─ download-manager.js
│  │
│  └─ ui/
│     ├─ grid.js
│     ├─ reel.js
│     ├─ ri-panel.js
│     └─ styles.js
│
├─ tests/
│  ├─ README.md
│  ├─ fixtures/
│  │  └─ core-cases.json
│  ├─ unit/
│  └─ regression/
│
├─ scripts/
│  ├─ build.mjs        # 실제 build 도입 시 생성
│  └─ check.mjs        # 실제 check 도입 시 생성
│
└─ ri-retry.user.js
```

**빈 폴더/빈 파일은 미리 만들지 않습니다.** 실제 코드가 들어가는 시점에 생성합니다.

---

# 3. 파일 역할

## `src/main.js`

앱 시작점입니다.

담당:

- subsystem 초기화
- route/observer 시작
- Store 연결
- Grid/Reel/RI Panel mount

금지:

- Instagram raw parsing
- 지표 계산 구현
- Blob/File System 저장 구현

---

## `src/core/app.js`

앱 공통 lifecycle과 event orchestration을 담당합니다.

예:

- route changed
- store changed
- settings changed
- refresh scheduling

특정 Instagram selector나 UI DOM 구조는 넣지 않습니다.

---

## `src/core/capability.js`

브라우저 기능 지원 여부를 runtime에서 판단합니다.

예:

- directory picker
- save picker
- File System Access
- IndexedDB
- clipboard
- download attribute

`Android`, `Edge` 같은 플랫폼명만 보고 지원 여부를 단정하지 않습니다.

---

## `src/instagram/identity.js`

`ContentIdentity`만 책임집니다.

- shortcode
- mediaId
- ownerId
- username
- mediaType
- productType
- canonicalUrl
- parent/child media
- slideIndex

다른 콘텐츠 identity가 충분히 확인되지 않은 상태에서 값을 합치지 않습니다.

---

## `src/instagram/extractor.js`

Instagram raw data 수집을 담당합니다.

현재 단계에서는 한 파일로 시작합니다.

포함 가능:

- fetch/XHR hook
- embedded JSON
- permalink JSON/meta
- DOM 보조 추출

단, 파일이 커지고 독립 책임이 명확해지면 아래처럼 분리합니다.

```text
instagram/
├─ identity.js
├─ extractors/
│  ├─ network.js
│  ├─ embedded.js
│  ├─ permalink.js
│  └─ dom.js
└─ normalizer.js
```

초기부터 이 구조를 강제하지 않습니다.

---

## `src/store/verified-store.js`

프로젝트 핵심 데이터 Store입니다.

담당:

- source/confidence/status
- conflict 처리
- identity 연결
- update/subscribe
- 검증값 보호

UI는 Store 내부 구현을 우회해 별도 데이터 캐시를 만들지 않습니다.

---

## `src/store/settings-store.js`

현재 콘텐츠와 무관한 **전역 설정**을 관리합니다.

초기 대상:

- download mode
- selected directory handle/metadata
- permission state

영상/사진/Carousel별로 저장 위치 설정을 따로 갖지 않습니다.

---

## `src/metrics/metrics.js`

초기에는 지표 계산을 한 파일에 둡니다.

- ER
- 24h growth
- account relative/outlier

DOM 접근 금지.

파일이 커지거나 독립 테스트가 많아지면 다음처럼 분리합니다.

```text
metrics/
├─ engagement.js
├─ growth24h.js
└─ account-relative.js
```

---

## `src/media/media-resolver.js`

현재 identity에 맞는 실제 미디어를 결정합니다.

초기 포함:

- video URL
- photo image
- video cover
- carousel slide list

Video cover와 Carousel 로직이 충분히 커질 때만:

```text
media/
├─ media-resolver.js
├─ cover-resolver.js
└─ carousel-resolver.js
```

로 분리합니다.

---

## `src/media/download-manager.js`

**모든 다운로드의 단일 진입점**입니다.

담당:

1. Settings Store에서 전역 저장정책 확인
2. capability/permission 확인
3. single/batch destination 결정
4. 파일명 결정
5. write/download 실행
6. 진행/실패 상태 반환

다음 UI들은 직접 파일시스템 API를 호출하지 않습니다.

- Grid media menu
- RI Panel media tab
- 향후 STT/OCR export

초기에는 한 파일에 유지합니다.

다음 중 하나가 발생하면 전략 파일을 분리합니다.

- directory writer와 browser download 로직이 각각 커짐
- 독립 테스트 필요
- 동일 전략이 여러 곳에서 재사용

그때만:

```text
media/
├─ download-manager.js
├─ download-policy.js
├─ filename.js
└─ download-strategies/
   ├─ directory-writer.js
   ├─ browser-download.js
   └─ save-picker.js
```

로 확장합니다.

**지정 폴더 저장 실패 시 조용히 기본 Downloads로 fallback하지 않습니다.**

---

## `src/ui/grid.js`

Grid UI만 담당합니다.

- 카드 발견/연결
- 8개 슬롯 mount/render
- Grid media menu
- safe visibility

금지:

- fetch/XHR hook
- localStorage 직접 write
- directory picker 직접 호출
- Instagram raw JSON 파싱

Grid Frozen UI는 `GRID_BASELINE.md`를 따릅니다.

---

## `src/ui/reel.js`

Reel 화면의 직접 표시 UI만 담당합니다.

- views
- ER
- 24h
- account relative
- date

Instagram native 좋아요/댓글/리포스트/공유 UI를 중복하지 않습니다.

---

## `src/ui/ri-panel.js`

전역 RI 버튼과 공용 패널 shell을 초기에는 한 파일에서 관리합니다.

초기 역할:

- 전역 RI 버튼
- panel open/close
- tab shell
- 현재 identity 연결
- settings UI

패널 탭별 구현이 실제로 커지면 다음 단계에서 분리합니다.

```text
ui/
├─ ri-panel.js
└─ panel/
   ├─ summary.js
   ├─ content.js
   ├─ comments.js
   ├─ analysis.js
   ├─ media.js
   └─ settings.js
```

초기부터 6개 탭 파일을 만들지 않습니다.

---

## `src/ui/styles.js`

RI 전체 스타일을 한곳에 관리합니다.

- Grid overlay
- global RI button
- RI Panel
- toast
- safe-area 관련 스타일

JS 파일마다 긴 CSS 문자열을 따로 가지지 않습니다.

향후 스타일이 충분히 커지면 `ui/styles/`로 분리할 수 있습니다.

---

# 4. 의존성 규칙

기본 데이터 흐름:

```text
Instagram
  ↓
identity / extractor
  ↓
Verified Store
  ↓
metrics / media
  ↓
UI
```

허용 방향:

```text
main
 ↓
core
 ↓
instagram
 ↓
store
 ↓
metrics / media
 ↓
ui
```

금지 예:

- `store` → `ui` import
- `metrics` → DOM 접근
- `ui/grid` → fetch/XHR hook
- `ui/ri-panel` → localStorage 직접 write
- `ui` → File System Access 직접 호출
- `download-manager` → Grid DOM 탐색
- `instagram` → UI renderer 호출

순환 import가 생기면 파일을 추가하기보다 **책임 경계를 먼저 다시 봅니다.**

---

# 5. 파일 분리 기준

파일은 아래 기준 중 하나 이상이 있을 때만 분리합니다.

1. **책임이 명확히 다르다.**
2. **독립 테스트 가치가 있다.**
3. **두 곳 이상에서 재사용된다.**
4. **변경 주기가 다른 기능과 섞여 회귀 위험이 커진다.**
5. **약 300~500줄 이상으로 계속 커지고 탐색이 어려워진다.**

줄 수는 절대 기준이 아닙니다. 책임이 하나라면 500줄도 유지할 수 있고, 책임이 둘이면 150줄이어도 분리할 수 있습니다.

## 과분할 금지

다음은 피합니다.

- 20~30줄 helper 하나 때문에 폴더 생성
- 화면 하나에 파일 8~10개 생성
- 아직 구현하지 않은 기능용 placeholder 파일
- `utils1.js`, `helpers2.js` 같은 의미 없는 파일

---

# 6. 파일명 규칙

- 소문자 kebab-case 사용
- 역할이 이름에 드러나게 작성
- `old`, `new`, `final`, `fix`, `hotfix`, `backup`, `copy` 접미사 금지

좋은 예:

```text
settings-store.js
download-manager.js
media-resolver.js
ri-panel.js
```

나쁜 예:

```text
new-download.js
final-final.js
ri-hotfix2.js
backup-grid.js
utils2.js
```

버전은 파일명에 넣지 않고 Git commit/tag와 userscript version으로 관리합니다.

---

# 7. 파일 내용 규칙

각 파일은 가능한 한 다음 순서를 따릅니다.

```text
1. imports
2. constants / module state
3. public API
4. private helpers
5. exports
```

규칙:

- module-level mutable state 최소화
- 숨은 global 사용 최소화
- side effect는 `main/app`에서 명시적으로 시작
- selector, storage key, event name을 여기저기 문자열로 복제하지 않음
- 같은 포맷 함수/다운로드 함수/Store merge 함수를 여러 파일에 복사하지 않음
- 에러를 `catch {}`로 무조건 삼키지 않음. 사용자 영향이 있으면 상태/로그를 남김

---

# 8. Source of Truth 규칙

## 과도기

현재 v3.1.6은 `ri-retry.user.js`가 실제 실행 원본입니다.

v3.2 모듈화를 시작한 뒤에는 **이중 원본 기간을 짧게 유지**합니다.

진행 순서:

1. 신규 v3.2 Foundation을 `src/`에 작성
2. build/check 기반 준비
3. 기존 monolith 기능을 작은 단위로 `src/`로 이동
4. parity + regression + 실기기 확인
5. `src/*`를 공식 개발 원본으로 전환

## 전환 이후

```text
src/* = 사람이 수정하는 개발 원본
ri-retry.user.js = 생성된 Tampermonkey 배포파일
```

전환 이후 `ri-retry.user.js` 직접 수작업 수정은 금지합니다.

---

# 9. Build / Check 규칙

build가 실제 도입되는 시점에만 다음 파일을 생성합니다.

```text
package.json
scripts/build.mjs
scripts/check.mjs
```

요구사항:

- 외부 runtime dependency 없음
- self-contained userscript 생성
- userscript metadata/version 일치
- syntax check 실패 시 build 실패
- build 결과와 `STATUS.md` 배포 버전 일치
- 생성 파일에 build 경고 header 추가 가능

예:

```text
// GENERATED FILE — edit src/*, not this file.
```

---

# 10. 테스트 파일 관리

```text
tests/
├─ README.md
├─ fixtures/
├─ unit/
└─ regression/
```

## fixtures

저장 가능한 것:

- 필요한 Instagram JSON 구조만 남긴 최소 샘플
- shortcode/mediaType/metric conflict 재현용 익명화 fixture

저장 금지:

- login cookie
- authorization/token
- private header
- 개인 계정 원본 dump
- 전체 HAR 원본
- 실제 다운로드 영상/사진

필요한 네트워크 샘플은 **sanitized fixture**로 변환한 뒤 commit합니다.

---

# 11. Git 파일 관리 규칙

Git에 넣지 않는 것:

- 다운로드한 Instagram 영상/사진
- HAR/capture/debug dump
- `.env`/secret
- 임시 파일
- build cache
- `node_modules`
- 개인 테스트 데이터

과거 코드 보관 목적으로 다음을 만들지 않습니다.

```text
ri-retry-old.js
ri-retry-backup.js
v316-copy.js
hotfix.js
```

과거 버전은 Git history/commit SHA로 복구합니다.

---

# 12. v3.2 실제 생성 순서

모든 목표 파일을 한 번에 만들지 않습니다.

첫 세트:

```text
src/main.js
src/core/app.js
src/core/capability.js
src/store/settings-store.js
src/media/download-manager.js
src/ui/ri-panel.js
src/ui/styles.js
```

이 단계에서 구현할 것:

- 전역 RI 버튼
- 공용 RI Panel shell
- Settings Store
- 저장 capability 확인
- 공통 Download Manager 기반

다음 세트:

```text
src/media/media-resolver.js
src/ui/grid.js
src/ui/reel.js
```

기존 video/photo/carousel 저장 호출을 공통 Download Manager로 연결합니다.

가장 회귀 위험이 높은 다음 영역은 마지막에 이동합니다.

```text
src/instagram/identity.js
src/instagram/extractor.js
src/store/verified-store.js
src/metrics/metrics.js
```

Grid 숫자 깜빡임 제거, shortcode binding, cover identity, Verified Store 개선을 먼저 보존합니다.

---

# 13. 구조 확장 판단

장기적으로 다음 구조까지 확장할 수 있지만 **필요가 생길 때만** 분리합니다.

예:

```text
instagram/extractors/*
instagram/normalizers/*
media/download-strategies/*
ui/panel/*
comments/*
analysis/*
store/migrations.js
```

`CODE_STRUCTURE.md`는 실제 코드 구조가 바뀌면 함께 갱신합니다.

---

# 14. 완료 기준

파일 구조 정리가 완료됐다고 보는 기준:

1. 기능 위치를 파일명만 보고 대략 찾을 수 있음
2. UI/Extractor/Store/Download 책임이 섞이지 않음
3. 같은 기능 구현이 여러 파일에 복제되지 않음
4. 새 기능 때문에 old/hotfix 파일이 늘어나지 않음
5. `src` 전환 후 userscript 직접 수정이 없음
6. build/check/test가 배포 전 수행됨
7. 실기기에서 이미 좋아진 동작이 유지됨

파일 수보다 **명확한 책임, 낮은 회귀 위험, 빠른 탐색과 수정**을 우선합니다.

# Instagram Content Research Tool — Code Structure

이 문서는 실제 코드의 **파일 책임, 상태 소유권, dependency, side effect 경로, migration, 크기/중복 관리** 기준입니다.

상위 기준:

- `PROJECT_PLAN.md` — 제품/데이터/UI/로드맵
- `STATUS.md` — 현재 배포/검증/미해결
- `GRID_BASELINE.md` — Grid Frozen UI
- `tests/README.md` — 회귀/승인 기준

설계가 바뀌면 기존 결정을 먼저 읽고 유지/수정/추가를 다시 통합합니다.

---

# 1. 설계 목표

1. **Single Owner** — 한 책임은 한 owner가 소유
2. **Single Data Flow** — UI별 별도 수집/계산 금지
3. **Single Side-Effect Path** — persistence/download/clipboard 같은 부작용은 지정 경로만 사용
4. **Small Public API** — 모듈 간 작은 명시적 API
5. **Progressive Modularization** — 실제 책임 경계가 생길 때만 분리
6. **Migration without rollback** — 기존 승인 runtime을 보존하면서 호출부를 한 단계씩 이동

파일 수 자체를 목표로 하지 않습니다.

---

# 2. v3.2.2 실제 구조

```text
reels-inspector/
├ README.md
├ PROJECT_PLAN.md
├ STATUS.md
├ GRID_BASELINE.md
├ CODE_STRUCTURE.md
├ package.json
├ .gitignore
│
├ src/
│  ├ version.js
│  ├ main.js
│  ├ legacy-runtime.js
│  │
│  ├ core/
│  │  ├ app.js
│  │  ├ capability.js
│  │  └ clipboard.js
│  │
│  ├ migration/
│  │  └ legacy-store-adapter.js
│  │
│  ├ store/
│  │  └ settings-store.js
│  │
│  ├ metrics/
│  │  └ metrics.js
│  │
│  ├ media/
│  │  ├ media-resolver.js
│  │  └ download-manager.js
│  │
│  └ ui/
│     ├ grid.js
│     ├ ri-panel.js
│     ├ ri-summary.js
│     ├ toast.js
│     └ styles.js
│
├ tests/
│  ├ README.md
│  ├ fixtures/
│  └ unit/
│     ├ foundation.test.mjs
│     ├ migration.test.mjs
│     └ metrics.test.mjs
│
├ scripts/
│  ├ build.mjs
│  └ check.mjs
│
└ ri-retry.user.js   # generated artifact
```

빈 placeholder 파일은 만들지 않습니다.

---

# 3. Composition Root

`src/main.js`만 전체 subsystem을 조립합니다.

```text
main.js
  ├ VERSION
  ├ AppContext
  ├ CapabilitySnapshot
  ├ Settings Store
  ├ Download Manager
  ├ Legacy Store Adapter
  ├ Metrics Engine
  ├ Grid Actions
  └ RI Panel
```

Dependency는 main에서 주입합니다.

```js
const app = createApp({ version: VERSION });
const settings = createSettingsStore(...);
const legacyStore = createLegacyStoreAdapter(...);
const metrics = createMetricsEngine({ history: legacyStore });
const downloads = createDownloadManager(...);

app.services = { capabilities, settings, downloads, metrics };
```

하위 모듈이 상위 module/global service locator를 찾아다니지 않습니다.

---

# 4. Runtime Event / Activity

공식 event:

```text
route:changed
identity:changed
store:changed
settings:changed
download:changed
```

`core/app.js`가 event 이름과 SPA lifecycle을 소유합니다.

v3.2.2부터 기존 SPA `MutationObserver`의 activity를 `onActivity(reason)` callback으로 composition root에 공유할 수 있습니다.

이 목적은 **같은 DOM을 보기 위한 두 번째 전체 observer를 만들지 않는 것**입니다.

```text
MutationObserver (1)
   ↓
AppContext
   ├ route/identity sync
   └ legacy store fingerprint schedule
```

규칙:

- mutation마다 전체 Grid/Store parse 금지
- `scheduleRender(key)`로 동일 frame render dedupe
- listener는 cleanup 경로 필수
- route change 후 stale listener 금지

---

# 5. 상태 소유권

| 상태/책임 | Owner |
|---|---|
| 제품 버전 | `version.js` |
| route/event/lifecycle | `core/app.js` |
| capability/permission probe | `core/capability.js` |
| clipboard | `core/clipboard.js` |
| 저장정책 + directory handle | `store/settings-store.js` |
| legacy cache/history read | `migration/legacy-store-adapter.js` |
| ER/24h/account relative formula | `metrics/metrics.js` |
| migrated media/cover/filename | `media/media-resolver.js` |
| destination/Blob write | `media/download-manager.js` |
| Grid save intent/menu | `ui/grid.js` |
| RI shell/tabs/lifecycle/settings/media | `ui/ri-panel.js` |
| RI summary presentation | `ui/ri-summary.js` |
| toast | `ui/toast.js` |
| new shared CSS | `ui/styles.js` |

Instagram Identity/Extractor/Verified Store/Grid renderer/Reel renderer는 migration 완료 전까지 legacy runtime에 남아 있습니다.

---

# 6. Metrics Engine

`metrics/metrics.js`는 DOM/storage/UI를 직접 접근하지 않는 순수 domain layer입니다.

공개 API:

```js
createMetricsEngine({ history, now })
calculateEngagementRate(input)
calculateGrowth24h(input)
calculateAccountMultiple(input)
```

`history` contract:

```js
getSnapshots(shortcode) -> [{ t, v }]
getAccountPosts(username) -> [{ code, owner, views, t }]
```

현재 migration에서는 `legacy-store-adapter.js`가 이 contract를 제공합니다. 향후 Verified Store/history module이 완성되면 Metrics Engine 자체는 수정하지 않고 주입 대상만 교체합니다.

## ER

- formula: `(likes + comments + reposts) / views * 100`
- 새 RI path는 views/likes/comments/reposts가 모두 실제 값일 때만 계산
- missing을 0으로 치환 금지

## 24h

- 실제 snapshot만 사용
- 18~32시간 window
- 24시간에 가장 가까운 snapshot
- 현재 views가 이전보다 작으면 미표시

## account multiple

- 동일 username
- 현재 shortcode 제외
- 최근 최대 20
- 최소 5 sample
- median 대비 current views

Metrics module에서 DOM selector, localStorage, UI string을 다루지 않습니다.

---

# 7. Migration Store Adapter

`migration/legacy-store-adapter.js`는 영구 Store가 아니라 migration boundary입니다.

읽는 legacy keys:

```text
ri311:items:v1
ri311:snap:v1
ri311:posts:v1
```

공개 API:

```js
getItem(shortcode)
getPost(shortcode)
getCurrentIdentity(url?)
getSnapshots(shortcode)
getAccountPosts(username)
createChangeTracker(listener)
codeFromUrl(url)
```

금지:

- 새 Instagram parser 추가
- Verified conflict 규칙 새 구현
- cache 쓰기 ownership 가져오기
- 미확보 metric을 0으로 변경

## Change Tracker

Change Tracker는 interval polling을 만들지 않습니다.

- AppContext가 관찰한 SPA DOM activity를 받아 1회 delayed fingerprint check
- `ri311:items/snap/posts` raw string이 실제 변경됐을 때만 callback
- storage/focus/pageshow 보조 trigger
- fingerprint가 같으면 JSON parse/render 없음

Verified Store migration 완료 후 adapter와 tracker를 삭제합니다.

---

# 8. UI 구조

UI는 표현과 intent 전달만 합니다.

금지:

- GraphQL/raw JSON parse
- localStorage/IndexedDB 직접 접근
- File System picker 직접 호출
- Blob/network transport 구현
- ER/24h/account formula 구현

## `ui/grid.js`

- 기존 카드당 `.ri3-grid-media` intent capture
- shortcode 식별
- `media-resolver` 호출
- content action menu
- Download Manager/clipboard owner 호출

Grid 8-slot renderer 자체는 아직 legacy이며 회귀 위험 때문에 별도 단계에서 옮깁니다.

## `ui/ri-panel.js`

소유:

- 전역 RI button
- panel open/close
- tabs
- settings UI
- media intent
- route/identity/store event에 따른 render scheduling

summary의 지표/표시 책임은 `ri-summary.js`에 위임합니다.

## `ui/ri-summary.js`

v3.2.2에서 실제 두 번째 변경 책임이 생겨 분리했습니다.

소유:

- summary rows
- raw count presentation
- Metrics Engine 결과의 percent/multiple presentation
- missing value `—` 정책

Instagram/storage/download side effect는 없습니다.

---

# 9. Download System

모든 새 미디어 저장:

```text
UI intent
  ↓
Download Manager
  ↓
destination policy
  ↓
media transport
  ↓
writer
```

mode:

- default
- directory
- prompt

지정 폴더 실패 시 silent default fallback 금지.

cross-origin image/cover 문제가 실기기에서 확인될 때만 `media/transport.js` 분리를 검토합니다. 실제 필요 확인 전에 `@grant`를 바꾸지 않습니다.

---

# 10. 중복 방지

## Single Owner rule

두 번째 구현을 만들기 전에 기존 owner API를 먼저 찾습니다.

예:

- clipboard → `core/clipboard.js`
- filename → `media/media-resolver.js`
- metrics formula → `metrics/metrics.js`
- save policy → `settings-store.js`
- file write → `download-manager.js`

## Migration exception

기존 `legacy-runtime.js`에는 아직 Grid/Reel parity를 위한 이전 metric 함수가 남아 있습니다.

이는 영구 owner가 아닙니다.

```text
새 owner 작성
→ 새 RI 호출부 전환
→ 실기기/회귀 확인
→ Grid/Reel 호출부 전환
→ legacy metric 함수 제거
```

새 metric 변경은 `metrics/metrics.js`에만 적용합니다.

## 금지 패턴

- `oldFn = fn; fn = override` 새 stack
- `backup.js`, `final2.js`, `hotfix.js`, `copy.js`
- 동일 helper 8줄+ 복사 후 독립 발전
- 의미 없는 global `utils.js` 쓰레기통

---

# 11. 파일 크기 관리

기준:

- 0~250줄: 정상
- 250~350줄: 책임 혼합 검토
- 350~500줄: 분리 후보
- 500줄 초과: 명확한 단일책임 사유 없으면 분리
- `legacy-runtime.js`만 migration 기간 예외

v3.2.2 적용 사례:

`ri-panel.js`가 summary 지표 연결로 350줄 경계를 넘기려 했기 때문에, 단순 줄수 맞추기가 아니라 **summary presentation이라는 독립 변경 책임이 실제 생긴 시점**에 `ri-summary.js`로 분리했습니다.

함수 분리 기준:

- 약 60줄 이상 지속
- DOM 탐색 + domain 계산 + persistence 같은 서로 다른 side effect 혼합
- 3단계 이상 중첩이 지속
- 같은 8줄 이상 로직이 여러 곳에 반복

---

# 12. 성능 규칙

- interval 전체 polling 금지
- 동일 shortcode request dedupe
- MutationObserver callback 전체 parse/render 금지
- shared SPA observer activity 활용
- change fingerprint가 같으면 Store parse/render 금지
- 같은 renderKey DOM rewrite 금지
- document-level listener는 한 세트
- localStorage/IndexedDB write는 owner만 수행
- CDN URL을 identity key로 사용 금지

---

# 13. Build / Check

```text
src/main.js
  ↓
esbuild bundle
  ↓
userscript metadata prepend
  ↓
ri-retry.user.js
```

Gate:

```text
npm test
npm run build
npm run check
node --check ri-retry.user.js
```

`check.mjs` error:

- forbidden backup/hotfix filename
- UI의 storage/File System 직접 사용
- UI network transport
- metrics의 DOM 접근
- store → UI dependency
- circular import
- version mismatch
- generated warning 누락
- runtime `@require`
- syntax failure
- 일반 source 500줄 초과

350줄 초과는 warning으로 responsibility split을 검토합니다.

---

# 14. Migration 단계

## Phase 1 — build source 전환 — 완료

- `src/*` source-of-truth
- root userscript generated

## Phase 2 — Foundation — 완료

- AppContext
- capability
- settings
- download manager
- global RI shell

## Phase 3 — Download migration — 진행 중

- Grid/RI save intent → common manager
- global save mode
- 지정폴더 image/cover CORS는 실기기 확인 대기

## Phase 4 — UI / Metrics migration — 진행 중

v3.2.2 완료:

- SPA activity 공유
- legacy change fingerprint binding
- Metrics Engine owner
- RI summary metrics 연결
- `ri-summary.js` 책임 분리

다음:

- Reel identity/native metrics 정확도
- Reel overlay → Metrics owner
- legacy metric 함수 제거

## Phase 5 — Data Engine

- Identity
- Extractor
- Verified Store
- common history
- media[]
- Grid/Reel renderer

## Phase 6 — Legacy removal

- legacy runtime 비우고 삭제
- migration adapter 삭제
- 남은 duplicate CSS/logic 삭제

---

# 15. 완료 기준

1. `src/*`만 개발 원본
2. generated userscript 직접 수정 없음
3. 기능별 owner 명확
4. UI/Store/Metrics/Download 책임 분리
5. interval polling 없음
6. 같은 핵심 로직 장기 중복 없음
7. source 파일 크기 gate 유지
8. unit/build/check 통과
9. 실기기 승인 기능 유지
10. migration 종료 후 legacy/adapter 제거

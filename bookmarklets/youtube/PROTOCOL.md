# 유튜브다운로드 실행 인터페이스

현재 구조에서는 `ui.html`이 실제 코어를 포함하므로 별도의 복잡한 UI 메시지 버스를 기본 경로로 사용하지 않습니다.

## 1. bookmarklet.js가 제공하는 값

`ui.html`은 `iframe.srcdoc`으로 실행되며 부모 YouTube 페이지에서 다음 값을 사용합니다.

```js
parent.__YTDL_TOKEN
parent.__YTDL_WEBAPP_URL
parent.__YTDL_CALL(action,payload)
parent.__YTDL_CLOSE()
```

### 의미

```text
__YTDL_TOKEN
→ 현재 북마클릿 실행 식별값

__YTDL_WEBAPP_URL
→ 유튜브다운로드앱_v1 공용 /exec 주소

__YTDL_CALL
→ 숨은 iframe POST 브리지를 통한 Apps Script action 호출

__YTDL_CLOSE
→ UI와 브리지 전체 종료
```

## 2. ui.html → Apps Script action

```text
create-storage
get-state
connect-file
list-sheets
create-sheet
list-categories
add-category
check-duplicate
save-record
```

`get-ui`는 ui.html이 실행되기 전 `bookmarklet.js`가 호출합니다.

## 3. 초기화

```text
bookmarklet.js
→ get-ui
→ iframe.srcdoc = ui.html
→ ui.html start()
→ create-storage
→ get-state
→ list-sheets
→ list-categories
→ check-duplicate
→ 본 화면 표시
```

## 4. 사용자 저장 입력

```js
{
  types:['video','audio','data'],
  target:'local'|'drive',
  video:{id},
  audio:{id},
  data:{fields:[],format:'original'|'txt'|'json',comments:{count,sort}},
  drive:{fileId,sheetName,category},
  management:{tags,purpose,priority,status,memo,aiSend},
  duplicateMode:'update'|'new'
}
```

영상/음성 `id`는 실제 URL이 아니라 현재 실행 메모리의 후보 ID입니다.

## 5. 로컬 저장

UI의 `저장` 클릭 핸들러가 직접 File System Access API를 호출합니다.

```text
한 종류 → showSaveFilePicker
복수 종류 → showDirectoryPicker
```

이 구조는 사용자 활성화를 비동기 메시지 사이에서 잃지 않기 위한 것입니다.

## 6. Sheets 저장

```text
데이터 + Drive
→ ui.html collect()
→ __YTDL_CALL('save-record', payload)
→ Code.gs
→ SpreadsheetApp
```

중복이면 UI 내부 `dup` 상태를 갱신하고 업데이트/새 기록 선택 영역을 표시합니다.

## 7. 종료

```text
닫기
→ parent.__YTDL_CLOSE()
→ srcdoc UI 제거
→ POST 브리지 iframe 제거
→ pending request와 listener 정리
```

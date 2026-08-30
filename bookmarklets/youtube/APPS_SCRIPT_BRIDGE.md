# Apps Script 연결 규격

## 창 연결

북마클릿/UI가 배포된 Apps Script 웹앱을 새 창으로 엽니다.

```text
웹앱URL?origin=<YouTube origin>&token=<실행 token>
```

웹앱 → opener:

```js
{ type:'YT_GAS_READY', token }
```

요청:

```js
{
  type:'YT_GAS_REQUEST',
  token,
  requestId,
  request:{ action, payload }
}
```

응답:

```js
{
  type:'YT_GAS_RESPONSE',
  token,
  requestId,
  result:{ ok, data?, error? }
}
```

## 허용 action

```text
ping
get-state
connect-file
unlink-file
list-sheets
create-sheet
list-categories
add-category
check-duplicate
save-record
```

## save-record 핵심

- `record`: 실제 수집 성공한 원본 필드만 보냄
- `management`: 사용자가 변경한 관리값만 보냄
- 빈값은 기존값 보존
- 실제 삭제는 `clearManagement:[필드명]`으로 명시
- 중복 기준: 영상 ID

API 키·OAuth token·쿠키는 메시지에 넣지 않습니다.

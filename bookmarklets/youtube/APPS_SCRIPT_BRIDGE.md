# Apps Script 연결

웹앱:
`https://script.google.com/macros/s/AKfycbxNvYE5AxCJ_9yNI_mS1GKOrRMBX6Qy3_u9CkUvNyiyOM0aof_CNaUDa0lEGHDFCdsa/exec`

## 연결

YouTube 페이지의 북마클릿 코어가 새 창으로 엽니다.

```text
웹앱URL?origin=<YouTube origin>&token=<실행 token>
```

```js
// GAS → YouTube
{type:'YT_GAS_READY',token}

// YouTube → GAS
{type:'YT_GAS_REQUEST',token,requestId,request:{action,payload}}

// GAS → YouTube
{type:'YT_GAS_RESPONSE',token,requestId,result:{ok,data?,error?}}
```

허용 action:
`ping`, `get-state`, `connect-file`, `unlink-file`, `list-sheets`, `create-sheet`, `list-categories`, `add-category`, `check-duplicate`, `save-record`

- Google 창의 `opener`는 반드시 YouTube 페이지여야 합니다.
- token/requestId가 맞는 응답만 처리합니다.
- API 키·OAuth token·쿠키는 전달/저장하지 않습니다.
- 먼저 Android Whale에서 `READY → ping` 1회만 검증합니다.

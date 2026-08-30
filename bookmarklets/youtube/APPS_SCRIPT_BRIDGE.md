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

- Google 창의 `opener`는 YouTube 페이지여야 합니다.
- token/requestId가 맞는 응답만 처리합니다.
- API 키·OAuth token·쿠키는 전달/저장하지 않습니다.

## 모바일 1회 테스트

YouTube 페이지에서 아래 임시 북마클릿을 한 번 실행합니다.

```js
javascript:(()=>{const U='https://script.google.com/macros/s/AKfycbxNvYE5AxCJ_9yNI_mS1GKOrRMBX6Qy3_u9CkUvNyiyOM0aof_CNaUDa0lEGHDFCdsa/exec',T=[...crypto.getRandomValues(new Uint32Array(4))].map(n=>n.toString(36)).join(''),R='p'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);let W,done=false;const h=e=>{const d=e.data||{};if(d.token!==T)return;if(d.type==='YT_GAS_READY')W&&W.postMessage({type:'YT_GAS_REQUEST',token:T,requestId:R,request:{action:'ping',payload:{}}},'*');else if(d.type==='YT_GAS_RESPONSE'&&d.requestId===R){done=true;removeEventListener('message',h);alert(d.result&&d.result.ok?'연결 성공 · v'+(d.result.data&&d.result.data.version||''):'연결 실패 · '+(d.result&&d.result.error&&d.result.error.message||''))}};addEventListener('message',h);W=open(U+'?origin='+encodeURIComponent(location.origin)+'&token='+encodeURIComponent(T),'ytGasBridge');if(!W){removeEventListener('message',h);alert('Google 연결 창을 열 수 없습니다.');return}setTimeout(()=>{if(!done){removeEventListener('message',h);alert('연결 응답 없음')}},15000)})()
```

성공 기준: `연결 성공 · v0.3.0`

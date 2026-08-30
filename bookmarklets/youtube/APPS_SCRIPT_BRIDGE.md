# Apps Script 연결

웹앱:
`https://script.google.com/macros/s/AKfycbxNvYE5AxCJ_9yNI_mS1GKOrRMBX6Qy3_u9CkUvNyiyOM0aof_CNaUDa0lEGHDFCdsa/exec`

## 방식

`window.opener`는 사용하지 않습니다.

```text
YouTube 북마클릿
→ 숨은 iframe + form POST
→ Apps Script doPost
→ SpreadsheetApp 작업
→ iframe 응답이 window.top.postMessage
→ YouTube가 결과 수신
```

POST 항목:
`origin`, `token`, `requestId`, `request(JSON)`

허용 action:
`ping`, `get-state`, `connect-file`, `unlink-file`, `list-sheets`, `create-sheet`, `list-categories`, `add-category`, `check-duplicate`, `save-record`

- `Code.gs`: Sheets 공통 로직
- `Transport.gs`: 모바일 브리지
- 개인 Sheets 주소는 공용 코드에 고정하지 않음
- token/requestId가 맞는 응답만 처리
- API 키·OAuth token·쿠키 저장 금지

## 모바일 테스트

`Transport.gs`를 Apps Script 프로젝트에 추가하고 기존 웹앱을 새 버전으로 배포한 뒤 YouTube 페이지에서 실행합니다.

```js
javascript:(()=>{const U='https://script.google.com/macros/s/AKfycbxNvYE5AxCJ_9yNI_mS1GKOrRMBX6Qy3_u9CkUvNyiyOM0aof_CNaUDa0lEGHDFCdsa/exec',T=[...crypto.getRandomValues(new Uint32Array(4))].map(n=>n.toString(36)).join(''),R='p'+Date.now().toString(36)+Math.random().toString(36).slice(2,8),N='ytGas'+R;let done=false,F=document.createElement('iframe');F.name=N;F.style.display='none';document.documentElement.append(F);const clean=()=>{removeEventListener('message',h);F.remove()},h=e=>{const d=e.data||{};if(d.type!=='YT_GAS_RESPONSE'||d.token!==T||d.requestId!==R)return;done=true;clean();alert(d.result&&d.result.ok?'연결 성공 · v'+(d.result.data&&d.result.data.version||''):'연결 실패 · '+(d.result&&d.result.error&&d.result.error.message||''))};addEventListener('message',h);const f=document.createElement('form');f.method='POST';f.action=U;f.target=N;f.style.display='none';const a=(n,v)=>{const x=document.createElement('input');x.type='hidden';x.name=n;x.value=v;f.append(x)};a('origin',location.origin);a('token',T);a('requestId',R);a('request',JSON.stringify({action:'ping',payload:{}}));document.body.append(f);f.submit();f.remove();setTimeout(()=>{if(!done){clean();alert('연결 응답 없음')}},20000)})()
```

성공 기준: `연결 성공 · v0.3.0`

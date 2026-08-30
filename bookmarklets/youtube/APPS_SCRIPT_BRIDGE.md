# Apps Script 브리지

이 문서는 **모바일 북마클릿 코어 ↔ 독립형 Apps Script 웹앱** 통신 규격을 정의합니다.

## 1. Apps Script 위치

최종 Apps Script는 특정 Google Sheets에 붙어 있는 바인딩 스크립트가 아니라 **독립형 프로젝트**입니다.

```text
독립형 Apps Script 프로젝트
유튜브다운로드 v1
├─ Transport.gs
└─ Code.gs
```

사용자 Google Sheets는 이 프로젝트의 부모 파일이 아니라 `SpreadsheetApp.openById(...)`로 여는 데이터 저장 대상입니다.

## 2. 모바일 북마크에 들어가는 공용 엔드포인트

```text
https://script.google.com/macros/s/AKfycbxj-jUt6mYeQMKqIR5d0hloyP7NqbBlZUwjbmctPovwxmApqWuius0WGpdsn21aMuOx/exec
```

정확한 배치 위치:

```text
Android 모바일 브라우저 북마크
→ URL 칸의 javascript: 북마클릿
→ JavaScript 내부 GAS_WEBAPP_URL 상수
```

```js
const GAS_WEBAPP_URL='https://script.google.com/macros/s/AKfycbxj-jUt6mYeQMKqIR5d0hloyP7NqbBlZUwjbmctPovwxmApqWuius0WGpdsn21aMuOx/exec';
```

이 값은 공용 Apps Script 주소입니다. 개인 Google Sheets URL은 이 상수에 넣지 않습니다.

## 3. 전송 구조

```text
YouTube 페이지의 북마클릿 코어
→ 숨은 iframe 생성
→ form POST를 GAS_WEBAPP_URL로 전송
→ Transport.gs / doPost(e)
→ Code.gs / dispatch(...)
→ Apps Script HTML 응답
→ window.top.postMessage(...)
→ 원래 YouTube 페이지의 북마클릿 코어가 결과 수신
```

실제 데이터 요청에는 `window.opener`를 사용하지 않습니다.

## 4. Google 권한 승인

처음 사용하는 Google 계정은 새 독립형 Apps Script 프로젝트에 대해 권한 승인을 한 번 진행합니다.

```text
설정 UI의 Google 계정으로 계속
→ 북마클릿이 GAS_WEBAPP_URL을 일반 창으로 열기
→ Google 승인
→ 이후 실제 요청은 숨은 iframe + POST 사용
```

## 5. 브리지 세션

각 북마클릿 실행마다 임의 `token`을 생성합니다.

```text
init
→ 사용자별 임시 bridgeNonce 발급

request
→ bridgeNonce 검증
→ 실제 GAS action 실행
```

- nonce 저장: `PropertiesService.getUserProperties()`
- 유효시간: 10분
- 사용자별 분리
- OAuth access/refresh token을 북마클릿에 전달하지 않음

## 6. 북마클릿 코어 기준 구현

```js
function createGasBridge(GAS_WEBAPP_URL,token){
  const frameName='ytGas_'+Math.random().toString(36).slice(2)+Date.now().toString(36);
  const frame=document.createElement('iframe');
  frame.name=frameName;
  frame.style.display='none';
  document.documentElement.append(frame);

  let nonce='';
  let seq=0;
  const pending=new Map();
  const requestId=p=>(p||'r')+Date.now().toString(36)+(++seq).toString(36)+Math.random().toString(36).slice(2,9);
  const errorOf=r=>new Error(r&&r.error&&r.error.message||'Google 연결 요청 실패');

  const onMessage=e=>{
    const d=e.data||{};
    if(d.type!=='YT_GAS_RESPONSE'||d.token!==token)return;
    const x=pending.get(d.requestId);
    if(!x)return;
    clearTimeout(x.timer);
    pending.delete(d.requestId);
    x.resolve(d.result||{ok:false,error:{code:'BRIDGE_FAILURE',message:'응답 형식이 올바르지 않습니다.'}});
  };
  addEventListener('message',onMessage);

  function post(fields){
    const form=document.createElement('form');
    form.method='POST';
    form.action=GAS_WEBAPP_URL;
    form.target=frameName;
    form.style.display='none';
    for(const [k,v] of Object.entries(fields)){
      const input=document.createElement('input');
      input.type='hidden';
      input.name=k;
      input.value=String(v==null?'':v);
      form.append(input);
    }
    document.body.append(form);
    form.submit();
    form.remove();
  }

  function send(fields,id,timeout=20000){
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{
        pending.delete(id);
        reject(new Error('Google 연결 응답 없음'));
      },timeout);
      pending.set(id,{resolve,reject,timer});
      post(fields);
    });
  }

  async function init(){
    const id=requestId('i');
    const result=await send({mode:'init',origin:location.origin,token,requestId:id},id);
    if(!result.ok)throw errorOf(result);
    nonce=String(result.data&&result.data.bridgeNonce||'');
    if(!nonce)throw new Error('Google 연결 nonce를 받지 못했습니다.');
    return result.data||{};
  }

  async function call(action,payload={}){
    if(!nonce)await init();
    for(let retry=0;retry<2;retry++){
      const id=requestId('r');
      const result=await send({
        mode:'request',
        origin:location.origin,
        token,
        requestId:id,
        bridgeNonce:nonce,
        request:JSON.stringify({action,payload})
      },id);
      if(result&&result.ok)return result.data;
      if(retry===0&&result&&result.error&&result.error.code==='BRIDGE_EXPIRED'){
        nonce='';
        await init();
        continue;
      }
      throw errorOf(result);
    }
  }

  function authorize(){
    return open(
      GAS_WEBAPP_URL+'?origin='+encodeURIComponent(location.origin)+'&token='+encodeURIComponent(token),
      'ytGasAuth'
    );
  }

  function close(){
    removeEventListener('message',onMessage);
    for(const x of pending.values()){
      clearTimeout(x.timer);
      x.reject(new Error('Google 연결 종료'));
    }
    pending.clear();
    frame.remove();
  }

  return {init,call,authorize,close};
}
```

사용 예:

```js
const gas=createGasBridge(GAS_WEBAPP_URL,token);
const state=await gas.call('get-state',{});
const sheets=await gas.call('list-sheets',{fileId});
```

## 7. POST 형식

### init

```text
mode=init
origin=<현재 YouTube origin>
token=<실행 token>
requestId=<요청 ID>
```

### request

```text
mode=request
origin=<현재 YouTube origin>
token=<실행 token>
requestId=<요청 ID>
bridgeNonce=<init에서 받은 nonce>
request=<JSON 문자열>
```

`request` 예:

```js
{action:'list-sheets',payload:{fileId}}
```

응답 연결 기준:

```text
YT_GAS_RESPONSE
token 일치
requestId 일치
```

Apps Script HTML Service의 내부 sandbox frame 구조는 브라우저에 따라 달라질 수 있으므로 `event.source`를 특정 iframe으로 고정하지 않습니다.

## 8. 허용 GAS action

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

## 9. UI action → GAS action

```text
Google 계정으로 계속
→ GAS_WEBAPP_URL 일반 창 열기

파일 연결
→ connect-file {sheetUrl}

파일 선택
→ list-sheets {fileId}

시트 선택
→ list-categories {fileId,sheetName}

새 시트
→ create-sheet {fileId,sheetName}
→ 성공 후 list-sheets 갱신

새 카테고리
→ add-category {fileId,sheetName,category}

데이터 저장
→ save-record
```

## 10. 초기 상태 복원

```text
get-state
→ 연결 파일 목록 확인
→ defaultFileId 또는 첫 파일 선택
→ list-sheets
→ 첫 selectable 데이터 시트 선택
→ list-categories
→ YT_TOOL_INIT으로 UI 전달
```

연결 파일이 없으면 설정 화면을 표시합니다.

## 11. 개인 Sheets 연결

```text
설정 UI에서 사용자가 자기 Sheets URL 입력
→ connect-file payload
→ Apps Script가 Spreadsheet ID 추출/검증
→ 사용자별 UserProperties에 연결 파일 정보 저장
```

공용 `GAS_WEBAPP_URL`과 개인 `sheetUrl`은 서로 다른 값입니다.

## 12. 파일 책임

```text
apps-script/Transport.gs
→ doPost
→ bridge nonce
→ iframe 응답/postMessage

apps-script/Code.gs
→ dispatch
→ SpreadsheetApp
→ 파일/시트/카테고리/레코드 처리
```

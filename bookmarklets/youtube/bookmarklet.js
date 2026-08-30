javascript:(async()=>{
const U='https://script.google.com/macros/s/AKfycbxj-jUt6mYeQMKqIR5d0hloyP7NqbBlZUwjbmctPovwxmApqWuius0WGpdsn21aMuOx/exec';
const T=[...crypto.getRandomValues(new Uint32Array(4))].map(n=>n.toString(36).padStart(7,'0')).join('');
const N='ytGas_'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const F=document.createElement('iframe');F.name=N;F.style.display='none';document.documentElement.append(F);
let nonce='',seq=0;const pending=new Map();
const rid=p=>p+Date.now().toString(36)+(++seq).toString(36)+Math.random().toString(36).slice(2,9);
const err=r=>new Error(r?.error?.message||'Google 연결 요청 실패');
const onMsg=e=>{const d=e.data||{};if(d.type!=='YT_GAS_RESPONSE'||d.token!==T)return;const x=pending.get(d.requestId);if(!x)return;clearTimeout(x.timer);pending.delete(d.requestId);x.resolve(d.result||{ok:false,error:{message:'응답 형식 오류'}})};addEventListener('message',onMsg);
function post(o){const f=document.createElement('form');f.method='POST';f.action=U;f.target=N;f.style.display='none';for(const[k,v]of Object.entries(o)){const i=document.createElement('input');i.type='hidden';i.name=k;i.value=String(v??'');f.append(i)}document.body.append(f);f.submit();f.remove()}
function send(o,id){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(new Error('Google 연결 응답 없음'))},20000);pending.set(id,{resolve,reject,timer});post(o)})}
async function init(){const id=rid('i');const r=await send({mode:'init',origin:location.origin,token:T,requestId:id},id);if(!r.ok)throw err(r);nonce=String(r.data?.bridgeNonce||'');if(!nonce)throw new Error('Google 연결 정보 없음')}
async function call(action,payload={}){if(!nonce)await init();for(let k=0;k<2;k++){const id=rid('r');const r=await send({mode:'request',origin:location.origin,token:T,requestId:id,bridgeNonce:nonce,request:JSON.stringify({action,payload})},id);if(r?.ok)return r.data;if(k===0&&r?.error?.code==='BRIDGE_EXPIRED'){nonce='';await init();continue}throw err(r)}}
const close=()=>{removeEventListener('message',onMsg);for(const x of pending.values()){clearTimeout(x.timer);x.reject(new Error('종료'))}pending.clear();F.remove()};
try{
let state=await call('get-state',{});
if(!state.files?.length){const sheetUrl=prompt('저장할 Google Sheets 링크를 붙여넣어 주세요.');if(!sheetUrl?.trim())throw new Error('취소됨');await call('connect-file',{sheetUrl:sheetUrl.trim()});state=await call('get-state',{})}
const fileId=state.defaultFileId||state.files?.[0]?.id;if(!fileId)throw new Error('연결된 Sheets가 없습니다.');
const sheetName='YouTube 수집';await call('create-sheet',{fileId,sheetName});
const videoId=new URLSearchParams(location.search).get('v')||(location.pathname.match(/^\/shorts\/([A-Za-z0-9_-]+)/)||[])[1];if(!videoId)throw new Error('YouTube 영상 페이지에서 실행해 주세요.');
const title=(document.querySelector('meta[property="og:title"]')?.content||document.title.replace(/\s*-\s*YouTube\s*$/,'')).trim()||'YouTube 영상';
const r=await call('save-record',{fileId,sheetName,videoId,record:{title},management:{},clearManagement:[]});
if(r.status==='duplicate')alert('이미 저장된 영상입니다.');else alert('저장 성공 · '+sheetName+' · '+(r.status==='updated'?'수정':'새 행'));
}catch(e){if(e?.message!=='취소됨')alert('저장 실패 · '+(e?.message||e))}finally{close()}
})()

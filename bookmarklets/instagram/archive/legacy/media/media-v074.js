(()=>{
  const K='__RIMEDIA074',V='0.7.4',DB='ri-bookmarklet',STORE='handles',DIRKEY='instagram-download-dir';
  if(window[K]){try{window[K].rescan();window[K].expand()}catch{}return}
  for(const k of ['__RIMEDIA071','__RIMEDIA070','__RIMEDIA062'])try{window[k]?.destroy?.()}catch{}

  let panel=null,mini=null,body=null,current=null,dirHandle=null,saveMode=localStorage.getItem('riSaveMode')||'default';
  const R={version:V,tests:{}};
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const err=e=>`${e?.name||'Error'}: ${e?.message||e||''}`;
  const set=(k,status,detail)=>{R.tests[k]={status,detail,at:new Date().toISOString()};render()};

  function routeId(){try{const m=location.pathname.match(/\/(reels?|p|tv)\/([^/?#]+)/i);return m?{kind:/reels?/i.test(m[1])?'reel':m[1].toLowerCase(),code:m[2]}:null}catch{return null}}
  function nearbyId(){let best=null,score=-1;for(const a of document.querySelectorAll('a[href*="/reel/"],a[href*="/reels/"],a[href*="/p/"]')){const r=a.getBoundingClientRect(),x=Math.max(0,Math.min(r.right,innerWidth)-Math.max(r.left,0)),y=Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,0)),s=x*y;if(s<=score)continue;const m=(a.getAttribute('href')||'').match(/\/(reels?|p|tv)\/([^/?#]+)/i);if(m){score=s;best={kind:/reels?/i.test(m[1])?'reel':m[1].toLowerCase(),code:m[2]}}}return best}
  function currentId(){return routeId()||nearbyId()}
  function visibleVideo(){return [...document.querySelectorAll('video')].map(v=>{const r=v.getBoundingClientRect(),x=Math.max(0,Math.min(r.right,innerWidth)-Math.max(r.left,0)),y=Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,0));return[v,x*y]}).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1])[0]?.[0]||null}
  function appId(){for(const s of document.querySelectorAll('script[type="application/json"]')){const m=(s.textContent||'').match(/"APP_ID":"?(\d+)"?/i);if(m)return m[1]}return'936619743392459'}
  function baseName(){return `IG_${current?.code||currentId()?.code||'media'}`}
  function names(){return{video:`${baseName()}_reel.mp4`,audio:`${baseName()}_audio.m4a`,image:`${baseName()}_frame001.jpg`}}

  async function sameOriginJson(url){const r=await fetch(url,{credentials:'include',cache:'no-store',headers:{'X-IG-App-ID':appId(),'Accept':'*/*'}});if(!r.ok)throw Error(`Instagram API ${r.status}`);return r.json()}
  function normalizeItem(x){if(!x)return null;if(x.xdt_api__v1__media__shortcode__web_info?.items?.[0])return x.xdt_api__v1__media__shortcode__web_info.items[0];if(x.items?.[0])return x.items[0];if(x.shortcode_media)return x.shortcode_media;return x}
  async function resolveMedia(force=false){const id=currentId();if(!id?.code)throw Error('현재 콘텐츠 shortcode를 찾지 못함');if(!force&&current?.code===id.code&&current.item)return current;
    set('미디어 정보','WAIT','Instagram 원본 정보 확인 중');
    let item=null,lastErr=null;
    try{
      const vars=encodeURIComponent(JSON.stringify({shortcode:id.code,__relay_internal__pv__PolarisFeedShareMenurelayprovider:true,__relay_internal__pv__PolarisIsLoggedInrelayprovider:true}));
      const j=await sameOriginJson(`/graphql/query/?query_id=9496392173716084&variables=${vars}`);
      item=normalizeItem(j?.data||j);
    }catch(e){lastErr=e}
    if(!item){
      try{
        const vars=encodeURIComponent(JSON.stringify({shortcode:id.code}));
        const j=await sameOriginJson(`/graphql/query/?query_hash=2c4c2e343a8f64c625ba02b2aa12c7f8&variables=${vars}`);
        item=normalizeItem(j?.data||j);
      }catch(e){lastErr=e}
    }
    if(!item)throw lastErr||Error('미디어 정보 없음');
    let videoUrl=item.video_versions?.[0]?.url||item.video_url||item.video_resources?.at?.(-1)?.src||'';
    let imageUrl=item.image_versions2?.candidates?.[0]?.url||item.display_url||item.thumbnail_src||'';
    let dash=item.video_dash_manifest||'';
    current={id,...id,item,code:id.code,videoUrl,imageUrl,dash};
    set('미디어 정보','PASS',`${id.kind}/${id.code} · ${videoUrl?'완성 영상 있음':'완성 영상 없음'}${dash?' · DASH 있음':''}`);
    return current;
  }
  function parseDashAudio(xml){if(!xml)return'';try{const doc=new DOMParser().parseFromString(xml,'application/xml'),reps=[...doc.querySelectorAll('Representation')];const xs=reps.map(rep=>{const set0=rep.closest('AdaptationSet'),mime=rep.getAttribute('mimeType')||set0?.getAttribute('mimeType')||'',type=set0?.getAttribute('contentType')||'',bw=+(rep.getAttribute('bandwidth')||0),url=rep.querySelector('BaseURL')?.textContent?.trim()||'';return{mime,type,bw,url}}).filter(x=>x.url&&(x.mime.startsWith('audio')||x.type==='audio'));return xs.sort((a,b)=>b.bw-a.bw)[0]?.url||''}catch{return''}}

  async function fetchMedia(url,min=5000){if(!url)throw Error('원본 URL 없음');const r=await fetch(url,{credentials:'omit',mode:'cors',cache:'force-cache'});if(!r.ok)throw Error(`미디어 HTTP ${r.status}`);const b=await r.blob();if(b.size<min)throw Error(`파일이 너무 작음 ${b.size}B`);return b}

  function openDb(){return new Promise((ok,no)=>{const q=indexedDB.open(DB,1);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains(STORE))q.result.createObjectStore(STORE)};q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error)})}
  async function idbPut(k,v){const db=await openDb();try{await new Promise((ok,no)=>{const q=db.transaction(STORE,'readwrite').objectStore(STORE).put(v,k);q.onsuccess=ok;q.onerror=()=>no(q.error)})}finally{db.close()}}
  async function idbGet(k){const db=await openDb();try{return await new Promise((ok,no)=>{const q=db.transaction(STORE,'readonly').objectStore(STORE).get(k);q.onsuccess=()=>ok(q.result||null);q.onerror=()=>no(q.error)})}finally{db.close()}}
  async function restoreDir(){try{dirHandle=await idbGet(DIRKEY);if(!dirHandle)return;const p=typeof dirHandle.queryPermission==='function'?await dirHandle.queryPermission({mode:'readwrite'}):'granted';if(p==='granted'&&saveMode==='folder')set('저장 위치','PASS',`지정 폴더 · ${dirHandle.name||'선택됨'}`)}catch{}}
  async function chooseDir(){if(typeof showDirectoryPicker!=='function')throw Error('지정 폴더 저장 미지원');dirHandle=await showDirectoryPicker({mode:'readwrite'});await idbPut(DIRKEY,dirHandle);saveMode='folder';localStorage.setItem('riSaveMode',saveMode);set('저장 위치','PASS',`지정 폴더 · ${dirHandle.name||'선택됨'}`)}
  function useDefault(){saveMode='default';localStorage.setItem('riSaveMode',saveMode);set('저장 위치','PASS','기본 다운로드')}
  async function writableDir(){if(!dirHandle)throw Error('저장 폴더를 먼저 지정하세요');let p=typeof dirHandle.queryPermission==='function'?await dirHandle.queryPermission({mode:'readwrite'}):'granted';if(p!=='granted'&&typeof dirHandle.requestPermission==='function')p=await dirHandle.requestPermission({mode:'readwrite'});if(p!=='granted')throw Error('폴더 쓰기 권한 필요');return dirHandle}
  async function saveBlob(blob,name){if(saveMode==='folder'){const h=await writableDir(),fh=await h.getFileHandle(name,{create:true}),w=await fh.createWritable();await w.write(blob);await w.close();return`지정 폴더/${h.name||''}`}const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),10000);return'기본 다운로드'}

  async function saveVideo(){const t=performance.now();set('영상 저장','WAIT','소리 포함 원본 영상 받는 중');try{const m=await resolveMedia(),u=m.videoUrl;if(!u)throw Error('소리 포함 원본 영상 URL 없음');const b=await fetchMedia(u,50000),where=await saveBlob(b,names().video),sec=(performance.now()-t)/1000;set('영상 저장','PASS',`${names().video} · ${(b.size/1048576).toFixed(1)}MB · ${sec.toFixed(1)}초 · ${where}`)}catch(e){set('영상 저장','FAIL',err(e))}}
  async function saveAudio(){const t=performance.now();set('음원 저장','WAIT','원본 음원 받는 중');try{const m=await resolveMedia(),u=parseDashAudio(m.dash);if(!u)throw Error('별도 음원 URL 없음');const b=await fetchMedia(u,4000),where=await saveBlob(b,names().audio),sec=(performance.now()-t)/1000;set('음원 저장','PASS',`${names().audio} · ${Math.round(b.size/1024)}KB · ${sec.toFixed(1)}초 · ${where}`)}catch(e){set('음원 저장','FAIL',err(e))}}
  async function firstFrameBlob(){const m=await resolveMedia(),b=await fetchMedia(m.videoUrl,50000),u=URL.createObjectURL(b),v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='auto';v.src=u;v.style='position:fixed;left:-9999px;top:-9999px;width:2px;height:2px';document.body.appendChild(v);try{await new Promise((ok,no)=>{const to=setTimeout(()=>no(Error('첫 프레임 로드 시간초과')),12000);v.onloadeddata=()=>{clearTimeout(to);ok()};v.onerror=()=>{clearTimeout(to);no(Error('영상 로드 실패'))}});v.pause();try{v.currentTime=0}catch{};if(v.currentTime>.001)await new Promise((ok,no)=>{const to=setTimeout(()=>no(Error('0초 이동 시간초과')),4000);v.onseeked=()=>{clearTimeout(to);ok()};v.onerror=()=>{clearTimeout(to);no(Error('0초 이동 실패'))}});const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);return await new Promise((ok,no)=>c.toBlob(x=>x?ok(x):no(Error('JPG 생성 실패')),'image/jpeg',.95))}finally{v.remove();URL.revokeObjectURL(u)}}
  async function saveImage(){const t=performance.now();set('이미지 저장','WAIT','영상 0초 첫 프레임 생성 중');try{const b=await firstFrameBlob(),where=await saveBlob(b,names().image),sec=(performance.now()-t)/1000;set('이미지 저장','PASS',`${names().image} · 0.000초 · ${Math.round(b.size/1024)}KB · ${sec.toFixed(1)}초 · ${where}`)}catch(e){set('이미지 저장','FAIL',err(e))}}

  async function scan(){const id=currentId(),v=visibleVideo();current=null;set('현재 콘텐츠',id?'PASS':'PARTIAL',id?`${id.kind}/${id.code}`:'shortcode 미확정');set('현재 영상',v?'PASS':'PARTIAL',v?`${v.videoWidth||0}x${v.videoHeight||0} · ${Number(v.duration||0).toFixed(1)}초`:'보이는 video 없음');set('영상 저장 방식','PASS','소리 포함 완성 MP4 직접 저장 · 재인코딩 없음');set('파일명 규칙','PASS',`IG_${id?.code||'{shortcode}'}_[reel|audio|frame001]`);if(saveMode==='folder'&&dirHandle)set('저장 위치','PASS',`지정 폴더 · ${dirHandle.name||'선택됨'}`);else set('저장 위치','PASS','기본 다운로드');try{await resolveMedia(true)}catch(e){set('미디어 정보','PARTIAL',err(e))}updateMini()}
  function updateMini(){if(!mini)return;const id=currentId()?.code||'-';mini.textContent=`RI ${V} · ${id.slice(-8)}`}
  function render(){if(!body)return;body.innerHTML=Object.entries(R.tests).map(([k,v])=>`<div style="border-top:1px solid #292929;padding:5px 0"><b style="display:inline-block;width:70px;color:${v.status==='PASS'?'#8ee6a8':v.status==='FAIL'?'#ff9b9b':v.status==='WAIT'?'#ddd':'#ffd979'}">${v.status}</b><b>${esc(k)}</b><div style="margin-left:70px;word-break:break-word;opacity:.9">${esc(v.detail)}</div></div>`).join('')}
  function collapse(){panel.style.display='none';mini.style.display='block'}function expand(){panel.style.display='block';mini.style.display='none'}function destroy(){panel?.remove();mini?.remove();delete window[K]}
  async function action(a){if(a==='collapse')collapse();else if(a==='scan')await scan();else if(a==='video')await saveVideo();else if(a==='audio')await saveAudio();else if(a==='image')await saveImage();else if(a==='folder'){try{await chooseDir()}catch(e){if(e?.name!=='AbortError')set('저장 위치','FAIL',err(e))}}else if(a==='default')useDefault();else if(a==='copy'){try{await navigator.clipboard.writeText(JSON.stringify({...R,url:location.href},null,2));set('결과 복사','PASS','JSON 복사 완료')}catch(e){set('결과 복사','FAIL',err(e))}}else if(a==='destroy')destroy()}
  function ui(){mini=document.createElement('button');mini.style='display:none;position:fixed;z-index:2147483647;right:10px;bottom:86px;background:#111;color:#fff;border:1px solid #666;border-radius:18px;padding:8px 11px;font:12px system-ui';mini.onclick=()=>{scan();expand()};document.documentElement.appendChild(mini);panel=document.createElement('div');panel.style='position:fixed;z-index:2147483647;left:8px;right:8px;bottom:72px;max-height:44vh;overflow:auto;background:#111;color:#eee;border:1px solid #555;border-radius:14px;padding:10px;font:12px/1.45 system-ui;box-shadow:0 8px 30px #0009';panel.innerHTML=`<div style="position:sticky;top:-10px;background:#111;padding:4px 0 7px;z-index:2;display:flex;justify-content:space-between;align-items:center"><b>RI Reel 미디어 v${V}</b><button data-a="collapse">작게</button></div><div style="opacity:.75;margin:2px 0 6px">영상 저장 = 소리 포함 정상 MP4 · 재인코딩 없음</div><div id="ri074b"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px"><button data-a="video">영상 저장</button><button data-a="audio">음원 저장</button><button data-a="image">이미지 저장</button><button data-a="scan">현재 Reel 재탐지</button><button data-a="folder">저장 폴더 지정</button><button data-a="default">기본 다운로드</button><button data-a="copy">결과 복사</button><button data-a="destroy">종료</button></div>`;panel.addEventListener('click',e=>{const a=e.target?.dataset?.a;if(a)action(a)});document.documentElement.appendChild(panel);body=panel.querySelector('#ri074b')}
  ui();restoreDir().finally(()=>scan());window[K]={rescan:scan,expand,collapse,destroy,report:R};
})();
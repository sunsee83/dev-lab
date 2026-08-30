(()=>{
  const K='__RIMEDIA071',V='0.7.1',DB='ri-bookmarklet',STORE='handles',DIRKEY='instagram-download-dir';
  if(window[K]){try{window[K].rescan();window[K].expand()}catch{}return}
  try{window.__RIMEDIA070?.destroy?.()}catch{}
  try{window.__RIMEDIA062?.destroy?.()}catch{}

  let mini=null,panel=null,body=null,selected=null,lockedId=null,lastCode='',scanTimer=null,recording=false,dirHandle=null,saveMode='default';
  const captured=new Map(),R={version:V,tests:{},selected:null};
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const err=e=>`${e?.name||'Error'}: ${e?.message||e||''}`;
  const set=(k,status,detail,extra=null)=>{R.tests[k]={status,detail,extra,at:new Date().toISOString()};render()};

  function routeId(){try{const m=location.pathname.match(/\/(reels?|p|tv)\/([^/?#]+)/i);return m?{kind:/reels?/i.test(m[1])?'reel':m[1].toLowerCase(),code:m[2]}:null}catch{return null}}
  function nearbyId(){let best=null,score=-1;for(const a of document.querySelectorAll('a[href*="/reel/"],a[href*="/reels/"],a[href*="/p/"]')){const r=a.getBoundingClientRect(),x=Math.max(0,Math.min(r.right,innerWidth)-Math.max(r.left,0)),y=Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,0)),s=x*y;if(s<=score)continue;const m=a.pathname.match(/\/(reels?|p|tv)\/([^/?#]+)/i);if(m){score=s;best={kind:/reels?/i.test(m[1])?'reel':m[1].toLowerCase(),code:m[2]}}}return best}
  function currentId(){return routeId()||nearbyId()}
  function visibleVideo(){return [...document.querySelectorAll('video')].map(v=>{const r=v.getBoundingClientRect(),x=Math.max(0,Math.min(r.right,innerWidth)-Math.max(r.left,0)),y=Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,0));return[v,x*y]}).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1])[0]?.[0]||null}
  function b64json(s){try{let x=String(s||'').replace(/-/g,'+').replace(/_/g,'/');while(x.length%4)x+='=';const bin=atob(x),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return JSON.parse(new TextDecoder().decode(u))}catch{return null}}
  function meta(url){try{return b64json(new URL(url).searchParams.get('efg'))||{}}catch{return {}}}
  function canon(raw){try{const u=new URL(raw);u.searchParams.delete('bytestart');u.searchParams.delete('byteend');return u.href}catch{return String(raw||'')}}
  function assetId(m){return String(m?.xpv_asset_id||m?.asset_id||'')}
  function classify(m){const t=String(m?.vencode_tag||'').toLowerCase();if(/audio|aac|heaac/.test(t))return'audio';if(/video|baseline|clips|xpvds/.test(t))return'video';return'unknown'}
  function scheduleScan(){clearTimeout(scanTimer);scanTimer=setTimeout(()=>{try{scan()}catch{}},500)}
  function captureUrl(raw,source='capture'){try{if(!/^https?:/i.test(raw)||!/(cdninstagram|fbcdn)/i.test(raw)||!/\.mp4(?:[?#]|$)/i.test(raw))return;const url=canon(raw),m=meta(url);captured.set(url,{url,meta:m,source,at:performance.now()});scheduleScan()}catch{}}
  function captureText(text,source){try{const s=String(text||'').replace(/\\u0026/gi,'&').replace(/\\u003d/gi,'=').replace(/\\\//g,'/'),re=/https:\/\/[^"'\\\s<>]+?\.mp4(?:\?[^"'\\\s<>]*)?/gi;let m,n=0;while((m=re.exec(s))&&n++<150)captureUrl(m[0],source)}catch{}}
  function seedPerformance(){for(const e of performance.getEntriesByType?.('resource')||[])captureUrl(e.name,`performance:${e.initiatorType||'resource'}`)}
  function installHooks(){
    const base=window.__RI062_BASE_FETCH||window.__RI070_BASE_FETCH||window.__RI071_BASE_FETCH||window.fetch.bind(window);window.__RI071_BASE_FETCH=base;
    if(!window.__RI071_FETCH_HOOK){window.__RI071_FETCH_HOOK=true;window.fetch=async function(...args){const r=await base(...args);try{captureUrl(r.url||String(args[0]||''),'fetch-url');const ct=r.headers.get('content-type')||'',cl=Number(r.headers.get('content-length')||0);if(/json|text|graphql|javascript/i.test(ct)&&(!cl||cl<6000000))r.clone().text().then(t=>captureText(t,'fetch-body')).catch(()=>{})}catch{}return r}}
    if(!window.__RI071_XHR_HOOK){window.__RI071_XHR_HOOK=true;const XO=XMLHttpRequest.prototype.open,XS=XMLHttpRequest.prototype.send;XMLHttpRequest.prototype.open=function(m,u,...rest){this.__ri071url=u;return XO.call(this,m,u,...rest)};XMLHttpRequest.prototype.send=function(...args){if(!this.__ri071hook){this.__ri071hook=1;this.addEventListener('load',()=>{try{captureUrl(this.responseURL||this.__ri071url,'xhr-url');const ct=this.getResponseHeader('content-type')||'';if(/json|text|graphql/i.test(ct)){let t='';if(!this.responseType||this.responseType==='text')t=this.responseText;else if(this.responseType==='json')t=JSON.stringify(this.response);if(t&&t.length<6000000)captureText(t,'xhr-body')}}catch{}})}return XS.apply(this,args)}}
  }
  function groups(){seedPerformance();const gm=new Map();for(const c of captured.values()){const m=c.meta||meta(c.url),asset=assetId(m);if(!asset||asset==='null')continue;const type=classify(m),duration=Number(m.duration_s||0),bitrate=Number(m.bitrate||0);if(!gm.has(asset))gm.set(asset,{asset,video:[],audio:[],unknown:[],duration:0,latest:0});const g=gm.get(asset),t={...c,type,duration,bitrate};g.duration=Math.max(g.duration,duration||0);g.latest=Math.max(g.latest,c.at||0);g[type].push(t)}for(const g of gm.values()){g.video.sort((a,b)=>b.bitrate-a.bitrate);g.audio.sort((a,b)=>b.bitrate-a.bitrate);g.unknown.sort((a,b)=>b.at-a.at)}return[...gm.values()].sort((a,b)=>b.latest-a.latest)}
  function chooseGroup(){const gs=groups().filter(g=>g.video.length),v=visibleVideo(),vd=Number(v?.duration||0);if(!gs.length)return null;if(vd>0&&Number.isFinite(vd)){const close=gs.filter(g=>g.duration&&Math.abs(g.duration-vd)<2.5);if(close.length)return close.sort((a,b)=>Math.abs(a.duration-vd)-Math.abs(b.duration-vd)||b.latest-a.latest)[0]}return gs[0]||null}
  function clearActionState(){for(const k of ['영상만 저장','음원만 저장','첫 프레임 저장','영상+소리 저장'])delete R.tests[k]}
  function bestRecorderMime(){if(typeof MediaRecorder==='undefined')return'';const types=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];return types.find(t=>{try{return MediaRecorder.isTypeSupported(t)}catch{return false}})||''}
  function code(){return lockedId?.code||(selected?.asset?`asset_${selected.asset}`:'media')}
  function baseName(){return `IG_${code()}`}
  function names(ext='mp4'){return{combo:`${baseName()}_reel.${ext}`,video:`${baseName()}_video.mp4`,audio:`${baseName()}_audio.m4a`,frame:`${baseName()}_frame001.jpg`}}

  function scan(){
    const id=currentId(),v=visibleVideo(),g=chooseGroup(),c=id?.code||'';
    if(c&&c!==lastCode){clearActionState();lastCode=c}
    selected=g;lockedId=id||null;R.selected=g;
    set('현재 Reel',id?.code?'PASS':'PARTIAL',id?`${id.kind}/${id.code}`:'콘텐츠 ID 미확정');
    set('현재 영상',v?'PASS':'PARTIAL',v?`${v.videoWidth||0}x${v.videoHeight||0} · ${Number(v.duration||0).toFixed(1)}s`:'보이는 video 없음');
    if(g){set('미디어 그룹','PASS',`asset …${g.asset.slice(-8)} · ${g.duration||'?'}s · 영상 ${g.video.length} · 음원 ${g.audio.length}`);set('영상 트랙',g.video.length?'PASS':'FAIL',g.video.length?`${Math.round((g.video[0].bitrate||0)/1000)}kbps · 원본 영상`:'없음');set('음원 트랙',g.audio.length?'PASS':'PARTIAL',g.audio.length?`${Math.round((g.audio[0].bitrate||0)/1000)}kbps · 원본 음원`:'없음')}
    else{set('미디어 그룹',v?'WAIT':'FAIL',v?'현재 Reel 미디어 수집 대기':'그룹 없음');set('영상 트랙',v?'WAIT':'FAIL',v?'수집 대기':'없음');set('음원 트랙','PARTIAL','없음');if(v)setTimeout(()=>scan(),900)}
    const mt=bestRecorderMime();set('영상+소리 기능',mt?'PASS':'PARTIAL',mt?`브라우저 결합 가능 · ${mt.split(';')[0]}`:'MediaRecorder 결합 미지원');
    set('이미지 규칙','PASS','표지가 아닌 영상 0초의 첫 표시 프레임 → frame001.jpg');
    set('파일명 규칙','PASS',`${baseName()}_[reel|video|audio|frame001]`);
    updateStorageStatus();updateMini();return g
  }
  async function fetchBlob(c,min=5000){if(!c?.url)throw Error('현재 미디어 없음');const base=window.__RI071_BASE_FETCH||window.fetch.bind(window),r=await base(c.url,{credentials:'omit',mode:'cors',cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);const b=await r.blob();if(b.size<min)throw Error('파일이 너무 작음 '+b.size+'B');return{...c,blob:b,mime:b.type||r.headers.get('content-type')||''}}

  function openDb(){return new Promise((ok,no)=>{const q=indexedDB.open(DB,1);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains(STORE))q.result.createObjectStore(STORE)};q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error)})}
  async function idbPut(k,v){const db=await openDb();try{await new Promise((ok,no)=>{const q=db.transaction(STORE,'readwrite').objectStore(STORE).put(v,k);q.onsuccess=ok;q.onerror=()=>no(q.error)})}finally{db.close()}}
  async function idbGet(k){const db=await openDb();try{return await new Promise((ok,no)=>{const q=db.transaction(STORE,'readonly').objectStore(STORE).get(k);q.onsuccess=()=>ok(q.result||null);q.onerror=()=>no(q.error)})}finally{db.close()}}
  async function restoreDir(){try{const h=await idbGet(DIRKEY);if(!h)return null;dirHandle=h;const p=typeof h.queryPermission==='function'?await h.queryPermission({mode:'readwrite'}):'granted';if(p==='granted')saveMode='folder';return h}catch{return null}}
  async function chooseDir(){if(typeof showDirectoryPicker!=='function')throw Error('이 브라우저는 지정 폴더 저장을 지원하지 않음');const h=await showDirectoryPicker({mode:'readwrite'});dirHandle=h;saveMode='folder';try{await idbPut(DIRKEY,h)}catch{}updateStorageStatus();return h}
  function useDefault(){saveMode='default';updateStorageStatus()}
  async function writableDir(){if(!dirHandle)throw Error('지정 폴더가 없음');let p=typeof dirHandle.queryPermission==='function'?await dirHandle.queryPermission({mode:'readwrite'}):'granted';if(p!=='granted'&&typeof dirHandle.requestPermission==='function')p=await dirHandle.requestPermission({mode:'readwrite'});if(p!=='granted')throw Error('폴더 쓰기 권한이 필요');return dirHandle}
  async function writeFile(h,blob,name){const f=await h.getFileHandle(name,{create:true}),w=await f.createWritable();await w.write(blob);await w.close()}
  function defaultDownload(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),12000)}
  async function saveBlob(blob,name){if(saveMode==='folder'){const h=await writableDir();await writeFile(h,blob,name);return`지정폴더/${h.name||'폴더'}`}defaultDownload(blob,name);return'기본 다운로드'}
  function updateStorageStatus(){const d=saveMode==='folder'&&dirHandle?`지정 폴더 · ${dirHandle.name||'선택됨'}`:'기본 다운로드';set('저장 위치','PASS',d)}

  async function saveVideo(){set('영상만 저장','WAIT','원본 영상 받는 중');try{const g=selected||scan();if(!g?.video?.length)throw Error('현재 영상 트랙 없음');const x=await fetchBlob(g.video[0],50000),n=names().video,where=await saveBlob(x.blob,n);set('영상만 저장','PASS',`${n} · ${(x.blob.size/1048576).toFixed(1)}MB · ${where}`)}catch(e){set('영상만 저장','FAIL',err(e))}}
  async function saveAudio(){set('음원만 저장','WAIT','원본 음원 받는 중');try{const g=selected||scan();if(!g?.audio?.length)throw Error('현재 음원 트랙 없음');const x=await fetchBlob(g.audio[0],5000),n=names().audio,where=await saveBlob(x.blob,n);set('음원만 저장','PASS',`${n} · ${Math.round(x.blob.size/1024)}KB · ${where}`)}catch(e){set('음원만 저장','FAIL',err(e))}}

  async function waitFirstFrame(v){
    await new Promise((ok,no)=>{if(v.readyState>=2)return ok();const to=setTimeout(()=>no(Error('첫 프레임 로드 시간초과')),12000);const done=()=>{clearTimeout(to);ok()};v.addEventListener('loadeddata',done,{once:true});v.addEventListener('error',()=>{clearTimeout(to);no(Error('영상 로드 실패'))},{once:true})});
    try{v.pause();v.currentTime=0}catch{}
    if(Math.abs(v.currentTime||0)>.001){await new Promise((ok,no)=>{const to=setTimeout(()=>no(Error('0초 이동 시간초과')),5000);v.addEventListener('seeked',()=>{clearTimeout(to);ok()},{once:true});v.addEventListener('error',()=>{clearTimeout(to);no(Error('0초 이동 실패'))},{once:true})})}
    if(typeof v.requestVideoFrameCallback==='function')await new Promise(ok=>v.requestVideoFrameCallback(()=>ok()));else await new Promise(r=>setTimeout(r,80));
  }
  async function firstFrame(){const g=selected||scan();if(!g?.video?.length)throw Error('영상 트랙 없음');const x=await fetchBlob(g.video[0],50000),u=URL.createObjectURL(x.blob),v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='auto';v.src=u;v.style='position:fixed;left:-9999px;top:-9999px;width:2px;height:2px';document.body.appendChild(v);try{await waitFirstFrame(v);const w=v.videoWidth||0,h=v.videoHeight||0;if(!w||!h)throw Error('영상 크기 없음');const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(v,0,0,w,h);const blob=await new Promise((ok,no)=>c.toBlob(z=>z?ok(z):no(Error('JPG 생성 실패')),'image/jpeg',.94));return{blob,time:0}}finally{v.remove();URL.revokeObjectURL(u)}}
  async function saveThumb(){set('첫 프레임 저장','WAIT','0초 첫 프레임 만드는 중');try{const x=await firstFrame(),n=names().frame,where=await saveBlob(x.blob,n);set('첫 프레임 저장','PASS',`${n} · 0.000s · ${Math.round(x.blob.size/1024)}KB · ${where}`)}catch(e){set('첫 프레임 저장','FAIL',err(e))}}

  async function waitMeta(v){if(v.readyState>=1)return;await new Promise((ok,no)=>{const to=setTimeout(()=>no(Error('영상 메타데이터 시간초과')),12000);v.onloadedmetadata=()=>{clearTimeout(to);ok()};v.onerror=()=>{clearTimeout(to);no(Error('영상 로드 실패'))}})}
  async function combineAV(){
    if(recording)throw Error('이미 영상+소리 저장 중');
    const mime=bestRecorderMime();if(!mime)throw Error('이 브라우저는 영상+소리 결합 저장을 지원하지 않음');
    const g=selected||scan();if(!g?.video?.length||!g?.audio?.length)throw Error('영상/음원 트랙이 모두 필요');
    recording=true;set('영상+소리 저장','WAIT','원본 영상·음원 받는 중');
    let vu='',video=null,ctx=null,source=null,raf=0,timer=0,stream=null,rec=null;
    try{
      const [vx,ax]=await Promise.all([fetchBlob(g.video[0],50000),fetchBlob(g.audio[0],5000)]);
      vu=URL.createObjectURL(vx.blob);video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='auto';video.src=vu;video.style='position:fixed;left:-9999px;top:-9999px;width:2px;height:2px';document.body.appendChild(video);await waitMeta(video);
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw Error('AudioContext 없음');ctx=new AC();await ctx.resume();
      const audioBuf=await ctx.decodeAudioData(await ax.blob.arrayBuffer());
      const dest=ctx.createMediaStreamDestination();source=ctx.createBufferSource();source.buffer=audioBuf;source.connect(dest);
      const w=video.videoWidth||720,h=video.videoHeight||1280,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const c2=canvas.getContext('2d');
      if(typeof canvas.captureStream!=='function')throw Error('canvas.captureStream 없음');const vs=canvas.captureStream(30),vt=vs.getVideoTracks()[0],at=dest.stream.getAudioTracks()[0];if(!vt||!at)throw Error('결합용 미디어 트랙 생성 실패');stream=new MediaStream([vt,at]);
      const chunks=[],opts={mimeType:mime,videoBitsPerSecond:Math.max(1200000,Math.min(4500000,Math.round((g.video[0].bitrate||1800000)*1.15))),audioBitsPerSecond:128000};rec=new MediaRecorder(stream,opts);rec.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
      const stopped=new Promise((ok,no)=>{rec.onerror=e=>no(e.error||Error('MediaRecorder 오류'));rec.onstop=()=>ok()});rec.start(1000);
      video.currentTime=0;await video.play();source.start(0);
      const dur=Math.min(Number(video.duration||0),Number(audioBuf.duration||Infinity));
      const draw=()=>{try{c2.drawImage(video,0,0,w,h)}catch{}if(!video.ended)raf=requestAnimationFrame(draw)};draw();
      timer=setInterval(()=>{const p=Math.min(dur||video.duration||0,video.currentTime||0);set('영상+소리 저장','WAIT',`결합 중 ${p.toFixed(0)} / ${(dur||video.duration||0).toFixed(0)}초`)},1000);
      await new Promise((ok,no)=>{const max=((dur||video.duration||60)+8)*1000,to=setTimeout(()=>no(Error('결합 시간초과')),max);video.onended=()=>{clearTimeout(to);ok()}});
      try{source.stop()}catch{};await new Promise(r=>setTimeout(r,180));if(rec.state!=='inactive')rec.stop();await stopped;
      const out=new Blob(chunks,{type:rec.mimeType||mime});if(out.size<50000)throw Error('결합 파일 생성 실패');const isMp4=/mp4/i.test(out.type),ext=isMp4?'mp4':'webm',n=names(ext).combo,where=await saveBlob(out,n);set('영상+소리 저장','PASS',`${n} · ${(out.size/1048576).toFixed(1)}MB · ${isMp4?'MP4':'WebM'} · ${where}`);
    }finally{
      recording=false;clearInterval(timer);cancelAnimationFrame(raf);try{if(rec&&rec.state!=='inactive')rec.stop()}catch{};try{stream?.getTracks().forEach(t=>t.stop())}catch{};try{source?.stop()}catch{};try{await ctx?.close()}catch{};try{video?.pause();video?.remove()}catch{};if(vu)URL.revokeObjectURL(vu)
    }
  }
  async function saveCombined(){try{await combineAV()}catch(e){set('영상+소리 저장','FAIL',err(e))}}

  function updateMini(){if(!mini)return;const id=currentId()?.code||'-',g=selected;mini.textContent=`RI ${V} · ${id.slice(-8)} · ${g?.video?.length?'V✓':'V-'} ${g?.audio?.length?'A✓':'A-'}`}
  function render(){if(!body)return;body.innerHTML=Object.entries(R.tests).map(([k,v])=>`<div style="border-top:1px solid #292929;padding:5px 0"><b style="display:inline-block;width:82px;color:${v.status==='PASS'?'#8ee6a8':v.status==='FAIL'?'#ff9b9b':v.status==='WAIT'?'#ddd':'#ffd979'}">${v.status}</b><b>${esc(k)}</b><div style="margin-left:82px;word-break:break-word;opacity:.9">${esc(v.detail)}</div></div>`).join('')}
  function collapse(){if(panel)panel.style.display='none';if(mini)mini.style.display='block'}
  function expand(){if(panel)panel.style.display='block';if(mini)mini.style.display='none'}
  function rescan(){scan();expand()}
  function destroy(){try{panel?.remove();mini?.remove()}catch{};delete window[K]}
  async function action(a){if(a==='collapse')collapse();else if(a==='rescan')rescan();else if(a==='video')await saveVideo();else if(a==='audio')await saveAudio();else if(a==='combo')await saveCombined();else if(a==='thumb')await saveThumb();else if(a==='dir'){try{await chooseDir();set('저장 위치','PASS',`지정 폴더 · ${dirHandle?.name||'선택됨'}`)}catch(e){set('저장 위치',e?.name==='AbortError'?'PARTIAL':'FAIL',e?.name==='AbortError'?'폴더 선택 취소':err(e))}}else if(a==='default')useDefault();else if(a==='copy'){try{await navigator.clipboard.writeText(JSON.stringify({...R,url:location.href},null,2));set('결과 복사','PASS','JSON 복사 완료')}catch(e){set('결과 복사','FAIL',err(e))}}else if(a==='destroy')destroy()}
  function ui(){mini=document.createElement('button');mini.style='display:none;position:fixed;z-index:2147483647;right:10px;bottom:86px;background:#111;color:#fff;border:1px solid #666;border-radius:18px;padding:8px 11px;font:12px system-ui';mini.onclick=()=>rescan();document.documentElement.appendChild(mini);panel=document.createElement('div');panel.style='position:fixed;z-index:2147483647;left:8px;right:8px;bottom:72px;max-height:44vh;overflow:auto;background:#111;color:#eee;border:1px solid #555;border-radius:14px;padding:10px;font:12px/1.45 system-ui;box-shadow:0 8px 30px #0009';panel.innerHTML=`<div style="position:sticky;top:-10px;background:#111;padding:5px 0 8px;z-index:3;display:flex;justify-content:space-between;align-items:center"><b>RI Reel 미디어 v${V}</b><button data-a="collapse">작게</button></div><div style="opacity:.8;margin:2px 0 7px">첫 이미지는 0초 첫 프레임 · 저장 위치와 파일명 규칙 적용</div><div id="ri071b"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px"><button data-a="dir">저장 폴더 지정</button><button data-a="default">기본 다운로드</button><button data-a="rescan">현재 Reel 재탐지</button><button data-a="combo">영상+소리 저장</button><button data-a="video">영상만 저장</button><button data-a="audio">음원만 저장</button><button data-a="thumb">첫 프레임 저장</button><button data-a="copy">결과 복사</button><button data-a="destroy">종료</button></div>`;panel.addEventListener('click',e=>{const a=e.target?.dataset?.a;if(a)action(a)});document.documentElement.appendChild(panel);body=panel.querySelector('#ri071b')}

  installHooks();ui();set('외부 본체/Blob','PASS',`v${V} 실행 성공`);restoreDir().finally(()=>scan());window[K]={rescan,expand,collapse,destroy,report:R};
})();
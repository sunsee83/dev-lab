(()=>{
  const K='__RIMEDIA05',V='0.5.0',DB='ri-bm-media-v05',ST='kv';
  if(window[K]?.toggle){window[K].toggle();return}
  let box,body,dir=null,mark=0,selected=null,perfObs=null;
  const R={version:V,tests:{},groups:[]};
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]));
  const err=e=>`${e?.name||'Error'}: ${e?.message||e||''}`;
  const set=(k,s,d,x)=>{R.tests[k]={status:s,detail:d,extra:x||null,at:new Date().toISOString()};render()};

  function routeId(){
    try{const m=location.pathname.match(/\/(reels?|p|tv)\/([^/?#]+)/i);return m?{kind:/reels?/i.test(m[1])?'reel':m[1].toLowerCase(),code:m[2]}:null}catch{return null}
  }
  function nearbyId(){
    const sels=['a[href*="/reel/"]','a[href*="/reels/"]','a[href*="/p/"]'];
    let best=null,score=-1;
    for(const a of document.querySelectorAll(sels.join(','))){
      const r=a.getBoundingClientRect(),x=Math.max(0,Math.min(r.right,innerWidth)-Math.max(r.left,0)),y=Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,0)),s=x*y;
      if(s>score){const m=a.pathname.match(/\/(reels?|p|tv)\/([^/?#]+)/i);if(m){score=s;best={kind:/reels?/i.test(m[1])?'reel':m[1].toLowerCase(),code:m[2]}}}
    }
    return best;
  }
  function currentId(){return routeId()||nearbyId()}

  function visibleVideo(){
    return [...document.querySelectorAll('video')].map(v=>{const r=v.getBoundingClientRect(),x=Math.max(0,Math.min(r.right,innerWidth)-Math.max(r.left,0)),y=Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,0));return[v,x*y]}).sort((a,b)=>b[1]-a[1])[0]?.[0]||null;
  }
  function b64json(s){
    try{let x=String(s||'').replace(/-/g,'+').replace(/_/g,'/');while(x.length%4)x+='=';const bin=atob(x),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return JSON.parse(new TextDecoder().decode(u))}catch{return null}
  }
  function meta(url){
    try{const u=new URL(url),e=b64json(u.searchParams.get('efg'));return e||{}}catch{return {}}
  }
  function canon(url){
    try{const u=new URL(url);u.searchParams.delete('bytestart');u.searchParams.delete('byteend');return u.href}catch{return String(url||'')}
  }
  function classify(m,url){
    const tag=String(m?.vencode_tag||'').toLowerCase();
    if(/audio|aac|heaac/.test(tag))return'audio';
    if(/video|baseline|clips|xpvds/.test(tag)||/\.mp4/i.test(url))return'video';
    return'unknown';
  }
  function scanGroups(){
    const entries=performance.getEntriesByType?.('resource')||[], tracks=new Map();
    for(const e of entries){
      const raw=e.name||'';
      if(!/^https?:/i.test(raw)||!/(cdninstagram|fbcdn)/i.test(raw)||!/\.mp4(?:[?#]|$)/i.test(raw))continue;
      if(mark&&e.startTime<mark)continue;
      const url=canon(raw),m=meta(url),asset=String(m.xpv_asset_id||m.asset_id||'');
      if(!asset||asset==='null')continue;
      const type=classify(m,url),bitrate=Number(m.bitrate||0),duration=Number(m.duration_s||0),key=asset+'|'+type+'|'+url;
      const old=tracks.get(key);
      if(!old||e.startTime>old.startTime)tracks.set(key,{asset,type,url,tag:m.vencode_tag||'',bitrate,duration,startTime:e.startTime,initiator:e.initiatorType||''});
    }
    const gm=new Map();
    for(const t of tracks.values()){
      if(!gm.has(t.asset))gm.set(t.asset,{asset:t.asset,video:[],audio:[],latest:0,duration:0});
      const g=gm.get(t.asset);g.latest=Math.max(g.latest,t.startTime);g.duration=Math.max(g.duration,t.duration||0);(t.type==='audio'?g.audio:g.video).push(t);
    }
    const groups=[...gm.values()].map(g=>{
      g.video.sort((a,b)=>(b.bitrate||0)-(a.bitrate||0));g.audio.sort((a,b)=>(b.bitrate||0)-(a.bitrate||0));
      return g;
    }).filter(g=>g.video.length||g.audio.length).sort((a,b)=>b.latest-a.latest);
    R.groups=groups.slice(0,12);
    return groups;
  }
  function chooseGroup(){
    const groups=scanGroups();
    if(!groups.length){selected=null;return null}
    const vv=visibleVideo(),vd=Number(vv?.duration||0);
    let g=null;
    if(vd>0&&Number.isFinite(vd))g=groups.filter(x=>x.video.length).sort((a,b)=>Math.abs((a.duration||9999)-vd)-Math.abs((b.duration||9999)-vd)||b.latest-a.latest)[0];
    if(!g)g=groups.find(x=>x.video.length&&x.audio.length)||groups.find(x=>x.video.length)||groups[0];
    selected=g;return g;
  }
  function scan(){
    const id=currentId(),v=visibleVideo(),g=chooseGroup();
    set('현재 콘텐츠',id?.code?'PASS':'PARTIAL',id?`${id.kind}/${id.code}`:'shortcode 미확정');
    set('현재 Video',v?'PASS':'PARTIAL',v?`${v.videoWidth||0}x${v.videoHeight||0} · ${Number(v.duration||0).toFixed(1)}s`:'보이는 video 없음');
    set('미디어 그룹',g?'PASS':'FAIL',g?`asset …${g.asset.slice(-8)} · ${g.duration||'?'}s · 영상 ${g.video.length} · 음원 ${g.audio.length}`:'asset 그룹 없음',g);
    set('영상 트랙',g?.video?.length?'PASS':'FAIL',g?.video?.length?`${Math.round((g.video[0].bitrate||0)/1000)}kbps · ${g.video[0].tag||'-'}`:'영상 트랙 없음');
    set('음원 트랙',g?.audio?.length?'PASS':'PARTIAL',g?.audio?.length?`${Math.round((g.audio[0].bitrate||0)/1000)}kbps · ${g.audio[0].tag||'-'}`:'별도 음원 트랙 없음');
    set('표지',coverUrl()?'PASS':'PARTIAL',coverUrl()?'실제 표지 후보':'실제 표지 없음 → 첫 프레임');
    set('저장 API',typeof showDirectoryPicker==='function'?'PASS':'PARTIAL',`directoryPicker=${typeof showDirectoryPicker==='function'}, indexedDB=${!!indexedDB}`);
  }
  function coverUrl(){
    const v=visibleVideo();if(v&&/^https?:/i.test(v.poster||''))return{url:v.poster,source:'video.poster'};
    if(!v)return null;const vr=v.getBoundingClientRect(),va=Math.max(1,vr.width*vr.height);let best=null,sc=0;
    for(const img of document.querySelectorAll('img')){const r=img.getBoundingClientRect(),ow=Math.max(0,Math.min(vr.right,r.right)-Math.max(vr.left,r.left)),oh=Math.max(0,Math.min(vr.bottom,r.bottom)-Math.max(vr.top,r.top)),cv=ow*oh/va;if(cv<.55)continue;const u=img.currentSrc||img.src||'';if(!/^https?:/i.test(u))continue;const s=cv*1e6+(img.naturalWidth||r.width)*(img.naturalHeight||r.height);if(s>sc){sc=s;best={url:u,source:'overlap-image'}}}
    return best;
  }
  async function fetchBlob(t,min=10000){
    const r=await fetch(t.url,{credentials:'omit',mode:'cors',cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);const b=await r.blob();if(b.size<min)throw Error('파일이 너무 작음 '+b.size+'B');return{...t,blob:b,type:b.type||r.headers.get('content-type')||''};
  }
  async function firstFrame(){
    const g=selected||chooseGroup();if(!g?.video?.length)throw Error('영상 트랙 없음');const x=await fetchBlob(g.video[0],50000),u=URL.createObjectURL(x.blob),v=document.createElement('video');
    v.muted=true;v.playsInline=true;v.preload='auto';v.src=u;v.style='position:fixed;left:-9999px;top:-9999px;width:1px;height:1px';document.body.appendChild(v);
    try{await new Promise((ok,no)=>{const to=setTimeout(()=>no(Error('영상 로드 시간초과')),12000);v.onloadedmetadata=()=>{clearTimeout(to);ok()};v.onerror=()=>{clearTimeout(to);no(Error('영상 로드 실패'))}});try{v.currentTime=Math.min(.08,Math.max(.02,(v.duration||1)/20));await new Promise((ok,no)=>{const to=setTimeout(()=>no(Error('프레임 이동 시간초과')),7000);v.onseeked=()=>{clearTimeout(to);ok()};v.onerror=()=>{clearTimeout(to);no(Error('프레임 이동 실패'))}})}catch{}const w=v.videoWidth||0,h=v.videoHeight||0;if(!w||!h)throw Error('영상 크기 없음');const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(v,0,0,w,h);const b=await new Promise((ok,no)=>c.toBlob(z=>z?ok(z):no(Error('JPG 생성 실패')),'image/jpeg',.92));return{blob:b,type:'image/jpeg',source:'firstFrame'}}finally{v.remove();URL.revokeObjectURL(u)}
  }
  async function thumbBlob(){const c=coverUrl();if(c){try{const r=await fetch(c.url,{credentials:'omit',mode:'cors',cache:'no-store'}),b=await r.blob();if(r.ok&&/^image\//i.test(b.type)&&b.size>5000)return{blob:b,type:b.type,source:c.source}}catch{}}return firstFrame()}
  function code(){return currentId()?.code||(selected?.asset?`asset_${selected.asset}`:'media')}
  function dl(b,n){const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=n;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),10000)}
  function imgExt(t){t=String(t||'').toLowerCase();return t.includes('png')?'.png':t.includes('webp')?'.webp':t.includes('avif')?'.avif':'.jpg'}
  async function saveVideo(){set('영상 저장','WAIT','영상 트랙 받는 중');try{const g=selected||chooseGroup();if(!g?.video?.length)throw Error('영상 트랙 없음');const x=await fetchBlob(g.video[0],50000),n=`Instagram_${code()}_video.mp4`;dl(x.blob,n);set('영상 저장','PASS',`${n} · ${(x.blob.size/1048576).toFixed(1)}MB · 영상 전용`)}catch(e){set('영상 저장','FAIL',err(e))}}
  async function saveAudio(){set('음원 저장','WAIT','음원 트랙 받는 중');try{const g=selected||chooseGroup();if(!g?.audio?.length)throw Error('별도 음원 트랙 없음');const x=await fetchBlob(g.audio[0],5000),n=`Instagram_${code()}_audio.m4a`;dl(x.blob,n);set('음원 저장','PASS',`${n} · ${Math.round(x.blob.size/1024)}KB · ${Math.round((g.audio[0].bitrate||0)/1000)}kbps`)}catch(e){set('음원 저장','FAIL',err(e))}}
  async function saveThumb(){set('이미지 저장','WAIT','표지/첫 프레임 생성 중');try{const x=await thumbBlob(),n=`Instagram_${code()}_thumb${imgExt(x.type)}`;dl(x.blob,n);set('이미지 저장','PASS',`${n} · ${x.source} · ${Math.round(x.blob.size/1024)}KB`)}catch(e){set('이미지 저장','FAIL',err(e))}}

  function odb(){return new Promise((ok,no)=>{const q=indexedDB.open(DB,1);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains(ST))q.result.createObjectStore(ST)};q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error)})}
  async function put(k,v){const d=await odb();try{await new Promise((ok,no)=>{const q=d.transaction(ST,'readwrite').objectStore(ST).put(v,k);q.onsuccess=ok;q.onerror=()=>no(q.error)})}finally{d.close()}}
  async function get(k){const d=await odb();try{return await new Promise((ok,no)=>{const q=d.transaction(ST).objectStore(ST).get(k);q.onsuccess=()=>ok(q.result||null);q.onerror=()=>no(q.error)})}finally{d.close()}}
  async function chooseDir(){dir=await showDirectoryPicker({mode:'readwrite'});try{await put('dir',dir)}catch{}return dir}
  async function restore(request=false){try{const h=await get('dir');if(!h){set('폴더 복원','PARTIAL','저장된 폴더 없음');return null}let p=typeof h.queryPermission==='function'?await h.queryPermission({mode:'readwrite'}):'granted';if(p!=='granted'&&request&&typeof h.requestPermission==='function')p=await h.requestPermission({mode:'readwrite'});dir=h;set('폴더 복원',p==='granted'?'PASS':'PARTIAL',`${h.name||'폴더'} · permission=${p}`);return p==='granted'?h:null}catch(e){set('폴더 복원','FAIL',err(e));return null}}
  async function write(h,b,n){const f=await h.getFileHandle(n,{create:true}),w=await f.createWritable();await w.write(b);await w.close()}
  async function saveSetFolder(){set('세트 지정폴더','WAIT','영상·음원·이미지 저장 중');try{const h=dir||await chooseDir(),g=selected||chooseGroup();if(!g?.video?.length)throw Error('영상 트랙 없음');const vx=await fetchBlob(g.video[0],50000),base=`Instagram_${code()}`;await write(h,vx.blob,base+'_video.mp4');let a='음원 없음';if(g.audio?.length){const ax=await fetchBlob(g.audio[0],5000);await write(h,ax.blob,base+'_audio.m4a');a=`음원 ${Math.round(ax.blob.size/1024)}KB`}const tx=await thumbBlob(),tn=base+'_thumb'+imgExt(tx.type);await write(h,tx.blob,tn);set('세트 지정폴더','PASS',`${h.name||'폴더'} · 영상 ${(vx.blob.size/1048576).toFixed(1)}MB · ${a} · 이미지 ${Math.round(tx.blob.size/1024)}KB`)}catch(e){set('세트 지정폴더',e?.name==='AbortError'?'PARTIAL':'FAIL',e?.name==='AbortError'?'폴더 선택 취소 — 기능 실패 아님':err(e))}}
  async function saveSetDefault(){await saveVideo();await saveAudio();await saveThumb()}
  async function copy(){try{await navigator.clipboard.writeText(JSON.stringify({...R,url:location.href,selected},null,2));set('결과 복사','PASS','JSON 복사 완료')}catch(e){set('결과 복사','FAIL',err(e))}}
  function startCapture(){mark=performance.now();selected=null;set('포착','WAIT','이제 Reel을 1개 넘긴 뒤 재탐지');scan()}

  function ui(){
    box=document.createElement('div');box.style='position:fixed;z-index:2147483647;left:8px;right:8px;bottom:8px;max-height:80vh;overflow:auto;background:#111;color:#eee;border:1px solid #555;border-radius:14px;padding:10px;font:12px/1.45 system-ui;box-shadow:0 8px 30px #0009';
    box.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><b>RI 미디어 분리 저장 v${V}</b><button data-a="toggle">숨김</button></div><div style="opacity:.75;margin:6px 0">Reel 영상·음원·이미지를 같은 asset 기준으로 분리 저장</div><div id="ri05b"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px"><button data-a="scan">재탐지</button><button data-a="capture">새 Reel 포착</button><button data-a="v">영상 저장</button><button data-a="a">음원 저장</button><button data-a="t">이미지 저장</button><button data-a="set">3종 기본저장</button><button data-a="folder">3종 지정폴더</button><button data-a="restore">폴더 복원</button><button data-a="copy">결과 복사</button><button data-a="destroy">종료</button></div>`;
    document.documentElement.appendChild(box);body=box.querySelector('#ri05b');box.querySelectorAll('button').forEach(b=>b.onclick=()=>act(b.dataset.a));render();
  }
  function render(){if(!body)return;body.innerHTML=Object.entries(R.tests).map(([k,v])=>`<div style="border-top:1px solid #292929;padding:5px 0"><b style="display:inline-block;width:68px;color:${v.status==='PASS'?'#8ee6a8':v.status==='FAIL'?'#ff9b9b':v.status==='WAIT'?'#ddd':'#ffd979'}">${v.status}</b><b>${esc(k)}</b><div style="margin-left:68px;word-break:break-word;opacity:.9">${esc(v.detail)}</div></div>`).join('')}
  async function act(a){if(a==='toggle')toggle();if(a==='scan')scan();if(a==='capture')startCapture();if(a==='v')await saveVideo();if(a==='a')await saveAudio();if(a==='t')await saveThumb();if(a==='set')await saveSetDefault();if(a==='folder')await saveSetFolder();if(a==='restore')await restore(true);if(a==='copy')await copy();if(a==='destroy')destroy()}
  function toggle(){box.style.display=box.style.display==='none'?'':'none'}
  function destroy(){try{perfObs?.disconnect()}catch{}box?.remove();delete window[K]}
  try{perfObs=new PerformanceObserver(()=>{if(mark)setTimeout(scan,250)});perfObs.observe({type:'resource',buffered:false})}catch{}
  window[K]={toggle,destroy,report:R};ui();set('외부본체/Blob','PASS','v0.5 미디어 분리 저장 본체 실행 성공');restore(false);scan();
})();

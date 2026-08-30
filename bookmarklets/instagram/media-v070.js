(()=>{
  const K='__RIMEDIA070',V='0.7.0';
  if(window[K]){try{window[K].rescan();window[K].expand()}catch{}return}
  try{window.__RIMEDIA062?.destroy?.()}catch{}

  let mini=null,panel=null,body=null,selected=null,lockedId=null,lastCode='',scanTimer=null,recording=false;
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
    const base=window.__RI062_BASE_FETCH||window.__RI070_BASE_FETCH||window.fetch.bind(window);window.__RI070_BASE_FETCH=base;
    if(!window.__RI070_FETCH_HOOK){window.__RI070_FETCH_HOOK=true;window.fetch=async function(...args){const r=await base(...args);try{captureUrl(r.url||String(args[0]||''),'fetch-url');const ct=r.headers.get('content-type')||'',cl=Number(r.headers.get('content-length')||0);if(/json|text|graphql|javascript/i.test(ct)&&(!cl||cl<6000000))r.clone().text().then(t=>captureText(t,'fetch-body')).catch(()=>{})}catch{}return r}}
    if(!window.__RI070_XHR_HOOK){window.__RI070_XHR_HOOK=true;const XO=XMLHttpRequest.prototype.open,XS=XMLHttpRequest.prototype.send;XMLHttpRequest.prototype.open=function(m,u,...rest){this.__ri070url=u;return XO.call(this,m,u,...rest)};XMLHttpRequest.prototype.send=function(...args){if(!this.__ri070hook){this.__ri070hook=1;this.addEventListener('load',()=>{try{captureUrl(this.responseURL||this.__ri070url,'xhr-url');const ct=this.getResponseHeader('content-type')||'';if(/json|text|graphql/i.test(ct)){let t='';if(!this.responseType||this.responseType==='text')t=this.responseText;else if(this.responseType==='json')t=JSON.stringify(this.response);if(t&&t.length<6000000)captureText(t,'xhr-body')}}catch{}})}return XS.apply(this,args)}}
  }
  function groups(){seedPerformance();const gm=new Map();for(const c of captured.values()){const m=c.meta||meta(c.url),asset=assetId(m);if(!asset||asset==='null')continue;const type=classify(m),duration=Number(m.duration_s||0),bitrate=Number(m.bitrate||0);if(!gm.has(asset))gm.set(asset,{asset,video:[],audio:[],unknown:[],duration:0,latest:0});const g=gm.get(asset),t={...c,type,duration,bitrate};g.duration=Math.max(g.duration,duration||0);g.latest=Math.max(g.latest,c.at||0);g[type].push(t)}for(const g of gm.values()){g.video.sort((a,b)=>b.bitrate-a.bitrate);g.audio.sort((a,b)=>b.bitrate-a.bitrate);g.unknown.sort((a,b)=>b.at-a.at)}return[...gm.values()].sort((a,b)=>b.latest-a.latest)}
  function chooseGroup(){const gs=groups().filter(g=>g.video.length),v=visibleVideo(),vd=Number(v?.duration||0);if(!gs.length)return null;if(vd>0&&Number.isFinite(vd)){const close=gs.filter(g=>g.duration&&Math.abs(g.duration-vd)<2.5);if(close.length)return close.sort((a,b)=>Math.abs(a.duration-vd)-Math.abs(b.duration-vd)||b.latest-a.latest)[0]}return gs[0]||null}
  function clearActionState(){for(const k of ['영상만 저장','음원만 저장','대표 이미지 저장','영상+소리 저장'])delete R.tests[k]}
  function bestRecorderMime(){if(typeof MediaRecorder==='undefined')return'';const types=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];return types.find(t=>{try{return MediaRecorder.isTypeSupported(t)}catch{return false}})||''}
  function scan(){
    const id=currentId(),v=visibleVideo(),g=chooseGroup(),code=id?.code||'';
    if(code&&code!==lastCode){clearActionState();lastCode=code}
    selected=g;lockedId=id||null;R.selected=g;
    set('현재 Reel',id?.code?'PASS':'PARTIAL',id?`${id.kind}/${id.code}`:'콘텐츠 ID 미확정');
    set('현재 영상',v?'PASS':'PARTIAL',v?`${v.videoWidth||0}x${v.videoHeight||0} · ${Number(v.duration||0).toFixed(1)}s`:'보이는 video 없음');
    if(g){set('미디어 그룹','PASS',`asset …${g.asset.slice(-8)} · ${g.duration||'?'}s · 영상 ${g.video.length} · 음원 ${g.audio.length}`);set('영상 트랙',g.video.length?'PASS':'FAIL',g.video.length?`${Math.round((g.video[0].bitrate||0)/1000)}kbps · 원본 영상`:'없음');set('음원 트랙',g.audio.length?'PASS':'PARTIAL',g.audio.length?`${Math.round((g.audio[0].bitrate||0)/1000)}kbps · 원본 음원`:'없음')}
    else{set('미디어 그룹',v?'WAIT':'FAIL',v?'현재 Reel 미디어 수집 대기':'그룹 없음');set('영상 트랙',v?'WAIT':'FAIL',v?'수집 대기':'없음');set('음원 트랙','PARTIAL','없음');if(v)setTimeout(()=>scan(),900)}
    const mt=bestRecorderMime();set('영상+소리 기능',mt?'PASS':'PARTIAL',mt?`브라우저 결합 가능 · ${mt.split(';')[0]}`:'MediaRecorder 결합 미지원');
    set('대표 이미지','PARTIAL','실제 표지 우선 · 없으면 초반 선명 프레임 선택');updateMini();return g
  }
  function code(){return lockedId?.code||(selected?.asset?`asset_${selected.asset}`:'media')}
  async function fetchBlob(c,min=5000){if(!c?.url)throw Error('현재 미디어 없음');const base=window.__RI070_BASE_FETCH||window.fetch.bind(window),r=await base(c.url,{credentials:'omit',mode:'cors',cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);const b=await r.blob();if(b.size<min)throw Error('파일이 너무 작음 '+b.size+'B');return{...c,blob:b,mime:b.type||r.headers.get('content-type')||''}}
  function dl(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),12000)}
  async function saveVideo(){set('영상만 저장','WAIT','원본 영상 받는 중');try{const g=selected||scan();if(!g?.video?.length)throw Error('현재 영상 트랙 없음');const x=await fetchBlob(g.video[0],50000),n=`Instagram_${code()}_video.mp4`;dl(x.blob,n);set('영상만 저장','PASS',`${n} · ${(x.blob.size/1048576).toFixed(1)}MB`)}catch(e){set('영상만 저장','FAIL',err(e))}}
  async function saveAudio(){set('음원만 저장','WAIT','원본 음원 받는 중');try{const g=selected||scan();if(!g?.audio?.length)throw Error('현재 음원 트랙 없음');const x=await fetchBlob(g.audio[0],5000),n=`Instagram_${code()}_audio.m4a`;dl(x.blob,n);set('음원만 저장','PASS',`${n} · ${Math.round(x.blob.size/1024)}KB`)}catch(e){set('음원만 저장','FAIL',err(e))}}
  async function seek(v,t){if(Math.abs((v.currentTime||0)-t)<.015)return;v.currentTime=t;await new Promise((ok,no)=>{const to=setTimeout(()=>no(Error('seek timeout')),4500);v.onseeked=()=>{clearTimeout(to);ok()};v.onerror=()=>{clearTimeout(to);no(Error('seek fail'))}})}
  function sharpness(ctx,w,h){const d=ctx.getImageData(0,0,w,h).data;let s=0,n=0;const l=i=>.299*d[i]+.587*d[i+1]+.114*d[i+2];for(let y=1;y<h-1;y+=2)for(let x=1;x<w-1;x+=2){const i=(y*w+x)*4,v=4*l(i)-l(i-4)-l(i+4)-l(i-w*4)-l(i+w*4);s+=v*v;n++}return n?s/n:0}
  async function bestEarlyFrame(){const g=selected||scan();if(!g?.video?.length)throw Error('영상 트랙 없음');const x=await fetchBlob(g.video[0],50000),u=URL.createObjectURL(x.blob),v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='auto';v.src=u;v.style='position:fixed;left:-9999px;top:-9999px;width:2px;height:2px';document.body.appendChild(v);try{await new Promise((ok,no)=>{const to=setTimeout(()=>no(Error('영상 로드 시간초과')),12000);v.onloadedmetadata=()=>{clearTimeout(to);ok()};v.onerror=()=>{clearTimeout(to);no(Error('영상 로드 실패'))}});const dur=Number(v.duration||0),times=[.35,.65,.95,1.3,1.7,2.1,2.6,3.2].filter(t=>t<dur-.08);if(!times.length)times.push(Math.max(.03,Math.min(.25,dur/4)));const sw=180,sh=Math.max(100,Math.round(sw*(v.videoHeight||1280)/(v.videoWidth||720))),c=document.createElement('canvas');c.width=sw;c.height=sh;const ctx=c.getContext('2d',{willReadFrequently:true});let best=null;for(const t of times){try{await seek(v,t);ctx.drawImage(v,0,0,sw,sh);const score=sharpness(ctx,sw,sh);if(!best||score>best.score)best={t,score}}catch{}}if(!best)throw Error('선명 프레임 선택 실패');await seek(v,best.t);const full=document.createElement('canvas');full.width=v.videoWidth;full.height=v.videoHeight;full.getContext('2d').drawImage(v,0,0);const blob=await new Promise((ok,no)=>full.toBlob(z=>z?ok(z):no(Error('JPG 생성 실패')),'image/jpeg',.94));return{blob,time:best.t}}finally{v.remove();URL.revokeObjectURL(u)}}
  async function saveThumb(){set('대표 이미지 저장','WAIT','대표 이미지 만드는 중');try{const x=await bestEarlyFrame(),n=`Instagram_${code()}_thumb.jpg`;dl(x.blob,n);set('대표 이미지 저장','PASS',`${n} · ${x.time.toFixed(2)}s · ${Math.round(x.blob.size/1024)}KB`)}catch(e){set('대표 이미지 저장','FAIL',err(e))}}

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
      timer=setInterval(()=>{const p=Math.min(dur||video.duration||0,video.currentTime||0);set('영상+소리 저장','WAIT',`결합 중 ${p.toFixed(0)} / ${(dur||video.duration||0).toFixed(0)}초 · 재인코딩`)},1000);
      await new Promise((ok,no)=>{const max=((dur||video.duration||60)+8)*1000,to=setTimeout(()=>no(Error('결합 시간초과')),max);video.onended=()=>{clearTimeout(to);ok()}});
      try{source.stop()}catch{};await new Promise(r=>setTimeout(r,180));if(rec.state!=='inactive')rec.stop();await stopped;
      const out=new Blob(chunks,{type:rec.mimeType||mime});if(out.size<50000)throw Error('결합 파일 생성 실패');const isMp4=/mp4/i.test(out.type),ext=isMp4?'mp4':'webm',n=`Instagram_${code()}_video_audio.${ext}`;dl(out,n);set('영상+소리 저장','PASS',`${n} · ${(out.size/1048576).toFixed(1)}MB · ${isMp4?'MP4':'WebM'} · 영상+소리`);
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
  async function action(a){if(a==='collapse')collapse();else if(a==='rescan')rescan();else if(a==='video')await saveVideo();else if(a==='audio')await saveAudio();else if(a==='combo')await saveCombined();else if(a==='thumb')await saveThumb();else if(a==='copy'){try{await navigator.clipboard.writeText(JSON.stringify({...R,url:location.href},null,2));set('결과 복사','PASS','JSON 복사 완료')}catch(e){set('결과 복사','FAIL',err(e))}}else if(a==='destroy')destroy()}
  function ui(){mini=document.createElement('button');mini.style='display:none;position:fixed;z-index:2147483647;right:10px;bottom:86px;background:#111;color:#fff;border:1px solid #666;border-radius:18px;padding:8px 11px;font:12px system-ui';mini.onclick=()=>{rescan()};document.documentElement.appendChild(mini);panel=document.createElement('div');panel.style='position:fixed;z-index:2147483647;left:8px;right:8px;bottom:72px;max-height:44vh;overflow:auto;background:#111;color:#eee;border:1px solid #555;border-radius:14px;padding:10px;font:12px/1.45 system-ui;box-shadow:0 8px 30px #0009';panel.innerHTML=`<div style="position:sticky;top:-10px;background:#111;padding:4px 0 7px;z-index:2;display:flex;justify-content:space-between;align-items:center"><b>RI Reel 미디어 v${V}</b><button data-a="collapse">작게</button></div><div style="opacity:.75;margin:2px 0 6px">영상·음원 원본은 별도 보존 · 영상+소리는 브라우저에서 결합 저장</div><div id="ri070b"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px"><button data-a="rescan">현재 Reel 재탐지</button><button data-a="combo">영상+소리 저장</button><button data-a="video">영상만 저장</button><button data-a="audio">음원만 저장</button><button data-a="thumb">대표 이미지 저장</button><button data-a="copy">결과 복사</button><button data-a="destroy">종료</button></div>`;panel.addEventListener('click',e=>{const a=e.target?.dataset?.a;if(a)action(a)});document.documentElement.appendChild(panel);body=panel.querySelector('#ri070b')}
  installHooks();ui();set('외부 본체/Blob','PASS',`v${V} 실행 성공`);scan();window[K]={rescan,expand,collapse,destroy,report:R};
})();
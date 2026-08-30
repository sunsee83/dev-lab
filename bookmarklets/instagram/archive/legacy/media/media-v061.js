(()=> {
  const K='__RIMEDIA061', V='0.6.1';
  if (window[K]) {
    try { window[K].rescan(); window[K].expand(); } catch {}
    return;
  }
  try { window.__RIMEDIA06?.destroy?.(); } catch {}

  let mini=null, panel=null, body=null, selected=null, lockedId=null, combined=null;
  const R={version:V, tests:{}, selected:null};

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const err=e=>`${e?.name||'Error'}: ${e?.message||e||''}`;
  const set=(k,status,detail,extra=null)=>{
    R.tests[k]={status,detail,extra,at:new Date().toISOString()};
    render();
  };

  function routeId(){
    try{
      const m=location.pathname.match(/\/(reels?|p|tv)\/([^/?#]+)/i);
      return m?{kind:/reels?/i.test(m[1])?'reel':m[1].toLowerCase(),code:m[2]}:null;
    }catch{return null}
  }
  function nearbyId(){
    let best=null,score=-1;
    for(const a of document.querySelectorAll('a[href*="/reel/"],a[href*="/reels/"],a[href*="/p/"]')){
      const r=a.getBoundingClientRect();
      const x=Math.max(0,Math.min(r.right,innerWidth)-Math.max(r.left,0));
      const y=Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,0));
      const s=x*y;
      if(s<=score)continue;
      const m=a.pathname.match(/\/(reels?|p|tv)\/([^/?#]+)/i);
      if(m){score=s;best={kind:/reels?/i.test(m[1])?'reel':m[1].toLowerCase(),code:m[2]};}
    }
    return best;
  }
  function currentId(){return routeId()||nearbyId()}
  function visibleVideo(){
    return [...document.querySelectorAll('video')]
      .map(v=>{
        const r=v.getBoundingClientRect();
        const x=Math.max(0,Math.min(r.right,innerWidth)-Math.max(r.left,0));
        const y=Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,0));
        return [v,x*y];
      })
      .filter(x=>x[1]>0)
      .sort((a,b)=>b[1]-a[1])[0]?.[0]||null;
  }
  function b64json(s){
    try{
      let x=String(s||'').replace(/-/g,'+').replace(/_/g,'/');
      while(x.length%4)x+='=';
      const bin=atob(x),u=new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
      return JSON.parse(new TextDecoder().decode(u));
    }catch{return null}
  }
  function meta(url){
    try{return b64json(new URL(url).searchParams.get('efg'))||{}}
    catch{return {}}
  }
  function canon(url){
    try{
      const u=new URL(url);
      u.searchParams.delete('bytestart');
      u.searchParams.delete('byteend');
      return u.href;
    }catch{return String(url||'')}
  }
  function classify(m,url){
    const tag=String(m?.vencode_tag||'').toLowerCase();
    if(/audio|aac|heaac/.test(tag))return'audio';
    if(/video|baseline|clips|xpvds/.test(tag))return'video';
    if(/\.mp4(?:[?#]|$)/i.test(url))return'unknown';
    return'unknown';
  }
  function assetId(m){return String(m?.xpv_asset_id||m?.asset_id||'')}
  function scanGroups(){
    const now=performance.now(), groups=new Map(), seen=new Set();
    const entries=performance.getEntriesByType?.('resource')||[];
    for(const e of entries){
      const raw=e.name||'';
      if(now-e.startTime>180000)continue;
      if(!/^https?:/i.test(raw)||!/(cdninstagram|fbcdn)/i.test(raw)||!/\.mp4(?:[?#]|$)/i.test(raw))continue;
      const url=canon(raw);
      if(seen.has(url))continue;
      seen.add(url);
      const m=meta(url), asset=assetId(m);
      if(!asset||asset==='null')continue;
      const type=classify(m,url), bitrate=Number(m.bitrate||0), duration=Number(m.duration_s||0);
      if(!groups.has(asset))groups.set(asset,{asset,video:[],audio:[],unknown:[],latest:0,duration:0});
      const g=groups.get(asset);
      const t={url,meta:m,type,bitrate,duration,startTime:e.startTime,source:`performance:${e.initiatorType||'resource'}`};
      g.latest=Math.max(g.latest,e.startTime);
      g.duration=Math.max(g.duration,duration||0);
      g[type].push(t);
    }
    for(const g of groups.values()){
      g.video.sort((a,b)=>(b.bitrate||0)-(a.bitrate||0));
      g.audio.sort((a,b)=>(b.bitrate||0)-(a.bitrate||0));
      g.unknown.sort((a,b)=>b.startTime-a.startTime);
    }
    return [...groups.values()].sort((a,b)=>b.latest-a.latest);
  }
  function chooseGroup(){
    const gs=scanGroups().filter(g=>g.video.length);
    if(!gs.length)return null;
    const v=visibleVideo(),vd=Number(v?.duration||0);
    let pool=gs;
    if(vd>0&&Number.isFinite(vd)){
      const close=gs.filter(g=>g.duration&&Math.abs(g.duration-vd)<2.5);
      if(close.length)pool=close;
      pool.sort((a,b)=>{
        const da=a.duration?Math.abs(a.duration-vd):9999;
        const db=b.duration?Math.abs(b.duration-vd):9999;
        return da-db||b.latest-a.latest;
      });
    }else{
      pool.sort((a,b)=>b.latest-a.latest);
    }
    return pool[0]||null;
  }

  async function fetchBlob(c,min=5000){
    const r=await fetch(c.url,{credentials:'omit',mode:'cors',cache:'no-store'});
    if(!r.ok)throw Error('HTTP '+r.status);
    const b=await r.blob();
    if(b.size<min)throw Error('파일이 너무 작음 '+b.size+'B');
    return {...c,blob:b,mime:b.type||r.headers.get('content-type')||''};
  }

  function mp4Kinds(ab){
    const dv=new DataView(ab),out=new Set(),containers=new Set(['moov','trak','mdia','minf','stbl','edts','dinf','moof','traf','mvex','udta','meta']);
    const typ=p=>String.fromCharCode(dv.getUint8(p),dv.getUint8(p+1),dv.getUint8(p+2),dv.getUint8(p+3));
    function walk(a,b,depth){
      let p=a,n=0;
      while(p+8<=b&&n++<5000){
        let size=dv.getUint32(p),head=8;
        if(size===1&&p+16<=b){
          const hi=dv.getUint32(p+8),lo=dv.getUint32(p+12);
          size=hi*4294967296+lo;head=16;
        }else if(size===0)size=b-p;
        if(!Number.isFinite(size)||size<head||p+size>b)break;
        const t=typ(p+4);
        if(t==='hdlr'&&p+head+12<=p+size){
          const h=typ(p+head+8);
          if(h==='vide'||h==='soun')out.add(h);
        }
        if(containers.has(t)&&depth<8){
          let st=p+head;if(t==='meta')st+=4;
          walk(st,p+size,depth+1);
        }
        p+=size;
      }
    }
    walk(0,dv.byteLength,0);
    return [...out];
  }
  async function mediaMeta(blob){
    const u=URL.createObjectURL(blob),v=document.createElement('video');
    v.preload='metadata';v.muted=true;v.playsInline=true;v.src=u;
    try{
      return await new Promise((ok,no)=>{
        const to=setTimeout(()=>no(Error('metadata timeout')),10000);
        v.onloadedmetadata=()=>{clearTimeout(to);ok({duration:Number(v.duration||0),w:v.videoWidth||0,h:v.videoHeight||0})};
        v.onerror=()=>{clearTimeout(to);no(Error('metadata load fail'))};
      });
    }finally{URL.revokeObjectURL(u)}
  }
  async function inspectCandidate(c){
    const x=await fetchBlob(c,10000);
    const kinds=mp4Kinds(await x.blob.arrayBuffer());
    let mm={duration:0,w:0,h:0};
    try{mm=await mediaMeta(x.blob)}catch{}
    return {...x,kinds,...mm};
  }

  function scan(){
    combined=null;
    const id=currentId(),v=visibleVideo(),g=chooseGroup();
    selected=g;lockedId=id||null;R.selected=g;
    set('현재 Reel',id?.code?'PASS':'PARTIAL',id?`${id.kind}/${id.code}`:'콘텐츠 ID 미확정');
    set('현재 영상',v?'PASS':'PARTIAL',v?`${v.videoWidth||0}x${v.videoHeight||0} · ${Number(v.duration||0).toFixed(1)}s`:'보이는 video 없음');
    set('영상 트랙',g?.video?.length?'PASS':'FAIL',g?.video?.length?`${Math.round((g.video[0].bitrate||0)/1000)}kbps · 영상 전용`:'영상 트랙 없음');
    set('음원 트랙',g?.audio?.length?'PASS':'PARTIAL',g?.audio?.length?`${Math.round((g.audio[0].bitrate||0)/1000)}kbps · 음원 전용`:'음원 트랙 없음');
    set('영상+소리', 'PARTIAL', '아직 원본 미확인');
    updateMini();
    return g;
  }
  function code(){return lockedId?.code||(selected?.asset?`asset_${selected.asset}`:'media')}

  async function findAV(){
    set('영상+소리','WAIT','영상+소리가 한 파일인 원본 찾는 중');
    const g=selected||scan();
    if(!g)throw Error('현재 Reel 미디어 그룹 없음');
    const candidates=[...g.unknown,...g.video]
      .filter((x,i,a)=>a.findIndex(y=>y.url===x.url)===i)
      .slice(0,8);
    const vd=Number(visibleVideo()?.duration||g.duration||0);
    for(const c of candidates){
      try{
        const x=await inspectCandidate(c);
        if(x.kinds.includes('vide')&&x.kinds.includes('soun')&&(!vd||!x.duration||Math.abs(x.duration-vd)<2.5)){
          combined=x;
          set('영상+소리','PASS',`${(x.blob.size/1048576).toFixed(1)}MB · ${x.w||'?'}x${x.h||'?'} · ${x.duration?x.duration.toFixed(1):'?'}s`);
          return x;
        }
      }catch{}
    }
    combined=null;
    set('영상+소리','PARTIAL','한 파일 원본 없음 → 영상+음원 결합 기능 필요');
    return null;
  }

  async function seek(v,t){
    if(Math.abs((v.currentTime||0)-t)<.015)return;
    v.currentTime=t;
    await new Promise((ok,no)=>{
      const to=setTimeout(()=>no(Error('seek timeout')),4500);
      v.onseeked=()=>{clearTimeout(to);ok()};
      v.onerror=()=>{clearTimeout(to);no(Error('seek fail'))};
    });
  }
  function sharpness(ctx,w,h){
    const d=ctx.getImageData(0,0,w,h).data;
    let sum=0,sum2=0,n=0;
    const lum=(i)=>.299*d[i]+.587*d[i+1]+.114*d[i+2];
    for(let y=1;y<h-1;y+=2){
      for(let x=1;x<w-1;x+=2){
        const i=(y*w+x)*4;
        const l=lum(i), l1=lum(i-4), l2=lum(i+4), l3=lum(i-w*4), l4=lum(i+w*4);
        const lap=4*l-l1-l2-l3-l4;
        sum+=lap;sum2+=lap*lap;n++;
      }
    }
    if(!n)return 0;
    const mean=sum/n;
    return sum2/n-mean*mean;
  }
  async function bestEarlyFrame(){
    const g=selected||scan();
    if(!g?.video?.length)throw Error('영상 트랙 없음');
    const x=await fetchBlob(g.video[0],50000),u=URL.createObjectURL(x.blob),v=document.createElement('video');
    v.muted=true;v.playsInline=true;v.preload='auto';v.src=u;
    v.style='position:fixed;left:-9999px;top:-9999px;width:2px;height:2px';
    document.body.appendChild(v);
    try{
      await new Promise((ok,no)=>{
        const to=setTimeout(()=>no(Error('영상 로드 시간초과')),12000);
        v.onloadedmetadata=()=>{clearTimeout(to);ok()};
        v.onerror=()=>{clearTimeout(to);no(Error('영상 로드 실패'))};
      });
      const dur=Number(v.duration||0);
      const times=[.35,.7,1.05,1.4,1.8,2.2,2.7,3.2].filter(t=>t<dur-.08);
      if(!times.length)times.push(Math.max(.03,Math.min(.25,dur/4)));
      const sw=180,sh=Math.max(100,Math.round(sw*(v.videoHeight||1280)/(v.videoWidth||720)));
      const c=document.createElement('canvas');c.width=sw;c.height=sh;
      const ctx=c.getContext('2d',{willReadFrequently:true});
      let best=null;
      for(const t of times){
        try{
          await seek(v,t);ctx.drawImage(v,0,0,sw,sh);
          const score=sharpness(ctx,sw,sh);
          if(!best||score>best.score)best={t,score};
        }catch{}
      }
      if(!best)throw Error('선명 프레임 선택 실패');
      await seek(v,best.t);
      const full=document.createElement('canvas');full.width=v.videoWidth;full.height=v.videoHeight;
      full.getContext('2d').drawImage(v,0,0);
      const blob=await new Promise((ok,no)=>full.toBlob(z=>z?ok(z):no(Error('JPG 생성 실패')),'image/jpeg',.94));
      return{blob,time:best.t};
    }finally{v.remove();URL.revokeObjectURL(u)}
  }

  function dl(blob,name){
    const u=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(u),10000);
  }
  async function saveVideo(){
    set('영상 저장','WAIT','영상 받는 중');
    try{
      const g=selected||scan();if(!g?.video?.length)throw Error('영상 트랙 없음');
      const x=await fetchBlob(g.video[0],50000),n=`Instagram_${code()}_video.mp4`;
      dl(x.blob,n);set('영상 저장','PASS',`${n} · ${(x.blob.size/1048576).toFixed(1)}MB · 무음 영상`);
    }catch(e){set('영상 저장','FAIL',err(e))}
  }
  async function saveAudio(){
    set('음원 저장','WAIT','음원 받는 중');
    try{
      const g=selected||scan();if(!g?.audio?.length)throw Error('음원 트랙 없음');
      const x=await fetchBlob(g.audio[0],5000),n=`Instagram_${code()}_audio.m4a`;
      dl(x.blob,n);set('음원 저장','PASS',`${n} · ${Math.round(x.blob.size/1024)}KB`);
    }catch(e){set('음원 저장','FAIL',err(e))}
  }
  async function saveAV(){
    set('영상+소리 저장','WAIT','원본 확인 중');
    try{
      const x=combined||await findAV();
      if(!x){set('영상+소리 저장','PARTIAL','한 파일 원본 없음 — 다음 단계에서 결합 구현');return}
      const n=`Instagram_${code()}_video_audio.mp4`;dl(x.blob,n);
      set('영상+소리 저장','PASS',`${n} · ${(x.blob.size/1048576).toFixed(1)}MB`);
    }catch(e){set('영상+소리 저장','FAIL',err(e))}
  }
  async function saveThumb(){
    set('대표 이미지 저장','WAIT','초반 선명 프레임 비교 중');
    try{
      const x=await bestEarlyFrame(),n=`Instagram_${code()}_thumb.jpg`;
      dl(x.blob,n);set('대표 이미지 저장','PASS',`${n} · ${x.time.toFixed(2)}s · ${Math.round(x.blob.size/1024)}KB`);
    }catch(e){set('대표 이미지 저장','FAIL',err(e))}
  }

  function statusColor(s){return s==='PASS'?'#8ee6a8':s==='FAIL'?'#ff9b9b':s==='WAIT'?'#eee':'#ffd979'}
  function render(){
    if(!body)return;
    body.innerHTML=Object.entries(R.tests).map(([k,v])=>
      `<div style="border-top:1px solid #292929;padding:6px 0">
        <b style="display:inline-block;width:64px;color:${statusColor(v.status)}">${esc(v.status)}</b>
        <b>${esc(k)}</b>
        <div style="margin-left:64px;opacity:.9;word-break:break-word">${esc(v.detail)}</div>
      </div>`).join('');
  }
  function updateMini(){
    if(!mini)return;
    const id=lockedId?.code||'Reel';
    const ok=selected?.video?.length?'●':'○';
    const s=mini.querySelector('[data-status]');
    if(s)s.textContent=`${ok} ${id}`;
  }
  function expand(){panel.style.display='block';mini.style.display='none'}
  function collapse(){panel.style.display='none';mini.style.display='flex'}
  function destroy(){mini?.remove();panel?.remove();delete window[K]}
  function rescan(){
    combined=null;selected=null;lockedId=null;
    scan();expand();
  }

  function ui(){
    mini=document.createElement('div');
    mini.style='position:fixed;z-index:2147483647;right:10px;bottom:86px;display:flex;align-items:center;gap:6px;background:#111;color:#eee;border:1px solid #555;border-radius:999px;padding:7px 9px;font:12px/1.2 system-ui;box-shadow:0 4px 16px #0008';
    mini.innerHTML=`<span data-status>RI Reel</span><button data-a="rescan" style="min-width:38px">↻</button><button data-a="expand">열기</button>`;

    panel=document.createElement('div');
    panel.style='position:fixed;z-index:2147483647;left:8px;right:8px;bottom:82px;max-height:42vh;overflow:auto;background:#111;color:#eee;border:1px solid #555;border-radius:14px;padding:10px;font:12px/1.45 system-ui;box-shadow:0 8px 30px #0009';
    panel.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;position:sticky;top:-10px;background:#111;padding:4px 0 7px;z-index:2">
      <b>RI Reel 미디어 v${V}</b>
      <div><button data-a="collapse">작게</button> <button data-a="destroy">종료</button></div>
    </div>
    <div style="opacity:.72;margin-bottom:7px">작게 → Reel 넘기기 → 북마클릿 다시 누르면 자동 재탐지</div>
    <div id="ri061body"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px">
      <button data-a="rescan">현재 Reel 재탐지</button>
      <button data-a="findav">영상+소리 찾기</button>
      <button data-a="savev">영상만 저장</button>
      <button data-a="savea">음원만 저장</button>
      <button data-a="saveav">영상+소리 저장</button>
      <button data-a="thumb">대표 이미지 저장</button>
      <button data-a="collapse">작게</button>
    </div>`;
    document.documentElement.append(mini,panel);
    body=panel.querySelector('#ri061body');

    const click=async e=>{
      const b=e.target.closest('button[data-a]');if(!b)return;
      const a=b.dataset.a;
      b.disabled=true;
      try{
        if(a==='rescan')rescan();
        else if(a==='findav')await findAV();
        else if(a==='savev')await saveVideo();
        else if(a==='savea')await saveAudio();
        else if(a==='saveav')await saveAV();
        else if(a==='thumb')await saveThumb();
        else if(a==='collapse')collapse();
        else if(a==='expand')expand();
        else if(a==='destroy')destroy();
      }finally{if(b.isConnected)b.disabled=false}
    };
    mini.addEventListener('click',click);
    panel.addEventListener('click',click);
  }

  window[K]={rescan,expand,collapse,destroy,report:R};
  ui();
  scan();
  expand();
})()
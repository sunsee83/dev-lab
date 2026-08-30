(()=>{
  const KEY='__RISAVEUI082',CORE='__RISAVECORE081',UV='0.8.2';
  try{window.__RISAVEUI081?.destroy?.()}catch{};
  try{window[KEY]?.destroy?.()}catch{};
  const C=window[CORE];
  if(!C){alert('RI 저장 코어 로딩 실패');return}

  let panel,mini,body,actions,storage,obs,off;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const btn=(a,label,disabled=false)=>`<button data-a="${a}" ${disabled?'disabled':''} style="min-height:38px;border:1px solid #555;border-radius:9px;background:${disabled?'#222':'#2b2b2b'};color:${disabled?'#777':'#fff'};font:12px system-ui;padding:7px 5px">${label}</button>`;

  function typeNow(){return C.current?.type||''}
  function render(st){
    if(body)body.innerHTML=Object.entries(st).map(([k,v])=>`<div style="border-top:1px solid #292929;padding:5px 0"><b style="display:inline-block;width:67px;color:${v.status==='PASS'?'#8ee6a8':v.status==='FAIL'?'#ff9b9b':v.status==='WAIT'?'#ddd':'#ffd979'}">${v.status}</b><b>${esc(k)}</b><div style="margin-left:67px;word-break:break-word;opacity:.9">${esc(v.detail)}</div></div>`).join('');
    renderActions();updateMini();
  }

  function renderActions(){
    if(!actions)return;
    const t=typeNow(),known=!!t;
    actions.innerHTML=
      btn('video','영상 저장',known&&t!=='video')+
      btn('audio','음원 저장',known&&t!=='video')+
      btn('image','이미지 저장',known&&t!=='video')+
      btn('photo','사진 저장',known&&t!=='photo')+
      btn('all','캐러셀 전체 저장',known&&t!=='carousel');
    if(storage)storage.innerHTML=
      btn('folder','저장 폴더 지정')+
      btn('default','기본 다운로드')+
      (typeof showSaveFilePicker==='function'?btn('prompt','매번 선택'):'')+
      btn('scan','현재 콘텐츠 재탐지')+
      btn('copy','결과 복사')+
      btn('destroy','종료');
  }

  function updateMini(){if(mini)mini.textContent=`RI ${UV} · ${(C.currentId()?.code||'-').slice(-8)}`}
  function collapse(){if(panel)panel.style.display='none';if(mini)mini.style.display='block'}
  function expand(){if(panel)panel.style.display='flex';if(mini)mini.style.display='none'}

  async function act(a){
    try{
      if(a==='collapse')return collapse();
      if(a==='scan')return await C.scan(true);
      if(a==='folder')return await C.chooseDir();
      if(a==='default')return C.setMode('default');
      if(a==='prompt')return C.setMode('prompt');
      if(a==='copy')return await navigator.clipboard.writeText(JSON.stringify({...C.snapshot(),url:location.href},null,2));
      if(a==='destroy')return destroy();

      if(!C.current)await C.scan(true);
      if(a==='video')return await C.saveVideo();
      if(a==='audio')return await C.saveAudio();
      if(a==='image')return await C.saveImage();
      if(a==='photo')return await C.savePhoto();
      if(a==='all')return await C.saveCarousel();
    }catch(e){if(e?.name!=='AbortError')console.warn('[RI save]',e)}
  }

  function cards(){
    for(const a of document.querySelectorAll('a[href*="/reel/"],a[href*="/reels/"],a[href*="/p/"]')){
      if(a.querySelector(':scope > .ri82-save'))continue;
      const r=a.getBoundingClientRect();
      if(r.width<50||r.height<50||r.width>innerWidth*.48||r.height>innerHeight*.5||!a.querySelector('img'))continue;
      const m=(a.getAttribute('href')||'').match(/\/(reels?|p)\/([^/?#]+)/i);if(!m)continue;
      const b=document.createElement('button');b.className='ri82-save';b.textContent='저장';
      b.style='position:absolute;left:4px;bottom:4px;z-index:7;border:0;border-radius:10px;padding:4px 7px;background:#000c;color:#fff;font:11px system-ui';
      if(getComputedStyle(a).position==='static')a.style.position='relative';
      b.onclick=async e=>{e.preventDefault();e.stopPropagation();const old=b.textContent;b.textContent='…';b.disabled=true;try{if(C.saveMode==='prompt')throw Error('빠른 저장은 기본/지정 폴더 모드 사용');const model=await C.resolve(m[2],/reels?/i.test(m[1])?'reel':'p');await C.savePrimary(model);b.textContent='✓'}catch{b.textContent='!'}setTimeout(()=>{b.textContent=old;b.disabled=false},1300)};
      a.appendChild(b);
    }
  }

  function destroy(){
    try{off?.();obs?.disconnect();panel?.remove();mini?.remove();document.querySelectorAll('.ri82-save').forEach(x=>x.remove())}catch{}
    delete window[KEY];
  }

  function ui(){
    mini=document.createElement('button');
    mini.style='display:none;position:fixed;z-index:2147483647;right:10px;bottom:86px;background:#111;color:#fff;border:1px solid #666;border-radius:18px;padding:8px 11px;font:12px system-ui';
    mini.onclick=()=>{C.scan(true);expand()};document.documentElement.appendChild(mini);

    panel=document.createElement('div');
    panel.style='position:fixed;z-index:2147483647;left:8px;right:8px;bottom:72px;height:min(480px,58vh);display:flex;flex-direction:column;background:#111;color:#eee;border:1px solid #555;border-radius:14px;padding:10px;font:12px/1.45 system-ui;box-shadow:0 8px 30px #0009;box-sizing:border-box';
    panel.innerHTML=`
      <div style="flex:0 0 auto;display:flex;justify-content:space-between;align-items:center;padding:2px 0 7px"><b>RI 저장 v${UV}</b><button data-a="collapse">작게</button></div>
      <div style="flex:0 0 auto;opacity:.75;margin:0 0 5px">다운로드 버튼은 항상 하단에 고정됩니다.</div>
      <div id="ri82body" style="flex:1 1 auto;min-height:0;overflow:auto;padding-right:2px"></div>
      <div style="flex:0 0 auto;border-top:1px solid #444;margin-top:6px;padding-top:7px;background:#111">
        <div id="ri82actions" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px"></div>
        <details style="margin-top:6px"><summary style="cursor:pointer;padding:3px 0">저장 위치 · 기타</summary><div id="ri82storage" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:6px"></div></details>
      </div>`;
    panel.addEventListener('click',e=>{const a=e.target?.dataset?.a;if(a)act(a)});
    document.documentElement.appendChild(panel);
    body=panel.querySelector('#ri82body');actions=panel.querySelector('#ri82actions');storage=panel.querySelector('#ri82storage');
    renderActions();
  }

  ui();
  off=C.subscribe(render);
  cards();
  obs=new MutationObserver(()=>{clearTimeout(cards.t);cards.t=setTimeout(cards,250)});
  obs.observe(document.documentElement,{subtree:true,childList:true});
  C.scan(true);
  window[KEY]={destroy,expand,collapse};
})();

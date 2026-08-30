(()=>{
  const PATCH='0.7.2';
  const apply=()=>{
    const panels=[...document.querySelectorAll('div')].filter(el=>/RI Reel 미디어 v0\.7\.1/.test(el.textContent||''));
    const panel=panels.sort((a,b)=>(a.textContent||'').length-(b.textContent||'').length)[0];
    if(!panel)return false;
    for(const b of panel.querySelectorAll('button')){
      const a=b.dataset?.a;
      if(a==='combo') b.textContent='영상 저장';
      else if(a==='video') b.style.display='none';
      else if(a==='audio') b.textContent='음원 저장';
      else if(a==='thumb') b.textContent='이미지 저장';
    }
    const walker=document.createTreeWalker(panel,NodeFilter.SHOW_TEXT);
    const reps=[
      ['RI Reel 미디어 v0.7.1','RI Reel 미디어 v'+PATCH],
      ['영상+소리 저장','영상 저장'],
      ['영상만 저장','원본 영상(내부)'],
      ['음원만 저장','음원 저장'],
      ['첫 프레임 저장','이미지 저장'],
      ['영상·음원 원본은 별도 보존 · 영상+소리는 브라우저에서 결합 저장','영상은 소리 포함으로 저장 · 음원과 이미지는 필요할 때 별도 저장']
    ];
    let n;while((n=walker.nextNode())){let t=n.nodeValue;for(const [a,b] of reps)t=t.split(a).join(b);if(t!==n.nodeValue)n.nodeValue=t}
    return true;
  };
  let tries=0;const tick=()=>{if(apply()||tries++>20)return;setTimeout(tick,120)};tick();
  const mo=new MutationObserver(()=>apply());mo.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  window.__RI_UI_PATCH_072={version:PATCH,apply,stop:()=>mo.disconnect()};
})();
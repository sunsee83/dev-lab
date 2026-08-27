(() => {
  'use strict';
  const RI=globalThis.__RI;if(!RI||RI.state.started)return;RI.state.started=true;
  const boot=()=>{try{RI.grid.start();RI.ui.start();}catch(e){console.error('[Reels Inspector] boot error',e);}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  const route=RI.debounce(()=>{if(location.href!==RI.state.url){RI.state.url=location.href;RI.grid.scan();RI.ui.sync();}},120);
  new MutationObserver(route).observe(document.documentElement,{childList:true,subtree:true});
  setInterval(route,700);
  console.log(`[Reels Inspector] ${RI.version} loaded`);
})();

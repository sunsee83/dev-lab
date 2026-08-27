(() => {
  'use strict';
  const RI = globalThis.__RI = globalThis.__RI || {};
  RI.version = typeof __RI_VERSION === 'string' ? __RI_VERSION : 'dev';
  RI.state = RI.state || {
    posts: new Map(), fetches: new Map(), gridItems: new Map(), netCount: 0,
    url: location.href, settings: {}, started: false
  };
  const RESERVED = new Set(['reels','reel','explore','direct','accounts','stories','p','about','developer','web','privacy','legal']);
  RI.reserved = RESERVED;
  RI.num = v => Number.isFinite(Number(v)) ? Number(v) : null;
  RI.first = (...v) => v.find(x => x !== null && x !== undefined && x !== '') ?? null;
  RI.visible = el => {
    if (!el || !el.isConnected) return false;
    const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    return r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < innerHeight && s.display !== 'none' && s.visibility !== 'hidden';
  };
  RI.codeFromUrl = url => { const m = String(url || '').match(/\/(?:reel|reels|p)\/([A-Za-z0-9_-]+)/); return m ? m[1] : null; };
  RI.canonical = code => `https://www.instagram.com/reel/${code}/`;
  RI.cleanUrl = s => String(s || '').replace(/\\u0026/g, '&').replace(/\\\//g, '/').replace(/&amp;/g, '&');
  RI.parseCount = value => {
    if (value == null) return null;
    const s = String(value).trim().replace(/,/g, '').replace(/\s+/g, '');
    const m = s.match(/(-?\d+(?:\.\d+)?)(억|만|천|[KkMmBb])?/); if (!m) return null;
    let n = Number(m[1]); const u = m[2];
    if (u === '천' || /k/i.test(u || '')) n *= 1e3; else if (u === '만') n *= 1e4; else if (u === '억') n *= 1e8; else if (/m/i.test(u || '')) n *= 1e6; else if (/b/i.test(u || '')) n *= 1e9;
    return Number.isFinite(n) ? Math.round(n) : null;
  };
  RI.fmt = n => { n = RI.num(n); if (n == null) return ''; const a=Math.abs(n); if(a>=1e8)return `${(n/1e8).toFixed(a>=1e9?1:2).replace(/\.0+$/,'')}억`; if(a>=1e4)return `${(n/1e4).toFixed(a>=1e5?1:2).replace(/\.0+$/,'')}만`; if(a>=1e3)return `${(n/1e3).toFixed(1).replace(/\.0$/,'')}K`; return Math.round(n).toLocaleString('ko-KR'); };
  RI.dateLabel = value => { if(!value)return ''; let d; if(typeof value==='number')d=new Date(value<2e10?value*1000:value); else if(/^\d{4}-\d{2}-\d{2}$/.test(String(value)))d=new Date(`${value}T12:00:00`); else d=new Date(value); if(Number.isNaN(d.getTime()))return ''; const days=Math.max(0,Math.floor((Date.now()-d.getTime())/86400000)); if(days===0)return '오늘'; if(days<7)return `${days}일`; if(days<35)return `${Math.floor(days/7)}주`; return `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  RI.median = arr => { const a=arr.filter(Number.isFinite).sort((x,y)=>x-y); if(!a.length)return null; const m=Math.floor(a.length/2); return a.length%2?a[m]:(a[m-1]+a[m])/2; };
  RI.safeName = s => String(s || 'instagram').replace(/[\\/:*?"<>|]+/g,'_').slice(0,120);
  RI.debounce = (fn,ms=250)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);};};
  RI.merge = (base={},next={}) => { const out={...base}; for(const [k,v] of Object.entries(next||{})) if(v!==null&&v!==undefined&&v!=='') out[k]=v; return out; };
  RI.mergePost = (code,next)=>{ if(!code)return next||{}; const merged=RI.merge(RI.state.posts.get(code)||{code},next||{}); RI.state.posts.set(code,merged); try{document.dispatchEvent(new CustomEvent('ri:post',{detail:{code,data:merged}}));}catch{} return merged; };
  RI.on=(name,fn)=>document.addEventListener(`ri:${name}`,fn); RI.emit=(name,detail={})=>document.dispatchEvent(new CustomEvent(`ri:${name}`,{detail}));
  RI.queue=(()=>{let active=0;const jobs=[];const max=2;const pump=()=>{while(active<max&&jobs.length){const{fn,resolve,reject}=jobs.shift();active++;Promise.resolve().then(fn).then(resolve,reject).finally(()=>{active--;pump();});}};return fn=>new Promise((resolve,reject)=>{jobs.push({fn,resolve,reject});pump();});})();
  RI.download=(url,name)=>new Promise((resolve,reject)=>{if(!url)return reject(new Error('URL 없음'));try{GM_download({url,name:RI.safeName(name),saveAs:false,onload:resolve,onerror:reject,ontimeout:reject});}catch(e){reject(e);}});
  RI.copy=text=>{try{GM_setClipboard(String(text??''),'text');RI.toast('복사했습니다');return true;}catch{return false;}};
  RI.toast=msg=>{let el=document.getElementById('ri-toast');if(!el){el=document.createElement('div');el.id='ri-toast';Object.assign(el.style,{position:'fixed',left:'50%',bottom:'88px',transform:'translateX(-50%)',zIndex:2147483647,background:'rgba(20,20,20,.92)',color:'#fff',padding:'9px 13px',borderRadius:'12px',fontSize:'13px',fontWeight:'700',maxWidth:'82vw',textAlign:'center',pointerEvents:'none'});document.documentElement.appendChild(el);}el.textContent=msg;el.style.opacity='1';clearTimeout(RI._toastT);RI._toastT=setTimeout(()=>{if(el)el.style.opacity='0';},1800);};
  RI.currentDetail=()=>/\/(?:reel|reels|p)\/[A-Za-z0-9_-]+/.test(location.pathname);
})();

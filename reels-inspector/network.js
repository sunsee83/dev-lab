(() => {
  'use strict';
  const RI = globalThis.__RI;
  if (!RI || RI.net?.installed) return;

  const asNum = v => Number.isFinite(Number(v)) ? Number(v) : null;
  const firstNum = (o, keys) => { for (const k of keys) { const n=asNum(o?.[k]); if(n!=null)return n; } return null; };
  const firstStr = (o, keys) => { for (const k of keys) { const v=o?.[k]; if(typeof v==='string'&&v)return v; } return null; };
  const mediaFrom = o => {
    let videoUrl=firstStr(o,['video_url']);
    if(!videoUrl&&Array.isArray(o?.video_versions))videoUrl=o.video_versions.find(x=>x?.url)?.url||null;
    let thumbUrl=firstStr(o,['display_url','thumbnail_src','image_url']);
    if(!thumbUrl&&Array.isArray(o?.image_versions2?.candidates))thumbUrl=o.image_versions2.candidates.find(x=>x?.url)?.url||null;
    return {videoUrl:RI.cleanUrl(videoUrl),thumbUrl:RI.cleanUrl(thumbUrl)};
  };
  const normalize = o => {
    if(!o||typeof o!=='object')return null;
    const code=firstStr(o,['code','shortcode']); if(!code||!/^[A-Za-z0-9_-]{5,30}$/.test(code))return null;
    const {videoUrl,thumbUrl}=mediaFrom(o); const user=o.user||o.owner||o.author||{};
    const likes=firstNum(o,['like_count','likes_count']); const comments=firstNum(o,['comment_count','comments_count']);
    const views=firstNum(o,['play_count','ig_play_count','video_view_count','view_count','views']);
    const reposts=firstNum(o,['reshare_count','repost_count','reshared_count','reposts_count']);
    const takenAt=firstNum(o,['taken_at','taken_at_timestamp','created_at']);
    if([likes,comments,views,reposts,takenAt].every(v=>v==null)&&!videoUrl&&!thumbUrl)return null;
    return {code,id:firstStr(o,['pk','id'])||null,username:typeof user?.username==='string'?user.username:firstStr(o,['username']),likes,comments,views,reposts,takenAt,videoUrl,thumbUrl,source:'network'};
  };
  const scan = root => {
    if(!root||typeof root!=='object')return;
    const seen=new WeakSet(); const stack=[{v:root,d:0}]; let nodes=0,found=0;
    while(stack.length&&nodes<16000){const{v,d}=stack.pop();if(!v||typeof v!=='object'||seen.has(v))continue;seen.add(v);nodes++;const p=normalize(v);if(p){RI.mergePost(p.code,p);found++;}if(d>=11)continue;if(Array.isArray(v)){for(let i=Math.min(v.length,600)-1;i>=0;i--)if(v[i]&&typeof v[i]==='object')stack.push({v:v[i],d:d+1});}else{for(const val of Object.values(v))if(val&&typeof val==='object')stack.push({v:val,d:d+1});}}
    if(found){RI.state.netCount+=found;RI.emit('network',{found});}
  };
  const W=typeof unsafeWindow!=='undefined'&&unsafeWindow?unsafeWindow:window;
  const origFetch=W.fetch;
  if(typeof origFetch==='function'&&!origFetch.__riWrapped){
    const wrapped=function(...args){const p=origFetch.apply(this,args);Promise.resolve(p).then(res=>{try{const url=String(res?.url||args?.[0]?.url||args?.[0]||'');const ct=String(res?.headers?.get?.('content-type')||'');if(/instagram\.com/.test(url)&&(/json/i.test(ct)||/graphql|api|query/.test(url)))res.clone().json().then(scan).catch(()=>{});}catch{}}).catch(()=>{});return p;};
    try{Object.defineProperty(wrapped,'__riWrapped',{value:true});W.fetch=wrapped;}catch{}
  }
  try{
    const X=W.XMLHttpRequest;
    if(X?.prototype&&!X.prototype.__riWrapped){const open=X.prototype.open,send=X.prototype.send;X.prototype.open=function(method,url,...rest){this.__riUrl=String(url||'');return open.call(this,method,url,...rest);};X.prototype.send=function(...args){this.addEventListener('load',()=>{try{if(!/instagram\.com|^\//.test(this.__riUrl||''))return;const ct=String(this.getResponseHeader?.('content-type')||'');if(!/json/i.test(ct)&&!/graphql|api|query/.test(this.__riUrl||''))return;if(this.responseType==='json'&&this.response)scan(this.response);else if(!this.responseType||this.responseType==='text'){const t=this.responseText;if(t&&(t[0]==='{'||t[0]==='['))scan(JSON.parse(t));}}catch{}},{once:true});return send.apply(this,args);};Object.defineProperty(X.prototype,'__riWrapped',{value:true});}
  }catch{}
  RI.net={installed:true,scan};
})();

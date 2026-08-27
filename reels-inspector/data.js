(() => {
  'use strict';
  const RI = globalThis.__RI;
  const MONTH = {January:'01',February:'02',March:'03',April:'04',May:'05',June:'06',July:'07',August:'08',September:'09',October:'10',November:'11',December:'12'};

  const decode = s => RI.cleanUrl(String(s || '').replace(/\\u003d/g,'=').replace(/\\u003c/g,'<').replace(/\\u003e/g,'>'));
  const currentVideo = () => {
    const vids = [...document.querySelectorAll('video')].filter(RI.visible);
    if (!vids.length) return null;
    return vids.sort((a,b) => (b.getBoundingClientRect().width*b.getBoundingClientRect().height) - (a.getBoundingClientRect().width*a.getBoundingClientRect().height))[0];
  };
  const rootForVideo = video => {
    if (!video) return document.querySelector('main') || document.body;
    const article = video.closest('article'); if (article) return article;
    let el = video.parentElement, best = el;
    for (let i=0; el && i<8; i++, el=el.parentElement) {
      const txt = (el.innerText || '').trim();
      if (txt.length < 7000) best = el;
      if (/좋아요|댓글|리포스트|팔로우|오리지널 오디오/.test(txt) && txt.length < 5000) return el;
    }
    return best || document.querySelector('main') || document.body;
  };
  const usernameFrom = root => {
    const candidates = [];
    for (const a of root.querySelectorAll('a[href]')) {
      const href = a.getAttribute('href') || '';
      const m = href.match(/^\/([A-Za-z0-9._]+)\/?(?:\?.*)?$/);
      if (!m || RI.reserved.has(m[1])) continue;
      const u=m[1], txt=(a.textContent||'').trim().replace(/^@/,'');
      let score = 0;
      if (txt === u) score += 8;
      if ((a.getAttribute('aria-label')||'').includes(u)) score += 4;
      if (RI.visible(a)) score += 2;
      if (a.querySelector('img')) score += 1;
      candidates.push({u,score});
    }
    candidates.sort((a,b)=>b.score-a.score);
    return candidates[0]?.u || null;
  };
  const aroundTextCount = (root, words) => {
    const els = root.querySelectorAll('span,div,button,a');
    for (const el of els) {
      const own = (el.textContent || '').trim();
      const aria = (el.getAttribute?.('aria-label') || '').trim();
      const hit = words.some(w => own === w || aria.includes(w));
      if (!hit) continue;
      const texts = [aria, own];
      const p = el.parentElement; if (p) texts.push((p.textContent||'').trim());
      if (p?.parentElement) texts.push((p.parentElement.textContent||'').trim());
      for (const t of texts) {
        const m = t.match(/(?:^|\s)([\d.,]+(?:만|억|천|[KkMmBb])?)(?=\s|좋아요|댓글|리포스트|$)/);
        const n = m ? RI.parseCount(m[1]) : null;
        if (n != null) return n;
      }
      const sib = [el.previousElementSibling, el.nextElementSibling];
      for (const s of sib) { const n=RI.parseCount(s?.textContent); if(n!=null) return n; }
    }
    return null;
  };
  const audioFrom = root => {
    const a = root.querySelector('a[href*="/reels/audio/"]');
    return a ? {audioName:(a.textContent||'').trim()||null,audioUrl:new URL(a.getAttribute('href'),location.origin).href} : {audioName:null,audioUrl:null};
  };
  const literalDate = value => {
    if (!value) return null;
    const s=String(value);
    let m=s.match(/(\d{4})-(\d{2})-(\d{2})/); if(m) return `${m[1]}-${m[2]}-${m[3]}`;
    m=s.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(\d{4})/);
    if (m) return `${m[3]}-${MONTH[m[1]]}-${String(m[2]).padStart(2,'0')}`;
    return null;
  };
  const metaInfo = html => {
    const desc = decode(html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
                        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["'](?:description|og:description)["']/i)?.[1] || '');
    const ogImage = decode(html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] || '');
    const out={description:desc||null,thumbUrl:ogImage||null};
    if (desc) {
      const likes = desc.match(/([\d.,]+\s*[KkMmBb]?)\s+likes?/i); if(likes) out.likes=RI.parseCount(likes[1]);
      const comments = desc.match(/([\d.,]+\s*[KkMmBb]?)\s+comments?/i); if(comments) out.comments=RI.parseCount(comments[1]);
      const user = desc.match(/(?:comments?\s*-|likes?\s*-)\s*([A-Za-z0-9._]+)\s*-/i) || desc.match(/-\s*([A-Za-z0-9._]+)\s*-\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)/);
      if(user) out.username=user[1];
      out.postedAt=literalDate(desc);
    }
    return out;
  };
  const regexNumber = (html, keys, code) => {
    let area = html;
    if (code) { const idx=html.indexOf(code); if(idx>=0) area=html.slice(Math.max(0,idx-160000),Math.min(html.length,idx+220000)); }
    for (const k of keys) {
      const patterns=[new RegExp(`["']${k}["']\\s*:\\s*(\\d+)`,'i'),new RegExp(`\\\\"${k}\\\\"\\s*:\\s*(\\d+)`,'i')];
      for (const re of patterns) { const m=area.match(re); if(m) return Number(m[1]); }
    }
    return null;
  };
  const regexString = (html, keys, code) => {
    let area=html;
    if(code){ const idx=html.indexOf(code); if(idx>=0) area=html.slice(Math.max(0,idx-180000),Math.min(html.length,idx+260000)); }
    for(const k of keys){
      const re=new RegExp(`["']${k}["']\\s*:\\s*["'](https?:[^"']+)["']`,'i'); const m=area.match(re); if(m) return decode(m[1]);
      const re2=new RegExp(`\\\\"${k}\\\\"\\s*:\\s*\\\\"(https?:.+?)\\\\"`,'i'); const m2=area.match(re2); if(m2) return decode(m2[1]);
    }
    return null;
  };
  const postFromHtml = (html, code) => {
    const meta=metaInfo(html);
    const data={code,source:'html',username:meta.username||null,likes:RI.first(regexNumber(html,['like_count','likes_count'],code),meta.likes),comments:RI.first(regexNumber(html,['comment_count','comments_count'],code),meta.comments),views:regexNumber(html,['play_count','ig_play_count','video_view_count','view_count'],code),reposts:regexNumber(html,['reshare_count','repost_count','reshared_count','reposts_count'],code),takenAt:regexNumber(html,['taken_at','taken_at_timestamp'],code),postedAt:meta.postedAt||null,videoUrl:regexString(html,['video_url'],code),thumbUrl:RI.first(regexString(html,['display_url','thumbnail_src'],code),meta.thumbUrl)};
    if(!data.videoUrl){ const area=code&&html.includes(code)?html.slice(Math.max(0,html.indexOf(code)-200000),Math.min(html.length,html.indexOf(code)+300000)):html; const m=area.match(/https?:\\?\/\\?\/[^"'<>\s]+?\.mp4[^"'<>\s]*/i); if(m) data.videoUrl=decode(m[0]); }
    return data;
  };
  const fetchPost = async (code, url) => {
    if (!code) return {};
    const cached = RI.state.posts.get(code); if (cached?.htmlLoaded) return cached;
    if (RI.state.fetches.has(code)) return RI.state.fetches.get(code);
    const p = RI.queue(async()=>{ const target=url?new URL(url,location.origin).href.split('?')[0]:RI.canonical(code); const res=await fetch(target,{credentials:'include',headers:{accept:'text/html'}}); if(!res.ok) throw new Error(`HTTP ${res.status}`); const html=await res.text(); const d=postFromHtml(html,code); d.htmlLoaded=true; return RI.mergePost(code,d); }).catch(e=>{console.warn('[RI] fetchPost',code,e);return RI.state.posts.get(code)||{code};}).finally(()=>RI.state.fetches.delete(code));
    RI.state.fetches.set(code,p); return p;
  };
  const domCurrent = () => {
    const video=currentVideo(); const root=rootForVideo(video); const code=RI.codeFromUrl(location.href); const {audioName,audioUrl}=audioFrom(root); const time=root.querySelector('time[datetime]');
    return {code,username:usernameFrom(root),likes:aroundTextCount(root,['좋아요','likes','Like']),comments:aroundTextCount(root,['댓글','comments','Comment']),reposts:aroundTextCount(root,['리포스트','reposts','Repost']),postedAt:literalDate(time?.getAttribute('datetime')),videoUrl:video?.currentSrc||video?.src||null,thumbUrl:video?.poster||null,duration:Number.isFinite(video?.duration)?video.duration:null,width:video?.videoWidth||null,height:video?.videoHeight||null,audioName,audioUrl,pageUrl:location.href,source:'dom'};
  };
  const current = async () => {
    const code=RI.codeFromUrl(location.href); const dom=domCurrent(); if(code) RI.mergePost(code,dom); let merged=code?(RI.state.posts.get(code)||dom):dom; if(code) merged=RI.merge(merged,await fetchPost(code,location.href)); merged=RI.merge(merged,dom); if(code) RI.state.posts.set(code,merged); return merged;
  };
  const grid = async anchor => {
    const code=RI.codeFromUrl(anchor?.href); if(!code) return {};
    const img=anchor.querySelector('img'); RI.mergePost(code,{code,thumbUrl:img?.currentSrc||img?.src||null,pageUrl:anchor.href,source:'grid-dom'});
    const n=RI.state.posts.get(code); const enough=n&&(n.views!=null||n.likes!=null||n.comments!=null)&&n.htmlLoaded; return enough?n:fetchPost(code,anchor.href);
  };
  RI.data={currentVideo,rootForVideo,domCurrent,current,grid,fetchPost,postFromHtml};
})();

const STYLE_ID = 'ri32-style';

export function injectStyles(doc = globalThis.document) {
  if (!doc?.documentElement || doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  (doc.head || doc.documentElement).appendChild(style);
}

const CSS = `
#ri3-tool,#ri3-panel{display:none!important}
#ri32-tool{
  position:fixed;right:var(--ri-launcher-right,12px);bottom:var(--ri-launcher-bottom,max(88px,calc(env(safe-area-inset-bottom) + 78px)));z-index:2147483645;
  width:44px;height:44px;padding:0;border:0;border-radius:50%;background:transparent;color:#fff;
  display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;touch-action:manipulation
}
#ri32-tool::before{
  content:"";position:absolute;width:34px;height:34px;border-radius:50%;background:rgba(0,0,0,.12);
  filter:drop-shadow(0 1px 2px rgba(0,0,0,.6));pointer-events:none
}
#ri32-tool svg{position:relative;z-index:1;width:21px;height:21px;pointer-events:none}
#ri32-tool[aria-expanded="true"]::before{background:rgba(0,0,0,.20)}
#ri32-tool:focus-visible{outline:2px solid rgba(255,255,255,.88);outline-offset:1px}
#ri32-reel-overlay{position:fixed;right:var(--ri-reel-overlay-right,60px);top:clamp(112px,16vh,170px);z-index:2147483600;width:74px;display:none;flex-direction:column;align-items:flex-end;gap:5px;text-align:right;pointer-events:none;color:#fff;font:760 12px/1.08 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;text-shadow:0 1px 3px rgba(0,0,0,.98),0 0 2px rgba(0,0,0,.72);font-variant-numeric:tabular-nums}
#ri32-scrim{position:fixed;inset:0;z-index:2147483644;background:rgba(0,0,0,.28);-webkit-tap-highlight-color:transparent}
#ri32-scrim[hidden]{display:none!important}
#ri32-panel{
  position:fixed;left:8px;right:8px;bottom:max(6px,env(safe-area-inset-bottom));z-index:2147483646;
  width:auto;height:var(--ri-sheet-compact-height,52vh);max-height:var(--ri-sheet-compact-height,62vh);overflow:hidden;
  border:1px solid rgba(255,255,255,.13);border-radius:20px 20px 14px 14px;background:rgba(16,16,16,.96);color:#fff;
  box-shadow:0 -10px 36px rgba(0,0,0,.38);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;
  display:flex;flex-direction:column;overscroll-behavior:contain;transition:height .18s ease,max-height .18s ease
}
#ri32-panel[data-detent="expanded"]{height:var(--ri-sheet-expanded-height,82vh);max-height:var(--ri-sheet-expanded-height,90vh)}
.ri32-grabber{height:18px;display:flex;align-items:center;justify-content:center;flex:0 0 auto;touch-action:none}
.ri32-grabber span{display:block;width:34px;height:4px;border-radius:99px;background:rgba(255,255,255,.25)}
.ri32-head{min-height:48px;display:flex;align-items:center;gap:7px;padding:0 6px 0 12px;border-bottom:1px solid rgba(255,255,255,.08);flex:0 0 auto}
.ri32-context{min-width:0;display:flex;align-items:center;gap:6px;flex:1}.ri32-context strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}
.ri32-media-type{flex:0 0 auto;padding:3px 6px;border-radius:7px;background:rgba(255,255,255,.08);font-size:9px;font-weight:700;opacity:.72}.ri32-media-type[hidden]{display:none}
.ri32-version{flex:0 0 auto;font-size:9px;opacity:.45}.ri32-detent,.ri32-close{height:40px;min-width:40px;border:0;border-radius:10px;background:transparent;color:#fff;-webkit-tap-highlight-color:transparent}
.ri32-detent{padding:0 7px;font:700 10px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;color:rgba(255,255,255,.72)}
.ri32-close{width:40px;padding:0;font-size:21px}.ri32-detent:active,.ri32-close:active{background:rgba(255,255,255,.08)}
.ri32-tabs{display:flex;overflow-x:auto;scrollbar-width:none;border-bottom:1px solid rgba(255,255,255,.07);flex:0 0 auto;padding:0 4px;scroll-behavior:smooth}
.ri32-tabs[hidden]{display:none}.ri32-tabs::-webkit-scrollbar{display:none}
.ri32-tab{flex:0 0 auto;height:44px;padding:0 12px;border:0;border-bottom:2px solid transparent;background:transparent;color:rgba(255,255,255,.58);font:700 11px/1 sans-serif;-webkit-tap-highlight-color:transparent}
.ri32-tab[aria-selected="true"]{color:#fff;border-bottom-color:#fff}.ri32-tab:focus-visible{outline:1px solid rgba(255,255,255,.65);outline-offset:-3px}
.ri32-activity-host{flex:0 0 auto;padding:0 10px}.ri32-activity-host:empty{display:none}
.ri32-body{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:12px 12px 18px;-webkit-overflow-scrolling:touch}
.ri32-footer{flex:0 0 auto;padding:8px 10px 10px;border-top:1px solid rgba(255,255,255,.07);background:rgba(16,16,16,.98)}
.ri32-empty{min-height:100px;display:grid;place-items:center;color:rgba(255,255,255,.55);font-size:12px;line-height:1.5;text-align:center;padding:12px}
.ri32-section+.ri32-section{margin-top:16px}.ri32-section-title{margin-bottom:9px;font-size:12px;font-weight:760}
.ri32-options{display:grid;gap:7px}.ri32-option{min-height:44px;display:flex;align-items:center;gap:9px;padding:0 11px;border:1px solid rgba(255,255,255,.1);border-radius:10px;background:rgba(255,255,255,.035);color:#fff;text-align:left;font-size:12px}
.ri32-option[aria-pressed="true"]{border-color:rgba(255,255,255,.42);background:rgba(255,255,255,.09)}.ri32-option:disabled{opacity:.38}
.ri32-dot{width:10px;height:10px;border:1px solid rgba(255,255,255,.5);border-radius:50%}.ri32-option[aria-pressed="true"] .ri32-dot{background:#fff}
.ri32-setting-row{display:flex;align-items:center;gap:8px;min-height:38px;font-size:12px}.ri32-setting-row span:first-child{flex:1;opacity:.62}.ri32-setting-row strong{font-size:12px;text-align:right}
.ri32-action{min-height:44px;padding:0 12px;border:1px solid rgba(255,255,255,.14);border-radius:10px;background:rgba(255,255,255,.06);color:#fff;font-size:12px;-webkit-tap-highlight-color:transparent}
.ri32-media-action{width:100%;margin-top:7px;text-align:left}.ri32-note{margin-top:8px;color:rgba(255,255,255,.52);font-size:11px;line-height:1.5}.ri32-home-note{margin-top:0;font-size:12px;color:rgba(255,255,255,.62)}
.ri32-update-shortcut{display:block;width:100%;min-height:46px;margin:0;padding:0 12px;border:1px solid rgba(255,255,255,.24);border-radius:11px;background:rgba(255,255,255,.11);color:#fff;font:760 12px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;text-align:center;-webkit-tap-highlight-color:transparent}
.ri32-update-shortcut:active{background:rgba(255,255,255,.19)}
#ri32-grid-menu{position:fixed;z-index:2147483646;min-width:150px;padding:5px;border:1px solid rgba(255,255,255,.16);border-radius:12px;background:rgba(18,18,18,.96);box-shadow:0 6px 18px rgba(0,0,0,.34);display:flex;flex-direction:column;gap:3px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}
#ri32-grid-menu button{height:34px;padding:0 10px;border:0;border-radius:8px;background:transparent;color:#fff;text-align:left;font:650 11px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;white-space:nowrap}
#ri32-grid-menu button:active{background:rgba(255,255,255,.12)}#ri32-grid-menu button:disabled{opacity:.38}
#ri32-activity{position:fixed;left:10px;right:10px;bottom:var(--ri-feedback-bottom,max(134px,calc(env(safe-area-inset-bottom) + 124px)));z-index:2147483647;display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:8px;padding:9px 9px 9px 11px;border:1px solid rgba(255,255,255,.16);border-radius:13px;background:rgba(20,20,20,.96);color:#fff;box-shadow:0 6px 20px rgba(0,0,0,.32);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}
#ri32-activity[data-embedded="true"]{position:static;left:auto;right:auto;bottom:auto;margin:8px 0 0;box-shadow:none;background:rgba(255,255,255,.055)}
#ri32-activity[data-state="error"]{border-color:rgba(255,255,255,.34)}
.ri32-activity-copy{min-width:0;display:grid;gap:3px}.ri32-activity-copy strong{font-size:11px;line-height:1.2}.ri32-activity-message{min-width:0;font-size:11px;line-height:1.35;color:rgba(255,255,255,.68)}
.ri32-activity-progress{height:3px;overflow:hidden;border-radius:99px;background:rgba(255,255,255,.12)}.ri32-activity-progress[hidden]{display:none}.ri32-activity-progress span{display:block;width:0;height:100%;border-radius:inherit;background:rgba(255,255,255,.72);transition:width .16s ease}
.ri32-activity-action,.ri32-activity-dismiss{border:0;border-radius:9px;background:rgba(255,255,255,.1);color:#fff;-webkit-tap-highlight-color:transparent}.ri32-activity-action{min-height:40px;padding:0 11px;font:720 11px/1 sans-serif}.ri32-activity-dismiss{width:40px;height:40px;padding:0;font-size:19px}.ri32-activity-action[hidden],.ri32-activity-dismiss[hidden]{display:none}
#ri32-toast{position:fixed;left:50%;bottom:var(--ri-feedback-bottom,max(134px,calc(env(safe-area-inset-bottom) + 124px)));transform:translateX(-50%);z-index:2147483647;max-width:82vw;padding:8px 12px;border-radius:16px;background:rgba(20,20,20,.94);color:#fff;font:650 11px/1.3 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;text-align:center;white-space:normal}
@media (prefers-reduced-motion:reduce){#ri32-panel{transition:none}.ri32-tabs{scroll-behavior:auto}.ri32-activity-progress span{transition:none}}
`;

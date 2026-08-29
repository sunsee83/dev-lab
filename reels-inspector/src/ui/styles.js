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
  position:fixed;right:var(--ri-launcher-right,12px);bottom:var(--ri-launcher-bottom,max(88px,calc(env(safe-area-inset-bottom) + 78px)));z-index:2147483605;
  width:36px;height:36px;padding:0;border:1px solid rgba(255,255,255,.18);border-radius:50%;
  background:rgba(12,12,12,.72);color:#fff;display:flex;align-items:center;justify-content:center;
  box-shadow:0 2px 8px rgba(0,0,0,.32);-webkit-tap-highlight-color:transparent
}
#ri32-tool[aria-expanded="true"]{background:rgba(38,38,38,.96)}
#ri32-panel{
  position:fixed;right:8px;bottom:var(--ri-panel-bottom,max(132px,calc(env(safe-area-inset-bottom) + 122px)));z-index:2147483646;
  width:min(70vw,270px);max-height:min(64vh,540px);overflow:hidden;border:1px solid rgba(255,255,255,.13);
  border-radius:15px;background:rgba(16,16,16,.94);color:#fff;box-shadow:0 12px 34px rgba(0,0,0,.40);
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif
}
.ri32-head{min-height:42px;display:flex;align-items:center;gap:7px;padding:0 8px 0 11px;border-bottom:1px solid rgba(255,255,255,.08)}
.ri32-head strong{flex:1;font-size:12px}.ri32-version{font-size:8px;opacity:.48}
.ri32-close{width:28px;height:28px;border:0;border-radius:50%;background:transparent;color:#fff;font-size:19px}
.ri32-tabs{display:flex;overflow-x:auto;scrollbar-width:none;border-bottom:1px solid rgba(255,255,255,.07)}
.ri32-tabs::-webkit-scrollbar{display:none}
.ri32-tab{flex:0 0 auto;height:35px;padding:0 9px;border:0;border-bottom:2px solid transparent;background:transparent;color:rgba(255,255,255,.58);font:650 10px/1 sans-serif}
.ri32-tab[aria-selected="true"]{color:#fff;border-bottom-color:#fff}
.ri32-body{max-height:calc(min(64vh,540px) - 130px);overflow-y:auto;padding:10px}
.ri32-empty{min-height:78px;display:grid;place-items:center;color:rgba(255,255,255,.52);font-size:10px;line-height:1.45;text-align:center}
.ri32-section+.ri32-section{margin-top:13px}.ri32-section-title{margin-bottom:7px;font-size:10.5px;font-weight:750}
.ri32-options{display:grid;gap:6px}.ri32-option{min-height:38px;display:flex;align-items:center;gap:8px;padding:0 9px;border:1px solid rgba(255,255,255,.1);border-radius:9px;background:rgba(255,255,255,.035);color:#fff;text-align:left;font-size:10px}
.ri32-option[aria-pressed="true"]{border-color:rgba(255,255,255,.42);background:rgba(255,255,255,.09)}.ri32-option:disabled{opacity:.38}
.ri32-dot{width:9px;height:9px;border:1px solid rgba(255,255,255,.5);border-radius:50%}.ri32-option[aria-pressed="true"] .ri32-dot{background:#fff}
.ri32-setting-row{display:flex;align-items:center;gap:8px;min-height:32px;font-size:10px}.ri32-setting-row span:first-child{flex:1;opacity:.62}.ri32-setting-row strong{font-size:10px;text-align:right}
.ri32-action{min-height:34px;padding:0 10px;border:1px solid rgba(255,255,255,.14);border-radius:9px;background:rgba(255,255,255,.06);color:#fff;font-size:10px}
.ri32-media-action{width:100%;margin-top:6px;text-align:left}.ri32-note{margin-top:7px;color:rgba(255,255,255,.46);font-size:9px;line-height:1.45}
.ri32-update-shortcut{display:block;width:calc(100% - 20px);min-height:42px;margin:0 10px 10px;padding:0 12px;border:1px solid rgba(255,255,255,.24);border-radius:10px;background:rgba(255,255,255,.11);color:#fff;font:750 11px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;text-align:center;-webkit-tap-highlight-color:transparent}
.ri32-update-shortcut:active{background:rgba(255,255,255,.19)}
#ri32-grid-menu{position:fixed;z-index:2147483646;min-width:150px;padding:5px;border:1px solid rgba(255,255,255,.16);border-radius:12px;background:rgba(18,18,18,.96);box-shadow:0 6px 18px rgba(0,0,0,.34);display:flex;flex-direction:column;gap:3px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}
#ri32-grid-menu button{height:34px;padding:0 10px;border:0;border-radius:8px;background:transparent;color:#fff;text-align:left;font:650 11px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;white-space:nowrap}
#ri32-grid-menu button:active{background:rgba(255,255,255,.12)}#ri32-grid-menu button:disabled{opacity:.38}
#ri32-toast{position:fixed;left:50%;bottom:var(--ri-feedback-bottom,max(134px,calc(env(safe-area-inset-bottom) + 124px)));transform:translateX(-50%);z-index:2147483647;max-width:82vw;padding:8px 12px;border-radius:16px;background:rgba(20,20,20,.94);color:#fff;font:650 11px/1.3 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;text-align:center;white-space:normal}
`;

const STYLE_ID = 'ri32-style';

export function injectStyles(doc = globalThis.document) {
  if (!doc?.documentElement || doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  (doc.head || doc.documentElement).appendChild(style);
}

const CSS = `
#ri32-tool {
  position: fixed;
  right: 12px;
  bottom: max(76px, calc(env(safe-area-inset-bottom) + 66px));
  z-index: 2147483605;
  width: 38px;
  height: 38px;
  padding: 0;
  border: 1px solid rgba(255,255,255,.18);
  border-radius: 50%;
  background: rgba(12,12,12,.78);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,.32);
  -webkit-tap-highlight-color: transparent;
}
#ri32-tool[aria-expanded="true"] { background: rgba(38,38,38,.96); }
#ri32-panel {
  position: fixed;
  right: 8px;
  bottom: max(122px, calc(env(safe-area-inset-bottom) + 112px));
  z-index: 2147483646;
  width: min(92vw, 360px);
  max-height: min(72vh, 620px);
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.13);
  border-radius: 16px;
  background: rgba(16,16,16,.97);
  color: #fff;
  box-shadow: 0 14px 40px rgba(0,0,0,.42);
  font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;
}
.ri32-head {
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px 0 12px;
  border-bottom: 1px solid rgba(255,255,255,.08);
}
.ri32-head strong { flex: 1; font-size: 13px; }
.ri32-version { font-size: 9px; opacity: .48; }
.ri32-close {
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #fff;
  font-size: 20px;
}
.ri32-tabs {
  display: flex;
  overflow-x: auto;
  scrollbar-width: none;
  border-bottom: 1px solid rgba(255,255,255,.07);
}
.ri32-tabs::-webkit-scrollbar { display: none; }
.ri32-tab {
  flex: 0 0 auto;
  height: 38px;
  padding: 0 11px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: rgba(255,255,255,.6);
  font: 650 11px/1 sans-serif;
}
.ri32-tab[aria-selected="true"] {
  color: #fff;
  border-bottom-color: #fff;
}
.ri32-body {
  max-height: calc(min(72vh, 620px) - 83px);
  overflow-y: auto;
  padding: 12px;
}
.ri32-empty {
  min-height: 100px;
  display: grid;
  place-items: center;
  color: rgba(255,255,255,.55);
  font-size: 11px;
  text-align: center;
}
.ri32-section + .ri32-section { margin-top: 16px; }
.ri32-section-title { margin-bottom: 8px; font-size: 11px; font-weight: 750; }
.ri32-options { display: grid; gap: 7px; }
.ri32-option {
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 10px;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 10px;
  background: rgba(255,255,255,.035);
  color: #fff;
  text-align: left;
}
.ri32-option[aria-pressed="true"] { border-color: rgba(255,255,255,.42); background: rgba(255,255,255,.09); }
.ri32-option:disabled { opacity: .38; }
.ri32-dot {
  width: 10px;
  height: 10px;
  border: 1px solid rgba(255,255,255,.5);
  border-radius: 50%;
}
.ri32-option[aria-pressed="true"] .ri32-dot { background: #fff; }
.ri32-setting-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  font-size: 11px;
}
.ri32-setting-row span:first-child { flex: 1; opacity: .62; }
.ri32-action {
  min-height: 34px;
  padding: 0 11px;
  border: 1px solid rgba(255,255,255,.14);
  border-radius: 9px;
  background: rgba(255,255,255,.06);
  color: #fff;
  font-size: 10px;
}
.ri32-note {
  margin-top: 8px;
  color: rgba(255,255,255,.48);
  font-size: 9.5px;
  line-height: 1.45;
}
`;

import { VERSION } from './version.js';
import { createApp, EVENTS } from './core/app.js';
import { detectCapabilities } from './core/capability.js';
import { createSettingsStore } from './store/settings-store.js';
import { createDownloadManager } from './media/download-manager.js';
import { createLegacyStoreAdapter } from './migration/legacy-store-adapter.js';
import { mountGridActions } from './ui/grid.js';
import { mountRiPanel } from './ui/ri-panel.js';
import './legacy-runtime.js';

const app = createApp({ version: VERSION });
const capabilities = detectCapabilities(globalThis);
const settings = createSettingsStore({
  env: globalThis,
  capabilities,
  onChange(state) {
    app.emit(EVENTS.SETTINGS_CHANGED, state);
  }
});
const downloads = createDownloadManager({
  env: globalThis,
  capabilities,
  settings,
  onChange(state) {
    app.emit(EVENTS.DOWNLOAD_CHANGED, state);
  }
});
const legacyStore = createLegacyStoreAdapter({ env: globalThis });

app.services = { capabilities, settings, downloads };
app.adapters.legacyStore = legacyStore;

const stopRouteTracking = app.startRouteTracking({
  env: globalThis,
  resolveIdentity(url) {
    return legacyStore.getCurrentIdentity(url);
  }
});
const grid = mountGridActions({ app, adapter: legacyStore, downloads, capabilities, doc: document, env: globalThis });
const riPanel = mountRiPanel({
  app,
  settings,
  capabilities,
  downloads,
  adapter: legacyStore,
  version: VERSION,
  doc: document,
  env: globalThis
});

app.adapters.stopRouteTracking = stopRouteTracking;
app.adapters.grid = grid;
app.adapters.riPanel = riPanel;

void settings.init().catch((error) => {
  console.warn('[RI] settings initialization failed', error);
});

import { VERSION } from './version.js';
import { createApp, EVENTS } from './core/app.js';
import { detectCapabilities } from './core/capability.js';
import { createSettingsStore } from './store/settings-store.js';
import { createDownloadManager } from './media/download-manager.js';
import { createMetricsEngine } from './metrics/metrics.js';
import { createLegacyStoreAdapter } from './migration/legacy-store-adapter.js';
import { mountGridActions } from './ui/grid.js';
import { createLayoutManager } from './ui/layout.js';
import { mountRiPanel } from './ui/ri-panel.js';
import { createWorkspaceState } from './ui/workspace-state.js';
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
const metrics = createMetricsEngine({ history: legacyStore });
const workspace = createWorkspaceState();
const storeTracker = legacyStore.createChangeTracker((change) => {
  app.setCurrentIdentity(legacyStore.getCurrentIdentity());
  app.emit(EVENTS.STORE_CHANGED, change);
});

app.services = { capabilities, settings, downloads, metrics, workspace };
app.adapters.legacyStore = legacyStore;

const stopRouteTracking = app.startRouteTracking({
  env: globalThis,
  resolveIdentity(url) {
    return legacyStore.getCurrentIdentity(url);
  },
  onActivity(reason) {
    storeTracker.schedule(reason);
  }
});
const layout = createLayoutManager({ app, doc: document, env: globalThis });
const grid = mountGridActions({ app, adapter: legacyStore, downloads, capabilities, doc: document, env: globalThis });
const riPanel = mountRiPanel({
  app,
  settings,
  capabilities,
  downloads,
  metrics,
  adapter: legacyStore,
  workspace,
  layout,
  version: VERSION,
  doc: document,
  env: globalThis
});

app.services.layout = layout;
app.adapters.stopRouteTracking = stopRouteTracking;
app.adapters.stopStoreTracking = () => storeTracker.destroy();
app.adapters.stopLayout = () => layout.destroy();
app.adapters.grid = grid;
app.adapters.riPanel = riPanel;

void settings.init().catch((error) => {
  console.warn('[RI] settings initialization failed', error);
});

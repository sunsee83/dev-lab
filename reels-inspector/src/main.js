import { VERSION } from './version.js';
import { createActivityStore } from './core/activity.js';
import { createApp, EVENTS } from './core/app.js';
import { detectCapabilities } from './core/capability.js';
import { createDataEngine } from './data/engine.js';
import { createSettingsStore } from './store/settings-store.js';
import { createHistoryStore } from './store/history-store.js';
import { createVerifiedCacheStore, VERIFIED_CACHE_KEY } from './store/verified-cache-store.js';
import { createDownloadManager } from './media/download-manager.js';
import { createMetricsEngine } from './metrics/metrics.js';
import { installLegacyCaptureHandoff } from './migration/capture-handoff.js';
import { createLegacyStoreAdapter } from './migration/legacy-store-adapter.js';
import { createReelContextAdapter } from './migration/reel-context-adapter.js';
import { mountActivityIndicator } from './ui/activity-indicator.js';
import { mountGridActions } from './ui/grid.js';
import { createLayoutManager } from './ui/layout.js';
import { mountRiPanel } from './ui/ri-panel.js';
import { createWorkspaceState } from './ui/workspace-state.js';
import './legacy-runtime.js';

const app = createApp({ version: VERSION });
const capabilities = detectCapabilities(globalThis);
const activity = createActivityStore();
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
  onChange(change) {
    if (change?.activity) activity.apply(change.activity);
    app.emit(EVENTS.DOWNLOAD_CHANGED, change);
  }
});
const history = createHistoryStore({ env: globalThis });
const verifiedCache = createVerifiedCacheStore({ env: globalThis });
const legacyStore = createLegacyStoreAdapter({ env: globalThis, history });
const data = createDataEngine({
  legacyAdapter: legacyStore,
  history,
  persistence: verifiedCache,
  onChange(change) {
    app.emit(EVENTS.STORE_CHANGED, {
      reason: 'data-engine',
      changedKeys: [VERIFIED_CACHE_KEY],
      shortcode: change.shortcode
    });
  }
});
const stopCaptureHandoff = installLegacyCaptureHandoff({ env: globalThis, data });
const reelContext = createReelContextAdapter({ store: legacyStore, doc: document, env: globalThis });
const metrics = createMetricsEngine({ history });
const workspace = createWorkspaceState();
const storeTracker = legacyStore.createChangeTracker((change) => {
  data.syncLegacy();
  const activeIdentity = reelContext.resolveActivityIdentity();
  app.setCurrentIdentity(activeIdentity === undefined ? legacyStore.getCurrentIdentity() : activeIdentity);
  app.emit(EVENTS.STORE_CHANGED, change);
});

app.services = { capabilities, settings, downloads, metrics, workspace, activity, history, data };
app.adapters.legacyStore = legacyStore;
app.adapters.reelContext = reelContext;

const stopRouteTracking = app.startRouteTracking({
  env: globalThis,
  resolveIdentity(url) {
    return reelContext.getCurrent()?.identity || legacyStore.getCurrentIdentity(url);
  },
  resolveActivityIdentity() {
    return reelContext.resolveActivityIdentity();
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
const activityIndicator = mountActivityIndicator({
  activity,
  workspace,
  doc: document,
  onAction(item) {
    if (item.action === 'open-settings') riPanel.openSettings();
  }
});

app.services.layout = layout;
app.adapters.stopRouteTracking = stopRouteTracking;
app.adapters.stopStoreTracking = () => storeTracker.destroy();
app.adapters.stopCaptureHandoff = stopCaptureHandoff;
app.adapters.stopData = () => data.destroy();
app.adapters.stopLayout = () => layout.destroy();
app.adapters.grid = grid;
app.adapters.riPanel = riPanel;
app.adapters.activityIndicator = activityIndicator;

void settings.init().catch((error) => {
  console.warn('[RI] settings initialization failed', error);
});

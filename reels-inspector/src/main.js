import { VERSION } from './version.js';
import { createActivityStore } from './core/activity.js';
import { createApp, EVENTS } from './core/app.js';
import { detectCapabilities } from './core/capability.js';
import { createSettingsStore } from './store/settings-store.js';
import { createDownloadManager } from './media/download-manager.js';
import { createMetricsEngine } from './metrics/metrics.js';
import { createLegacyStoreAdapter } from './migration/legacy-store-adapter.js';
import { createReelContextAdapter } from './migration/reel-context-adapter.js';
import { mountActivityIndicator } from './ui/activity-indicator.js';
import { mountGridActions } from './ui/grid.js';
import { createLayoutManager } from './ui/layout.js';
import { mountReelOverlay } from './ui/reel-overlay.js';
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
const legacyStore = createLegacyStoreAdapter({ env: globalThis });
const reelContext = createReelContextAdapter({ store: legacyStore, doc: document, env: globalThis });
const metrics = createMetricsEngine({ history: legacyStore });
const workspace = createWorkspaceState();
let reelOverlay = null;
const storeTracker = legacyStore.createChangeTracker((change) => {
  const activeIdentity = reelContext.resolveActivityIdentity();
  app.setCurrentIdentity(activeIdentity === undefined ? legacyStore.getCurrentIdentity() : activeIdentity);
  app.emit(EVENTS.STORE_CHANGED, change);
});

app.services = { capabilities, settings, downloads, metrics, workspace, activity };
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
    reelOverlay?.schedule(reason);
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
reelOverlay = mountReelOverlay({
  app,
  reelContext,
  store: legacyStore,
  metrics,
  layout,
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
app.adapters.stopLayout = () => layout.destroy();
app.adapters.grid = grid;
app.adapters.riPanel = riPanel;
app.adapters.reelOverlay = reelOverlay;
app.adapters.activityIndicator = activityIndicator;

void settings.init().catch((error) => {
  console.warn('[RI] settings initialization failed', error);
});

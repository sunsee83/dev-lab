import { createApp, EVENTS } from './core/app.js';
import { detectCapabilities } from './core/capability.js';
import { createSettingsStore } from './store/settings-store.js';
import { createDownloadManager } from './media/download-manager.js';
import './legacy-runtime.js';

const app = createApp();
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

app.services = { capabilities, settings, downloads };

void settings.init().catch((error) => {
  console.warn('[RI] settings initialization failed', error);
});

// The new RI panel remains intentionally dormant until the legacy media/context
// adapter is connected. This prevents duplicate RI buttons and ensures that any
// visible settings already control the real download path when the panel ships.

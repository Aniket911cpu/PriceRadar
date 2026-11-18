import type { ManifestV3Export } from "@crxjs/vite-plugin";

const manifest: ManifestV3Export = {
  manifest_version: 3,
  name: "PriceRadar",
  description: "Local-first price tracking with transparent alerts.",
  default_locale: "en",
  version: "0.1.0",
  icons: {
    "16": "public/icons/icon.svg",
    "32": "public/icons/icon.svg",
    "48": "public/icons/icon.svg",
    "128": "public/icons/icon.svg",
  },
  action: {
    default_title: "PriceRadar",
    default_popup: "src/popup/index.html",
  },
  background: {
    service_worker: "src/background/service-worker.ts",
    type: "module",
  },
  permissions: ["storage", "alarms", "notifications", "activeTab", "scripting", "contextMenus", "sidePanel", "offscreen", "unlimitedStorage"],
  optional_host_permissions: ["https://*/*"],
  commands: {
    "track-current-page": {
      suggested_key: {
        default: "Alt+Shift+P",
      },
      description: "Track the current page's price",
    },
  },
  side_panel: {
    default_path: "src/sidepanel/index.html",
  },
  options_ui: {
    page: "src/options/index.html",
    open_in_tab: true,
  },
  content_scripts: [
    {
      matches: ["https://*/*", "http://*/*"],
      js: ["src/content/content.ts"],
      run_at: "document_idle",
    },
  ],
  web_accessible_resources: [
    {
      resources: ["src/content/*"],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
};

export default manifest;

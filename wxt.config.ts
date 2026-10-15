import { defineConfig } from "wxt"

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: "Select and Search",
    // activeTab lets the popup read the active tab's URL so it can show the
    // current domain and switch the extension off for the whole site.
    permissions: ["storage", "activeTab"],
  },
  webExt: {
    disabled: true,
  },
})

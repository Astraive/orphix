// electron.vite.config.ts
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
var __electron_vite_injected_import_meta_url = "file:///E:/astraive/orphix/apps/desktop/electron.vite.config.ts";
var __dirname = dirname(fileURLToPath(__electron_vite_injected_import_meta_url));
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: "main/index.ts"
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: "preload/index.ts"
      }
    }
  },
  renderer: {
    plugins: [react()],
    root: "renderer",
    build: {
      rollupOptions: {
        input: "renderer/index.html"
      }
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "renderer/src")
      }
    }
  }
});
export {
  electron_vite_config_default as default
};

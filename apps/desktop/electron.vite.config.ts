import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: "main/index.ts",
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: "preload/index.ts",
      },
    },
  },
  renderer: {
    plugins: [react()],
    root: "renderer",
    build: {
      rollupOptions: {
        input: "renderer/index.html",
      },
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "renderer/src"),
        "@terminal": resolve(__dirname, "terminal"),
      },
    },
  },
});

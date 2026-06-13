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
        input: "src/main/index.ts",
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: "src/preload/index.ts",
        formats: ["cjs"],
      },
      rollupOptions: {
        output: {
          entryFileNames: "index.cjs",
        },
      },
    },
  },
  renderer: {
    plugins: [react()],
    root: "src/renderer",
    build: {
      rollupOptions: {
        input: "src/renderer/index.html",
      },
    },
    define: {
      // Forward env vars to renderer process via import.meta.env.VITE_*
      "import.meta.env.VITE_CONTROL_URL": JSON.stringify(process.env.ORPHIX_CONTROL_URL ?? "http://localhost:2605"),
      "import.meta.env.VITE_LINK_URL": JSON.stringify(process.env.ORPHIX_LINK_URL ?? "http://localhost:2606"),
      "import.meta.env.VITE_LOGIN_TYPE": JSON.stringify(process.env.LOGIN_TYPE ?? "web"),
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "src/renderer"),
        "@shared": resolve(__dirname, "src/shared"),
        "@orphix/ui": resolve(__dirname, "../../packages/ui/src"),
        "@orphix/types": resolve(__dirname, "../../packages/types/src/index.ts"),
      },
    },
  },
});

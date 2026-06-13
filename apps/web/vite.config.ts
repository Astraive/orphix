import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const controlUrl = env.VITE_CONTROL_URL || "http://localhost:2605";
  const linkUrl = env.VITE_LINK_URL || "http://localhost:2606";

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@convex": path.resolve(__dirname, "../../convex"),
        "@orphix/types": path.resolve(__dirname, "../../packages/types/src/index.ts"),
        "@orphix/editor-core": path.resolve(__dirname, "../../packages/editor-core/src/index.ts"),
      },
    },
    server: {
      port: 3000,
      proxy: {
        "/api/control": {
          target: controlUrl,
          rewrite: (p) => p.replace(/^\/api\/control/, ""),
          changeOrigin: true,
        },
        "/api/link": {
          target: linkUrl,
          rewrite: (p) => p.replace(/^\/api\/link/, ""),
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: "dist",
      sourcemap: false,
    },
  };
});

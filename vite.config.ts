import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split the chart library (recharts + d3) and other vendor code out of
        // the main bundle so it can be cached separately and the chunk-size
        // warning goes away.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (/[\\/](recharts|d3-|victory-|internmap)/.test(id)) return "charts";
          if (/[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return "react";
          return "vendor";
        },
      },
    },
  },
});

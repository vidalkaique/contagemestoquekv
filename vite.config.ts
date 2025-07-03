import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: "dist",
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});

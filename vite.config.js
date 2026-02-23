import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Proxy API requests during development to avoid CORS issues
// Requests to /api/* will be forwarded to the Protonest API
// Adjust target if needed.
//
// In production (GitHub Pages) the app is served at:
//   https://<owner>.github.io/Factory-Management-System_PC/
// so `base` is set to the repo name for non-dev builds.
export default defineConfig(({ command, mode }) => ({
  base: "/",
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: "https://api.protonestconnect.co",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, "/api"),
      },
    },
  },
}));

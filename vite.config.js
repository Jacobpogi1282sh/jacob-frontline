import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${process.env.VITE_GAME_API_PORT || "3001"}`,
        timeout: 300_000,
        proxyTimeout: 300_000,
      },
      "/multiplayer": {
        target: `ws://127.0.0.1:${process.env.VITE_GAME_API_PORT || "3001"}`,
        ws: true,
      },
      "/robots.txt": {
        target: `http://127.0.0.1:${process.env.VITE_GAME_API_PORT || "3001"}`,
      },
      "/sitemap.xml": {
        target: `http://127.0.0.1:${process.env.VITE_GAME_API_PORT || "3001"}`,
      },
    },
  },
});

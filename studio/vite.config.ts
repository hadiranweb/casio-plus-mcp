import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Relative assets let the standalone preview work in the Arena file viewer.
  // In a hosted deployment this can be changed to "/" behind the web server.
  base: "./",
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 4173,
    proxy: {
      "/api": "http://127.0.0.1:4110",
    },
  },
});

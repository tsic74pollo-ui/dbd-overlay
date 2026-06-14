import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // 0.0.0.0 にバインドして同一 Wi-Fi のスマホ等から LAN IP 経由でアクセスできるようにする。
    // Vite 起動時のログに `Network: http://192.168.x.x:5173/` が出る。
    // → /remote ページもその IP 経由で開けばリモコンが動作する。
    host: true,
  },
});

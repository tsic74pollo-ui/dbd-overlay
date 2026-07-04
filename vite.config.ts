import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// Vercel serves api/ably-token.ts as a serverless function in production.
// `vite dev` doesn't run that, so this plugin mirrors it locally: same
// token-minting logic, same /api/ably-token route, zero extra setup
// (no `vercel dev` needed) — just set ABLY_API_KEY in .env.local.
function ablyTokenDevMiddleware(apiKey: string | undefined): Plugin {
  return {
    name: "ably-token-dev-middleware",
    configureServer(server) {
      server.middlewares.use("/api/ably-token", async (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        if (!apiKey) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: "ABLY_API_KEY is not set in .env.local" }));
          return;
        }
        try {
          const { mintAblyTokenRequest } = await import("./api/_ablyShared");
          const tokenRequest = await mintAblyTokenRequest(apiKey);
          res.statusCode = 200;
          res.end(JSON.stringify(tokenRequest));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : "token mint failed" }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // ABLY_API_KEY has no VITE_ prefix on purpose (server-only, never bundled
  // into client code) — loadEnv's 3rd arg "" widens the prefix filter so we
  // can still read it here, in Node, for the dev middleware only.
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), tailwindcss(), ablyTokenDevMiddleware(env.ABLY_API_KEY)],
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
  };
});

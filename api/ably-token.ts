// GET /api/ably-token — mints a short-lived, namespace-scoped Ably token
// request for the browser. ABLY_API_KEY (server-only, no VITE_ prefix) is
// read from the Vercel/Node process env and never sent to the client.
import type { VercelRequest, VercelResponse } from "@vercel/node";
// package.json の "type":"module" により Vercel の Node ランタイムは
// ネイティブ ESM 解決を使う。相対importは拡張子必須(.js)— 無いと
// ビルドはエラーを無視して通るが、実行時に ERR_MODULE_NOT_FOUND で
// クラッシュする(FUNCTION_INVOCATION_FAILED として観測された)。
import { mintAblyTokenRequest } from "./_ablyShared.js";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "ABLY_API_KEY is not configured on the server" });
    return;
  }
  try {
    const tokenRequest = await mintAblyTokenRequest(apiKey);
    res.status(200).json(tokenRequest);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "token mint failed" });
  }
}

// GET /api/ably-token — mints a short-lived, namespace-scoped Ably token
// request for the browser. ABLY_API_KEY (server-only, no VITE_ prefix) is
// read from the Vercel/Node process env and never sent to the client.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { mintAblyTokenRequest } from "./_ablyShared";

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

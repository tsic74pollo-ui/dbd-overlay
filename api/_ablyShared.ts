// Shared Ably token-minting logic, used by both the Vercel serverless
// function (api/ably-token.ts) and the local Vite dev middleware
// (vite.config.ts). Files under api/ prefixed with "_" are not routed
// by Vercel, so this stays a plain helper module, not an endpoint.
//
// Why this exists: the Ably API key must never reach the browser bundle.
// Every client (editor / OBS overlay / remote control) instead fetches a
// short-lived, capability-scoped token from /api/ably-token. A leaked
// token only grants access to this app's own "dbd:*" channel namespace
// (publish/subscribe/presence) for its TTL (Ably default: 60 minutes,
// auto-renewed by the SDK) — never the raw account key.
import Ably from "ably";
import type { TokenRequest } from "ably";

export async function mintAblyTokenRequest(apiKey: string): Promise<TokenRequest> {
  const rest = new Ably.Rest({ key: apiKey });
  return rest.auth.createTokenRequest({
    capability: { "dbd:*": ["publish", "subscribe", "presence"] },
  });
}

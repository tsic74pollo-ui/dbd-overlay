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

// Ably キーの形式: "appId.keyId:keySecret"。値そのものは出さず、
// 形式が壊れていること(欠落/コロン抜け等)だけをエラーで判別可能にする。
const ABLY_KEY_SHAPE = /^[\w-]+\.[\w-]+:[\w-]+$/;

export async function mintAblyTokenRequest(apiKey: string): Promise<TokenRequest> {
  // env var UI へのコピペで混入しがちな前後の空白/改行を防御的に除去
  const key = apiKey.trim();
  if (!ABLY_KEY_SHAPE.test(key)) {
    throw new Error(
      `ABLY_API_KEY has an unexpected shape (len=${key.length}, has colon=${key.includes(":")}). ` +
        "Expected appId.keyId:keySecret — re-check the value pasted into Vercel.",
    );
  }
  const rest = new Ably.Rest({ key });
  return rest.auth.createTokenRequest({
    capability: { "dbd:*": ["publish", "subscribe", "presence"] },
  });
}

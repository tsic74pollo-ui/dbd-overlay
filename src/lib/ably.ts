// Shared Ably Realtime client (migrated off Supabase Realtime 2026-06-29,
// then off client-side API keys 2026-07-04). One process-wide client
// multiplexes all channels over one WebSocket. echoMessages:false → never
// receive our own publishes.
//
// The raw Ably API key never reaches the browser: the client fetches a
// short-lived, namespace-scoped token from /api/ably-token (a Vercel
// serverless function in prod, a Vite dev middleware locally) via
// authCallback. See api/_ablyShared.ts for what the token can and can't do.
// "ably/modular" instead of "ably": the default entrypoint bundles every
// transport and plugin (~174 kB of it unused here). We use exactly one
// transport (WebSocket), one HTTP request impl (fetch) and presence, so we
// pull those three in explicitly and let the rest tree-shake away.
import {
  BaseRealtime,
  FetchRequest,
  RealtimePresence,
  WebSocketTransport,
} from "ably/modular";
import type { Realtime } from "ably";

let client: Realtime | null = null;

export function getAbly(): Realtime {
  if (!client) {
    client = new BaseRealtime({
      plugins: { WebSocketTransport, FetchRequest, RealtimePresence },
      authCallback: (_tokenParams, callback) => {
        fetch("/api/ably-token")
          .then((r) => {
            if (!r.ok) throw new Error(`token endpoint returned ${r.status}`);
            return r.json();
          })
          .then((tokenRequest) => callback(null, tokenRequest))
          .catch((err) => callback(err instanceof Error ? err.message : String(err), null));
      },
      echoMessages: false,
      clientId: "anon-" + Math.random().toString(36).slice(2, 10),
    });
  }
  return client;
}

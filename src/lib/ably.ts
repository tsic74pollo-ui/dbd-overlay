// Shared Ably Realtime client (migrated off Supabase Realtime on 2026-06-29;
// PartyKit hosting was unusable, so Ably's managed pub/sub — no server deploy).
// One process-wide client multiplexes all channels over one WebSocket.
// echoMessages:false → never receive our own publishes. Set VITE_ABLY_KEY.
import * as Ably from "ably";

const KEY = import.meta.env.VITE_ABLY_KEY as string | undefined;

export const isAblyConfigured = !!KEY;

let client: Ably.Realtime | null = null;

export function getAbly(): Ably.Realtime | null {
  if (!KEY) return null;
  if (!client) {
    client = new Ably.Realtime({
      key: KEY,
      echoMessages: false,
      clientId: "anon-" + Math.random().toString(36).slice(2, 10),
    });
  }
  return client;
}

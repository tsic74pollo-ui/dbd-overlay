import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { OverlaySettings } from "@/lib/types";
import { OverlayView } from "@/components/OverlayView";
import { joinRoom } from "@/lib/realtimeSync";

export function OverlayPage() {
  const [params] = useSearchParams();
  const roomId = params.get("room");
  const theme = params.get("theme");
  const debug = params.get("debug") === "1";
  const [settings, setSettings] = useState<OverlaySettings | null>(null);
  const [status, setStatus] = useState<string>("connecting");
  const [fatal, setFatal] = useState<string | null>(null);

  useEffect(() => {
    document.body.classList.add("overlay-route");
    if (theme === "preview") document.body.classList.add("preview");
    return () => {
      document.body.classList.remove("overlay-route", "preview");
    };
  }, [theme]);

  useEffect(() => {
    if (!roomId) {
      setFatal("URL に ?room=<roomId> がありません");
      return;
    }
    const handle = joinRoom(roomId, "viewer", {
      onState: (s) => setSettings(s),
      onStatus: (s) => setStatus(s),
    });
    return () => handle?.unsubscribe();
  }, [roomId]);

  // Fatal config issues — show error only when we have nothing else to show
  if (fatal && !settings) {
    return (
      <div className="p-4 text-red-400 text-sm font-mono">
        Overlay error: {fatal}
      </div>
    );
  }

  // Initial connection: don't render anything until first state arrives
  if (!settings) {
    return null;
  }

  // Once we've received settings at least once, ALWAYS keep showing the overlay
  // even if the connection drops or errors out. This protects live streams.
  return (
    <>
      <OverlayView settings={settings} />
      {debug && (
        <div
          style={{
            position: "fixed",
            bottom: 4,
            right: 4,
            fontSize: 10,
            color: status === "live" ? "#10b981" : "#f59e0b",
            background: "rgba(0,0,0,0.4)",
            padding: "2px 6px",
            borderRadius: 4,
            fontFamily: "monospace",
            pointerEvents: "none",
          }}
        >
          {status}
        </div>
      )}
    </>
  );
}

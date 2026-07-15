"use client";

import { useEffect, useRef, useState } from "react";
import { MonitorPlay, RefreshCw, AlertCircle } from "lucide-react";
import type RFB from "@novnc/novnc";
import type { GuestType } from "@/lib/proxmox/types";

type Status = "idle" | "connecting" | "connected" | "error";

export function GuestConsole({
  node,
  type,
  vmid,
}: {
  node: string;
  type: GuestType;
  vmid: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rfbRef = useRef<RFB | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function connect() {
    setStatus("connecting");
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/console/${node}/${type}/${vmid}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Konsole konnte nicht gestartet werden");

      const proto = window.location.protocol === "https:" ? "wss" : "ws";
      const url = `${proto}://${window.location.host}${json.wsPath}`;

      const { default: RFBClient } = await import("@novnc/novnc");
      if (!containerRef.current) return;
      containerRef.current.innerHTML = "";

      const rfb = new RFBClient(containerRef.current, url, {
        wsProtocols: ["binary"],
        // Proxmox's VNC server authenticates the RFB handshake itself
        // (separately from the websocket tunnel) using the same ticket
        // as the VNC Authentication password.
        credentials: { password: json.vncPassword },
      });
      rfb.scaleViewport = true;
      rfb.resizeSession = true;

      rfb.addEventListener("connect", () => setStatus("connected"));
      rfb.addEventListener("disconnect", (e) => {
        setStatus("idle");
        const clean = (e as CustomEvent<{ clean: boolean }>).detail?.clean;
        if (!clean) setErrorMsg("Verbindung zur Konsole wurde getrennt.");
      });
      rfb.addEventListener("securityfailure", (e) => {
        const reason = (e as CustomEvent<{ reason?: string; status?: number }>).detail;
        setStatus("error");
        setErrorMsg(`VNC-Authentifizierung fehlgeschlagen: ${reason?.reason ?? reason?.status ?? "unbekannt"}`);
      });

      rfbRef.current = rfb;
    } catch (err) {
      setStatus("error");
      setErrorMsg((err as Error).message);
    }
  }

  useEffect(() => {
    return () => {
      rfbRef.current?.disconnect();
    };
  }, []);

  return (
    <div className="rounded-2xl border border-white/10 bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted">Konsole</h2>
        {status !== "connected" && (
          <button
            onClick={connect}
            disabled={status === "connecting"}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {status === "connecting" ? <RefreshCw size={13} className="animate-spin" /> : <MonitorPlay size={13} />}
            {status === "connecting" ? "Verbinde..." : "Konsole öffnen"}
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-offline/10 px-3 py-2 text-xs text-offline">
          <AlertCircle size={14} />
          {errorMsg}
        </div>
      )}

      <div className="relative min-h-[360px] overflow-hidden rounded-lg bg-black">
        {/* noVNC takes ownership of this node's DOM children directly; it must
            never also be a React render target, or the two will fight over
            child nodes and crash on unmount/update. */}
        <div ref={containerRef} className="absolute inset-0" />

        {status !== "connected" && (
          <p className="absolute inset-0 flex items-center justify-center text-xs text-muted">
            {status === "connecting" ? "Verbindung wird aufgebaut..." : "Noch keine Verbindung"}
          </p>
        )}
      </div>
    </div>
  );
}

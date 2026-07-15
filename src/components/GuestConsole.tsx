"use client";

import { useEffect, useRef, useState } from "react";
import { MonitorPlay, RefreshCw, AlertCircle, Maximize, Minimize } from "lucide-react";
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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const rfbRef = useRef<RFB | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

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
      // scaleViewport only has any effect while clipViewport is also
      // enabled - without it noVNC renders at native remote resolution
      // instead of fitting the container.
      rfb.clipViewport = true;
      rfb.scaleViewport = true;
      rfb.resizeSession = false;

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
    <div
      ref={wrapperRef}
      className={
        fullscreen
          ? "fixed inset-0 z-50 flex flex-col bg-bg p-4"
          : "rounded-2xl border border-white/10 bg-card p-5"
      }
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted">Konsole</h2>
        <div className="flex items-center gap-2">
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
          {status === "connected" && (
            <button
              onClick={() => setFullscreen((f) => !f)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-muted transition hover:text-white"
            >
              {fullscreen ? <Minimize size={13} /> : <Maximize size={13} />}
              {fullscreen ? "Verkleinern" : "Vollbild"}
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-offline/10 px-3 py-2 text-xs text-offline">
          <AlertCircle size={14} />
          {errorMsg}
        </div>
      )}

      <div
        className={
          fullscreen
            ? "relative flex-1 overflow-hidden rounded-lg bg-black"
            : "relative min-h-[520px] overflow-hidden rounded-lg bg-black"
        }
      >
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

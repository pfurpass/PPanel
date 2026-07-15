"use client";

import { useState } from "react";
import useSWR from "swr";
import { useParams, useRouter } from "next/navigation";
import { Play, Square, RotateCw, PowerOff, ArrowLeft, Cpu, MemoryStick, HardDrive, Trash2, Loader2 } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { StatusBadge } from "@/components/StatusBadge";
import { UsageBar } from "@/components/UsageBar";
import { GuestConsole } from "@/components/GuestConsole";
import { formatBytes, formatUptime, percent } from "@/lib/proxmox/mappers";
import type { GuestType } from "@/lib/proxmox/types";
import Link from "next/link";

interface GuestDetail {
  config: Record<string, unknown>;
  status: {
    status: string;
    cpu?: number;
    cpus?: number;
    mem?: number;
    maxmem?: number;
    disk?: number;
    maxdisk?: number;
    uptime?: number;
    name?: string;
  };
}

async function fetcher(url: string): Promise<GuestDetail> {
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Fehler beim Laden");
  return json;
}

export default function GuestDetailPage() {
  const params = useParams<{ node: string; type: string; vmid: string }>();
  const router = useRouter();
  const node = params.node;
  const type = params.type as GuestType;
  const vmid = Number(params.vmid);

  const {
    data: detail,
    error: swrError,
    mutate,
  } = useSWR<GuestDetail>(`/api/vms/${node}/${type}/${vmid}`, fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: false,
  });
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const error = actionError ?? (swrError ? swrError.message : null);

  async function runAction(action: "start" | "stop" | "reboot" | "shutdown") {
    setBusy(action);
    setActionError(null);
    try {
      const res = await fetch(`/api/vms/${node}/${type}/${vmid}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Aktion fehlgeschlagen");
      setTimeout(() => mutate(), 1500);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const name = (detail?.config?.name as string) || (detail?.config?.hostname as string) || `${type}-${vmid}`;
  const status = detail?.status?.status ?? "unknown";
  const running = status === "running";

  async function handleDelete() {
    if (
      !window.confirm(
        `${name} (VMID ${vmid}) wirklich unwiderruflich löschen? Alle Disks/Rootfs werden mit entfernt.`
      )
    ) {
      return;
    }
    setDeleting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/vms/${node}/${type}/${vmid}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Löschen fehlgeschlagen");
      router.push(type === "qemu" ? "/vms" : "/containers");
    } catch (err) {
      setActionError((err as Error).message);
      setDeleting(false);
    }
  }

  return (
    <>
      <Topbar
        title={name}
        breadcrumb={["Start", type === "qemu" ? "Virtuelle Maschinen" : "Container", name]}
        actions={
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-muted transition hover:text-white"
          >
            <ArrowLeft size={14} />
            Zurück
          </button>
        }
      />

      <div className="flex-1 space-y-6 p-6">
        {error && (
          <div className="rounded-lg bg-offline/10 px-4 py-3 text-sm text-offline">{error}</div>
        )}

        <div className="rounded-2xl border border-white/10 bg-card p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <StatusBadge status={status} />
              <span className="text-sm text-muted">
                {node} · VMID {vmid} · {type === "qemu" ? "QEMU/KVM" : "LXC"} · Uptime{" "}
                {formatUptime(detail?.status?.uptime ?? 0)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {running ? (
                <>
                  <ActionButton onClick={() => runAction("reboot")} busy={busy === "reboot"} icon={RotateCw}>
                    Neustart
                  </ActionButton>
                  <ActionButton onClick={() => runAction("shutdown")} busy={busy === "shutdown"} icon={PowerOff}>
                    Herunterfahren
                  </ActionButton>
                  <ActionButton onClick={() => runAction("stop")} busy={busy === "stop"} icon={Square} danger>
                    Stop (hart)
                  </ActionButton>
                </>
              ) : (
                <ActionButton onClick={() => runAction("start")} busy={busy === "start"} icon={Play} primary>
                  Starten
                </ActionButton>
              )}
              <ActionButton
                onClick={handleDelete}
                busy={deleting}
                icon={deleting ? Loader2 : Trash2}
                danger
                disabled={running}
                title={running ? "Zum Löschen zuerst stoppen" : undefined}
              >
                Löschen
              </ActionButton>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <UsageBar
              label={<span className="flex items-center gap-1.5"><Cpu size={12} /> CPU</span>}
              percent={Math.round((detail?.status?.cpu ?? 0) * 100)}
              detail={`${detail?.status?.cpus ?? "-"} Cores`}
            />
            <UsageBar
              label={<span className="flex items-center gap-1.5"><MemoryStick size={12} /> RAM</span>}
              percent={percent(detail?.status?.mem ?? 0, detail?.status?.maxmem ?? 0)}
              detail={`${formatBytes(detail?.status?.mem ?? 0)} / ${formatBytes(detail?.status?.maxmem ?? 0)}`}
            />
            <UsageBar
              label={<span className="flex items-center gap-1.5"><HardDrive size={12} /> Disk</span>}
              percent={percent(detail?.status?.disk ?? 0, detail?.status?.maxdisk ?? 0)}
              detail={formatBytes(detail?.status?.maxdisk ?? 0)}
            />
          </div>
        </div>

        <GuestConsole node={node} type={type} vmid={vmid} />

        <div className="rounded-2xl border border-white/10 bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-muted">Konfiguration</h2>
          <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(detail?.config ?? {})
              .filter(([key]) => !["digest", "description"].includes(key))
              .map(([key, value]) => (
                <div key={key} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                  <p className="text-[11px] text-muted">{key}</p>
                  <p className="truncate font-mono text-xs">{String(value)}</p>
                </div>
              ))}
          </div>
        </div>

        <Link href={type === "qemu" ? "/vms" : "/containers"} className="text-xs text-accent hover:underline">
          ← Zurück zur Übersicht
        </Link>
      </div>
    </>
  );
}

function ActionButton({
  children,
  onClick,
  busy,
  icon: Icon,
  primary,
  danger,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  busy?: boolean;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      title={title}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${
        primary
          ? "bg-gradient-to-r from-accent to-accent-2 text-white hover:brightness-110"
          : danger
            ? "border border-offline/30 text-offline hover:bg-offline/10"
            : "border border-white/10 text-muted hover:text-white"
      }`}
    >
      <Icon size={14} className={busy ? "animate-spin" : undefined} />
      {children}
    </button>
  );
}

"use client";

import Link from "next/link";
import { Play, Square, RotateCw, Settings2, Cpu, MemoryStick, HardDrive } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { UsageBar } from "./UsageBar";
import { formatBytes, formatUptime, percent } from "@/lib/proxmox/mappers";
import type { GuestSummary } from "@/lib/proxmox/types";
import { useState } from "react";

export function GuestCard({ guest, onChanged }: { guest: GuestSummary; onChanged?: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const running = guest.status === "running";

  async function runAction(action: "start" | "stop" | "reboot" | "shutdown") {
    setBusy(action);
    try {
      await fetch(`/api/vms/${guest.node}/${guest.type}/${guest.vmid}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      onChanged?.();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="group relative flex flex-col rounded-2xl border border-white/10 bg-card p-5 transition hover:border-white/20 hover:bg-card-hover">
      <span className="absolute right-5 top-5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted">
        {guest.node}
        <br />
        {guest.type === "qemu" ? "QEMU/KVM" : "LXC"}
      </span>

      <div className="mb-4 flex items-center gap-2 pr-20">
        <h3 className="truncate text-base font-bold">{guest.name}</h3>
        <StatusBadge status={guest.status} />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <p className="text-[11px] text-muted">VMID</p>
          <p className="font-medium">{guest.vmid}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted">Uptime</p>
          <p className="font-medium">{formatUptime(guest.uptime)}</p>
        </div>
      </div>

      <div className="mb-5 space-y-2.5">
        <UsageBar
          label={
            <span className="flex items-center gap-1.5">
              <Cpu size={12} /> CPU
            </span>
          }
          percent={Math.round((guest.cpu ?? 0) * 100)}
        />
        <UsageBar
          label={
            <span className="flex items-center gap-1.5">
              <MemoryStick size={12} /> RAM
            </span>
          }
          percent={percent(guest.mem, guest.maxmem)}
          detail={`${formatBytes(guest.mem)} / ${formatBytes(guest.maxmem)}`}
        />
        <UsageBar
          label={
            <span className="flex items-center gap-1.5">
              <HardDrive size={12} /> Disk
            </span>
          }
          percent={percent(guest.disk, guest.maxdisk)}
          detail={formatBytes(guest.maxdisk)}
        />
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-4">
        <div className="flex items-center gap-1.5">
          {running ? (
            <>
              <IconButton title="Neustart" onClick={() => runAction("reboot")} busy={busy === "reboot"}>
                <RotateCw size={15} />
              </IconButton>
              <IconButton title="Herunterfahren" onClick={() => runAction("shutdown")} busy={busy === "shutdown"}>
                <Square size={15} />
              </IconButton>
            </>
          ) : (
            <IconButton title="Starten" onClick={() => runAction("start")} busy={busy === "start"}>
              <Play size={15} />
            </IconButton>
          )}
        </div>
        <Link
          href={`/vms/${guest.node}/${guest.type}/${guest.vmid}`}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-3.5 py-2 text-xs font-semibold text-white transition hover:brightness-110"
        >
          <Settings2 size={14} />
          Verwalten
        </Link>
      </div>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  title,
  busy,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  busy?: boolean;
}) {
  return (
    <button
      title={title}
      disabled={busy}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-muted transition hover:border-white/20 hover:text-white disabled:opacity-40"
    >
      {children}
    </button>
  );
}

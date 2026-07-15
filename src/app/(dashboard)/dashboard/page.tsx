"use client";

import { Topbar } from "@/components/Topbar";
import { NotConfigured } from "@/components/NotConfigured";
import { GuestCard } from "@/components/GuestCard";
import { UsageBar } from "@/components/UsageBar";
import { useResources } from "@/lib/useResources";
import { formatBytes, percent } from "@/lib/proxmox/mappers";
import { Server, Box, CircleCheck, CircleX, Cpu, MemoryStick, HardDrive } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { data, notConfigured, error, refresh } = useResources();

  const guests = data?.guests ?? [];
  const nodes = data?.nodes ?? [];
  const running = guests.filter((g) => g.status === "running");
  const nodesOnline = nodes.filter((n) => n.status === "online");

  const totalCpu = guests.reduce((acc, g) => acc + (g.cpu ?? 0) * (g.maxcpu ?? 0), 0);
  const totalMaxCpu = guests.reduce((acc, g) => acc + (g.maxcpu ?? 0), 0);
  const totalMem = guests.reduce((acc, g) => acc + g.mem, 0);
  const totalMaxMem = guests.reduce((acc, g) => acc + g.maxmem, 0);
  const totalDisk = guests.reduce((acc, g) => acc + g.disk, 0);
  const totalMaxDisk = guests.reduce((acc, g) => acc + g.maxdisk, 0);

  return (
    <>
      <Topbar title="Dashboard" breadcrumb={["Start", "Dashboard"]} />
      {notConfigured && <NotConfigured message={error ?? undefined} />}

      <div className="flex-1 space-y-8 p-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile icon={Server} label="Nodes online" value={`${nodesOnline.length} / ${nodes.length}`} />
          <StatTile icon={CircleCheck} label="Läuft" value={String(running.length)} tone="online" />
          <StatTile icon={CircleX} label="Gestoppt" value={String(guests.length - running.length)} tone="offline" />
          <StatTile icon={Box} label="Gäste gesamt" value={String(guests.length)} />
        </div>

        <div className="rounded-2xl border border-white/10 bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-muted">Cluster-Auslastung</h2>
          <div className="grid gap-5 sm:grid-cols-3">
            <UsageBar
              label={<span className="flex items-center gap-1.5"><Cpu size={12}/> CPU</span>}
              percent={totalMaxCpu ? Math.round((totalCpu / totalMaxCpu) * 100) : 0}
            />
            <UsageBar
              label={<span className="flex items-center gap-1.5"><MemoryStick size={12}/> RAM</span>}
              percent={percent(totalMem, totalMaxMem)}
              detail={`${formatBytes(totalMem)} / ${formatBytes(totalMaxMem)}`}
            />
            <UsageBar
              label={<span className="flex items-center gap-1.5"><HardDrive size={12}/> Disk</span>}
              percent={percent(totalDisk, totalMaxDisk)}
              detail={`${formatBytes(totalDisk)} / ${formatBytes(totalMaxDisk)}`}
            />
          </div>
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted">Deine virtuellen Maschinen &amp; Container</h2>
            <Link href="/vms" className="text-xs font-medium text-accent hover:underline">
              Alle anzeigen
            </Link>
          </div>
          {guests.length === 0 ? (
            <EmptyState notConfigured={notConfigured} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {guests.slice(0, 6).map((g) => (
                <GuestCard key={`${g.type}-${g.node}-${g.vmid}`} guest={g} onChanged={refresh} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  tone?: "online" | "offline";
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-card p-4">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          tone === "online"
            ? "bg-online/10 text-online"
            : tone === "offline"
              ? "bg-offline/10 text-offline"
              : "bg-accent/10 text-accent"
        }`}
      >
        <Icon size={18} />
      </div>
      <div>
        <p className="text-lg font-bold leading-tight">{value}</p>
        <p className="text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}

function EmptyState({ notConfigured }: { notConfigured: boolean }) {
  if (notConfigured) return null;
  return (
    <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-muted">
      Keine VMs oder Container gefunden.
    </div>
  );
}

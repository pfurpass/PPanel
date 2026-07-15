"use client";

import { Topbar } from "@/components/Topbar";
import { NotConfigured } from "@/components/NotConfigured";
import { UsageBar } from "@/components/UsageBar";
import { StatusBadge } from "@/components/StatusBadge";
import { useResources } from "@/lib/useResources";
import { formatBytes, formatUptime, percent } from "@/lib/proxmox/mappers";
import { Cpu, MemoryStick, HardDrive } from "lucide-react";

export default function NodesPage() {
  const { data, notConfigured, error } = useResources();
  const nodes = data?.nodes ?? [];

  return (
    <>
      <Topbar title="Nodes" breadcrumb={["Start", "Nodes"]} />
      {notConfigured && <NotConfigured message={error ?? undefined} />}

      <div className="flex-1 p-6">
        {nodes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-muted">
            {notConfigured ? "Verbinde zuerst deinen Proxmox-Server." : "Keine Nodes gefunden."}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {nodes.map((node) => (
              <div key={node.node} className="rounded-2xl border border-white/10 bg-card p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-bold">{node.node}</h3>
                  <StatusBadge status={node.status} />
                </div>
                <p className="mb-4 text-xs text-muted">Uptime {formatUptime(node.uptime ?? 0)}</p>
                <div className="space-y-2.5">
                  <UsageBar
                    label={<span className="flex items-center gap-1.5"><Cpu size={12} /> CPU</span>}
                    percent={Math.round((node.cpu ?? 0) * 100)}
                  />
                  <UsageBar
                    label={<span className="flex items-center gap-1.5"><MemoryStick size={12} /> RAM</span>}
                    percent={percent(node.mem ?? 0, node.maxmem ?? 0)}
                    detail={`${formatBytes(node.mem ?? 0)} / ${formatBytes(node.maxmem ?? 0)}`}
                  />
                  <UsageBar
                    label={<span className="flex items-center gap-1.5"><HardDrive size={12} /> Disk</span>}
                    percent={percent(node.disk ?? 0, node.maxdisk ?? 0)}
                    detail={`${formatBytes(node.disk ?? 0)} / ${formatBytes(node.maxdisk ?? 0)}`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

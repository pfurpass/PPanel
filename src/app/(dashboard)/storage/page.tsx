"use client";

import { Topbar } from "@/components/Topbar";
import { NotConfigured } from "@/components/NotConfigured";
import { UsageBar } from "@/components/UsageBar";
import { useResources } from "@/lib/useResources";
import { formatBytes, percent } from "@/lib/proxmox/mappers";
import { Database } from "lucide-react";

export default function StoragePage() {
  const { data, notConfigured, error } = useResources();
  const storages = data?.storages ?? [];

  return (
    <>
      <Topbar title="Storage" breadcrumb={["Start", "Storage"]} />
      {notConfigured && <NotConfigured message={error ?? undefined} />}

      <div className="flex-1 p-6">
        {storages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-muted">
            {notConfigured ? "Verbinde zuerst deinen Proxmox-Server." : "Kein Storage gefunden."}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase text-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Storage</th>
                  <th className="px-5 py-3 font-medium">Node</th>
                  <th className="px-5 py-3 font-medium">Typ</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Belegung</th>
                </tr>
              </thead>
              <tbody>
                {storages.map((s) => (
                  <tr key={s.id} className="border-b border-white/5 last:border-0">
                    <td className="px-5 py-3 font-medium">
                      <span className="flex items-center gap-2">
                        <Database size={14} className="text-accent" />
                        {s.storage}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted">{s.node}</td>
                    <td className="px-5 py-3 text-muted">{s.type}</td>
                    <td className="px-5 py-3 text-muted">{s.status}</td>
                    <td className="px-5 py-3">
                      <div className="w-48">
                        <UsageBar
                          label=""
                          percent={percent(s.disk, s.maxdisk)}
                          detail={`${formatBytes(s.disk)} / ${formatBytes(s.maxdisk)}`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

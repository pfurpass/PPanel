"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { NotConfigured } from "@/components/NotConfigured";
import { GuestCard } from "@/components/GuestCard";
import { useResources } from "@/lib/useResources";
import type { GuestType } from "@/lib/proxmox/types";

export function GuestListPage({
  type,
  title,
  breadcrumb,
}: {
  type: GuestType;
  title: string;
  breadcrumb: string[];
}) {
  const { data, notConfigured, error, refresh } = useResources();
  const [query, setQuery] = useState("");

  const guests = useMemo(() => {
    const all = (data?.guests ?? []).filter((g) => g.type === type);
    if (!query.trim()) return all;
    const q = query.toLowerCase();
    return all.filter(
      (g) => g.name.toLowerCase().includes(q) || String(g.vmid).includes(q) || g.node.toLowerCase().includes(q)
    );
  }, [data, type, query]);

  return (
    <>
      <Topbar
        title={title}
        breadcrumb={breadcrumb}
        actions={
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Suchen..."
              className="w-56 rounded-lg border border-white/10 bg-card py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted focus:border-accent/50"
            />
          </div>
        }
      />
      {notConfigured && <NotConfigured message={error ?? undefined} />}

      <div className="flex-1 p-6">
        {guests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-muted">
            {notConfigured ? "Verbinde zuerst deinen Proxmox-Server." : "Keine Einträge gefunden."}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {guests.map((g) => (
              <GuestCard key={`${g.type}-${g.node}-${g.vmid}`} guest={g} onChanged={refresh} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

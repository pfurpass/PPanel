"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Server,
  Box,
  HardDrive,
  Network,
  PlusCircle,
  Flame,
} from "lucide-react";
import clsx from "clsx";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vms", label: "Virtuelle Maschinen", icon: Server },
  { href: "/containers", label: "Container", icon: Box },
  { href: "/storage", label: "Storage", icon: HardDrive },
  { href: "/nodes", label: "Nodes", icon: Network },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-white/10 bg-sidebar px-4 py-6">
      <div className="flex items-center gap-2 px-2 pb-8">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-2">
          <Flame size={18} className="text-white" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight">PPanel</p>
          <p className="text-[11px] text-muted leading-tight">Proxmox Control Panel</p>
        </div>
      </div>

      <Link
        href="/create"
        className="mb-6 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-3 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition hover:brightness-110"
      >
        <PlusCircle size={16} />
        VM / CT erstellen
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-white/[0.07] text-white"
                  : "text-muted hover:bg-white/[0.04] hover:text-white"
              )}
            >
              <Icon size={17} className={active ? "text-accent" : ""} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-lg border border-white/10 bg-card px-3 py-3 text-[11px] text-muted">
        Verbunden per Proxmox API-Token. Alle Aktionen wirken direkt auf deinen Proxmox-Cluster.
      </div>
    </aside>
  );
}

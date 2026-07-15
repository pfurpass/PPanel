import type { ClusterResource, GuestSummary, StorageSummary } from "./types";

export function toGuestSummaries(resources: ClusterResource[]): GuestSummary[] {
  return resources
    .filter((r) => (r.type === "qemu" || r.type === "lxc") && !r.template)
    .map((r) => ({
      vmid: r.vmid ?? 0,
      name: r.name ?? `${r.type}-${r.vmid}`,
      type: r.type as "qemu" | "lxc",
      node: r.node,
      status: r.status ?? "unknown",
      cpu: r.cpu ?? 0,
      maxcpu: r.maxcpu ?? 1,
      mem: r.mem ?? 0,
      maxmem: r.maxmem ?? 0,
      disk: r.disk ?? 0,
      maxdisk: r.maxdisk ?? 0,
      uptime: r.uptime ?? 0,
      tags: r.tags ? r.tags.split(";").filter(Boolean) : [],
    }))
    .sort((a, b) => a.vmid - b.vmid);
}

export function toStorageSummaries(resources: ClusterResource[]): StorageSummary[] {
  return resources
    .filter((r) => r.type === "storage")
    .map((r) => ({
      id: r.id,
      storage: r.storage ?? r.id,
      node: r.node,
      type: r.plugintype ?? "storage",
      disk: r.disk ?? 0,
      maxdisk: r.maxdisk ?? 0,
      status: r.status ?? "unknown",
    }));
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exp);
  return `${value.toFixed(exp === 0 ? 0 : 1)} ${units[exp]}`;
}

export function formatUptime(seconds: number): string {
  if (!seconds) return "-";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function percent(value: number, max: number): number {
  if (!max) return 0;
  return Math.min(100, Math.round((value / max) * 100));
}

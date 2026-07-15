export type GuestType = "qemu" | "lxc";

export interface ProxmoxApiResponse<T> {
  data: T;
}

export interface PveNode {
  node: string;
  status: "online" | "offline" | "unknown";
  cpu?: number;
  maxcpu?: number;
  mem?: number;
  maxmem?: number;
  disk?: number;
  maxdisk?: number;
  uptime?: number;
  level?: string;
}

export interface ClusterResource {
  id: string;
  type: "node" | "qemu" | "lxc" | "storage" | "pool" | "sdn";
  node: string;
  vmid?: number;
  name?: string;
  status?: string;
  template?: number;
  cpu?: number;
  maxcpu?: number;
  mem?: number;
  maxmem?: number;
  disk?: number;
  maxdisk?: number;
  uptime?: number;
  storage?: string;
  plugintype?: string;
  tags?: string;
  netin?: number;
  netout?: number;
}

export interface GuestSummary {
  vmid: number;
  name: string;
  type: GuestType;
  node: string;
  status: string;
  cpu: number;
  maxcpu: number;
  mem: number;
  maxmem: number;
  disk: number;
  maxdisk: number;
  uptime: number;
  tags: string[];
}

export interface StorageSummary {
  id: string;
  storage: string;
  node: string;
  type: string;
  disk: number;
  maxdisk: number;
  status: string;
}

export type GuestAction = "start" | "stop" | "shutdown" | "reboot" | "suspend" | "resume";

export interface VncTicket {
  ticket: string;
  port: string;
  user: string;
  cert?: string;
}

export interface StorageContentItem {
  volid: string;
  content: string;
  size: number;
  format?: string;
}

export interface NodeStorage {
  storage: string;
  type: string;
  // comma-separated list of allowed content types, e.g. "images,rootdir"
  // or "iso,vztmpl,backup" - a "dir" storage like the default "local" often
  // only allows the latter, while VM/CT disks need "images"/"rootdir".
  content: string;
  active: boolean;
  avail: number;
  total: number;
}

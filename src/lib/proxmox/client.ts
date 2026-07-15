import { proxmoxApiBase, proxmoxAuthHeader, proxmoxConfig } from "./config";
import type {
  ClusterResource,
  GuestAction,
  GuestType,
  NodeStorage,
  PveNode,
  ProxmoxApiResponse,
  StorageContentItem,
  VncTicket,
} from "./types";

class ProxmoxApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ProxmoxApiError";
  }
}

// Proxmox's default self-signed certificate can't be verified by Node's
// trust store. Node's TLS layer (used by every fetch/http implementation,
// regardless of which undici instance is involved) reads this env var at
// connection time, so toggling it here is what actually takes effect.
function applyTlsVerification() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = proxmoxConfig.verifySsl() ? "1" : "0";
}

async function pveFetch<T>(
  path: string,
  init: { method?: string; body?: Record<string, unknown> } = {}
): Promise<T> {
  applyTlsVerification();
  const url = `${proxmoxApiBase()}${path}`;
  const method = init.method ?? "GET";

  let body: string | undefined;
  const headers: Record<string, string> = {
    Authorization: proxmoxAuthHeader(),
  };

  if (init.body) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(init.body)) {
      if (value === undefined || value === null) continue;
      params.set(key, String(value));
    }
    body = params.toString();
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body,
      cache: "no-store",
    });
  } catch (err) {
    const cause = (err as { cause?: unknown }).cause;
    const causeMessage = cause instanceof Error ? cause.message : cause ? String(cause) : undefined;
    throw new Error(
      `Konnte ${url} nicht erreichen: ${(err as Error).message}${causeMessage ? ` (${causeMessage})` : ""}`
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ProxmoxApiError(res.status, `Proxmox API ${method} ${path} failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as ProxmoxApiResponse<T>;
  return json.data;
}

export const proxmox = {
  async version() {
    return pveFetch<{ version: string; release: string }>("/version");
  },

  async nodes() {
    return pveFetch<PveNode[]>("/nodes");
  },

  async nodeStatus(node: string) {
    return pveFetch<Record<string, unknown>>(`/nodes/${encodeURIComponent(node)}/status`);
  },

  async clusterResources(type?: "vm" | "storage" | "node") {
    const suffix = type ? `?type=${type}` : "";
    return pveFetch<ClusterResource[]>(`/cluster/resources${suffix}`);
  },

  async nodeStorages(node: string) {
    return pveFetch<NodeStorage[]>(`/nodes/${encodeURIComponent(node)}/storage`);
  },

  async guestConfig(node: string, type: GuestType, vmid: number) {
    return pveFetch<Record<string, unknown>>(
      `/nodes/${encodeURIComponent(node)}/${type}/${vmid}/config`
    );
  },

  async guestStatus(node: string, type: GuestType, vmid: number) {
    return pveFetch<Record<string, unknown>>(
      `/nodes/${encodeURIComponent(node)}/${type}/${vmid}/status/current`
    );
  },

  async guestAction(node: string, type: GuestType, vmid: number, action: GuestAction) {
    return pveFetch<string>(
      `/nodes/${encodeURIComponent(node)}/${type}/${vmid}/status/${action}`,
      { method: "POST" }
    );
  },

  async updateGuestConfig(node: string, type: GuestType, vmid: number, params: Record<string, unknown>) {
    return pveFetch<string | null>(`/nodes/${encodeURIComponent(node)}/${type}/${vmid}/config`, {
      method: "PUT",
      body: params,
    });
  },

  async resizeDisk(node: string, type: GuestType, vmid: number, disk: string, size: string) {
    return pveFetch<string | null>(`/nodes/${encodeURIComponent(node)}/${type}/${vmid}/resize`, {
      method: "PUT",
      body: { disk, size },
    });
  },

  async deleteGuest(node: string, type: GuestType, vmid: number, opts?: { purge?: boolean }) {
    const suffix = opts?.purge ? "?purge=1" : "";
    return pveFetch<string>(`/nodes/${encodeURIComponent(node)}/${type}/${vmid}${suffix}`, {
      method: "DELETE",
    });
  },

  async storageContent(node: string, storage: string, content?: string) {
    const suffix = content ? `?content=${content}` : "";
    return pveFetch<StorageContentItem[]>(
      `/nodes/${encodeURIComponent(node)}/storage/${encodeURIComponent(storage)}/content${suffix}`
    );
  },

  async createVm(node: string, params: Record<string, unknown>) {
    return pveFetch<string>(`/nodes/${encodeURIComponent(node)}/qemu`, {
      method: "POST",
      body: params,
    });
  },

  async createLxc(node: string, params: Record<string, unknown>) {
    return pveFetch<string>(`/nodes/${encodeURIComponent(node)}/lxc`, {
      method: "POST",
      body: params,
    });
  },

  async vncProxy(node: string, type: GuestType, vmid: number) {
    return pveFetch<VncTicket>(
      `/nodes/${encodeURIComponent(node)}/${type}/${vmid}/vncproxy`,
      { method: "POST", body: { websocket: 1 } }
    );
  },

  async nextVmid() {
    return pveFetch<string>("/cluster/nextid");
  },
};

export { ProxmoxApiError };

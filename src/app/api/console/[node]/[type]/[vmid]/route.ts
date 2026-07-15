import { NextResponse } from "next/server";
import { proxmox, ProxmoxApiError } from "@/lib/proxmox/client";
import { isProxmoxConfigured } from "@/lib/proxmox/config";
import type { GuestType } from "@/lib/proxmox/types";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ node: string; type: string; vmid: string }> }
) {
  if (!isProxmoxConfigured()) {
    return NextResponse.json({ error: "Proxmox ist nicht konfiguriert." }, { status: 503 });
  }
  const { node, type, vmid } = await params;
  const guestType = type as GuestType;
  if (guestType !== "qemu" && guestType !== "lxc") {
    return NextResponse.json({ error: "Ungültiger Typ" }, { status: 400 });
  }

  try {
    const ticket = await proxmox.vncProxy(node, guestType, Number(vmid));
    const wsPath = `/ws/console/${encodeURIComponent(node)}/${guestType}/${vmid}?port=${encodeURIComponent(
      ticket.port
    )}&ticket=${encodeURIComponent(ticket.ticket)}`;
    // The RFB (VNC) protocol handshake itself is authenticated separately
    // from the websocket tunnel: Proxmox's VNC server requires the same
    // ticket to be used as the VNC Authentication password.
    return NextResponse.json({ wsPath, vncPassword: ticket.ticket });
  } catch (err) {
    const status = err instanceof ProxmoxApiError ? err.status : 502;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}

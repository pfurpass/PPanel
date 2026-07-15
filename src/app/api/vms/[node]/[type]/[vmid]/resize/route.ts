import { NextResponse } from "next/server";
import { proxmox, ProxmoxApiError } from "@/lib/proxmox/client";
import { isProxmoxConfigured } from "@/lib/proxmox/config";
import type { GuestType } from "@/lib/proxmox/types";

export async function POST(
  req: Request,
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

  const body = (await req.json().catch(() => null)) as { disk?: string; addGb?: number } | null;
  if (!body?.disk || !body.addGb || body.addGb <= 0) {
    return NextResponse.json({ error: "disk und addGb (> 0) erforderlich." }, { status: 400 });
  }

  try {
    // Proxmox only supports growing a disk through this endpoint - shrinking
    // requires filesystem-level work first and isn't exposed here, matching
    // Proxmox's own web UI resize dialog.
    await proxmox.resizeDisk(node, guestType, Number(vmid), body.disk, `+${body.addGb}G`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = err instanceof ProxmoxApiError ? err.status : 502;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}

import { NextResponse } from "next/server";
import { proxmox, ProxmoxApiError } from "@/lib/proxmox/client";
import { isProxmoxConfigured } from "@/lib/proxmox/config";
import type { GuestType } from "@/lib/proxmox/types";

export async function GET(
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
    const [config, status] = await Promise.all([
      proxmox.guestConfig(node, guestType, Number(vmid)),
      proxmox.guestStatus(node, guestType, Number(vmid)),
    ]);
    return NextResponse.json({ config, status });
  } catch (err) {
    const httpStatus = err instanceof ProxmoxApiError ? err.status : 502;
    return NextResponse.json({ error: (err as Error).message }, { status: httpStatus });
  }
}

export async function PATCH(
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

  const body = (await req.json().catch(() => null)) as { cores?: number; memory?: number } | null;
  if (!body || (!body.cores && !body.memory)) {
    return NextResponse.json({ error: "cores und/oder memory erforderlich." }, { status: 400 });
  }

  try {
    const params: Record<string, unknown> = {};
    if (body.cores) params.cores = body.cores;
    if (body.memory) {
      params.memory = body.memory;
      if (guestType === "lxc") params.swap = body.memory;
    }
    await proxmox.updateGuestConfig(node, guestType, Number(vmid), params);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const httpStatus = err instanceof ProxmoxApiError ? err.status : 502;
    return NextResponse.json({ error: (err as Error).message }, { status: httpStatus });
  }
}

export async function DELETE(
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
    const task = await proxmox.deleteGuest(node, guestType, Number(vmid), { purge: true });
    return NextResponse.json({ task });
  } catch (err) {
    const httpStatus = err instanceof ProxmoxApiError ? err.status : 502;
    return NextResponse.json({ error: (err as Error).message }, { status: httpStatus });
  }
}

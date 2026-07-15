import { NextResponse } from "next/server";
import { proxmox, ProxmoxApiError } from "@/lib/proxmox/client";
import { isProxmoxConfigured } from "@/lib/proxmox/config";
import type { GuestAction, GuestType } from "@/lib/proxmox/types";

const ALLOWED_ACTIONS: GuestAction[] = ["start", "stop", "shutdown", "reboot", "suspend", "resume"];

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

  const body = await req.json().catch(() => ({}));
  const action = body.action as GuestAction;
  if (!ALLOWED_ACTIONS.includes(action)) {
    return NextResponse.json(
      { error: `Ungültige Aktion. Erlaubt: ${ALLOWED_ACTIONS.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const task = await proxmox.guestAction(node, guestType, Number(vmid), action);
    return NextResponse.json({ task });
  } catch (err) {
    const httpStatus = err instanceof ProxmoxApiError ? err.status : 502;
    return NextResponse.json({ error: (err as Error).message }, { status: httpStatus });
  }
}

import { NextResponse } from "next/server";
import { proxmox, ProxmoxApiError } from "@/lib/proxmox/client";
import { isProxmoxConfigured } from "@/lib/proxmox/config";

export async function GET() {
  if (!isProxmoxConfigured()) {
    return NextResponse.json({ error: "Proxmox ist nicht konfiguriert." }, { status: 503 });
  }
  try {
    const nodes = await proxmox.nodes();
    return NextResponse.json({ nodes });
  } catch (err) {
    const status = err instanceof ProxmoxApiError ? err.status : 502;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}

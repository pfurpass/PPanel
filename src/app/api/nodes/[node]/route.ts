import { NextResponse } from "next/server";
import { proxmox, ProxmoxApiError } from "@/lib/proxmox/client";
import { isProxmoxConfigured } from "@/lib/proxmox/config";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ node: string }> }
) {
  if (!isProxmoxConfigured()) {
    return NextResponse.json({ error: "Proxmox ist nicht konfiguriert." }, { status: 503 });
  }
  const { node } = await params;
  try {
    const status = await proxmox.nodeStatus(node);
    return NextResponse.json({ status });
  } catch (err) {
    const httpStatus = err instanceof ProxmoxApiError ? err.status : 502;
    return NextResponse.json({ error: (err as Error).message }, { status: httpStatus });
  }
}

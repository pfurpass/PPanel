import { NextResponse } from "next/server";
import { proxmox, ProxmoxApiError } from "@/lib/proxmox/client";
import { isProxmoxConfigured } from "@/lib/proxmox/config";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ node: string; storage: string }> }
) {
  if (!isProxmoxConfigured()) {
    return NextResponse.json({ error: "Proxmox ist nicht konfiguriert." }, { status: 503 });
  }
  const { node, storage } = await params;
  const url = new URL(req.url);
  const content = url.searchParams.get("content") ?? undefined;

  try {
    const items = await proxmox.storageContent(node, storage, content);
    return NextResponse.json({ items });
  } catch (err) {
    const status = err instanceof ProxmoxApiError ? err.status : 502;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}

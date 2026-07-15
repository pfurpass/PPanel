import { NextResponse } from "next/server";
import { proxmox, ProxmoxApiError } from "@/lib/proxmox/client";
import { isProxmoxConfigured } from "@/lib/proxmox/config";
import { toGuestSummaries, toStorageSummaries } from "@/lib/proxmox/mappers";

export async function GET() {
  if (!isProxmoxConfigured()) {
    return NextResponse.json(
      { error: "Proxmox ist nicht konfiguriert. Bitte PROXMOX_HOST/PROXMOX_TOKEN_ID/PROXMOX_TOKEN_SECRET in .env.local setzen." },
      { status: 503 }
    );
  }

  try {
    const [resources, nodes] = await Promise.all([
      proxmox.clusterResources(),
      proxmox.nodes(),
    ]);

    return NextResponse.json({
      nodes,
      guests: toGuestSummaries(resources),
      storages: toStorageSummaries(resources),
    });
  } catch (err) {
    const status = err instanceof ProxmoxApiError ? err.status : 502;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}

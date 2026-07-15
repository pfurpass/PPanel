import { NextResponse } from "next/server";
import { proxmox, ProxmoxApiError } from "@/lib/proxmox/client";
import { isProxmoxConfigured } from "@/lib/proxmox/config";

interface CreatePayload {
  type: "qemu" | "lxc";
  node: string;
  vmid?: number;
  name: string;
  cores: number;
  memory: number;
  diskGb: number;
  storage: string;
  bridge: string;
  // qemu-only
  isoVolid?: string;
  // lxc-only
  templateVolid?: string;
  password?: string;
  unprivileged?: boolean;
}

export async function POST(req: Request) {
  if (!isProxmoxConfigured()) {
    return NextResponse.json({ error: "Proxmox ist nicht konfiguriert." }, { status: 503 });
  }

  const payload = (await req.json().catch(() => null)) as CreatePayload | null;
  if (!payload) {
    return NextResponse.json({ error: "Ungültiger Request-Body" }, { status: 400 });
  }

  const { type, node, name, cores, memory, diskGb, storage, bridge } = payload;
  if (!type || !node || !name || !cores || !memory || !diskGb || !storage || !bridge) {
    return NextResponse.json({ error: "Pflichtfelder fehlen." }, { status: 400 });
  }

  try {
    const vmid = payload.vmid ?? Number(await proxmox.nextVmid());

    if (type === "qemu") {
      const task = await proxmox.createVm(node, {
        vmid,
        name,
        cores,
        memory,
        net0: `virtio,bridge=${bridge}`,
        scsihw: "virtio-scsi-pci",
        scsi0: `${storage}:${diskGb}`,
        ide2: payload.isoVolid ? `${payload.isoVolid},media=cdrom` : undefined,
        ostype: "l26",
        boot: "order=scsi0;ide2",
      });
      return NextResponse.json({ vmid, task });
    }

    if (!payload.templateVolid) {
      return NextResponse.json({ error: "templateVolid ist für LXC erforderlich." }, { status: 400 });
    }

    const task = await proxmox.createLxc(node, {
      vmid,
      hostname: name,
      cores,
      memory,
      swap: memory,
      net0: `name=eth0,bridge=${bridge},ip=dhcp`,
      rootfs: `${storage}:${diskGb}`,
      ostemplate: payload.templateVolid,
      password: payload.password,
      unprivileged: payload.unprivileged === false ? 0 : 1,
    });
    return NextResponse.json({ vmid, task });
  } catch (err) {
    const status = err instanceof ProxmoxApiError ? err.status : 502;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}

"use client";

import { useState } from "react";
import { Cpu, MemoryStick, HardDrive, Pencil, Loader2, Check, X } from "lucide-react";
import type { GuestType } from "@/lib/proxmox/types";

function findPrimaryDisk(
  config: Record<string, unknown>,
  type: GuestType
): { key: string; sizeGb: number } | null {
  if (type === "lxc") {
    const value = config.rootfs as string | undefined;
    if (!value) return null;
    const match = value.match(/size=(\d+(?:\.\d+)?)G/);
    return { key: "rootfs", sizeGb: match ? Number(match[1]) : 0 };
  }

  for (const [key, value] of Object.entries(config)) {
    if (!/^(scsi|virtio|sata|ide)\d+$/.test(key)) continue;
    const str = String(value);
    if (str.includes("media=cdrom")) continue;
    const match = str.match(/size=(\d+(?:\.\d+)?)G/);
    return { key, sizeGb: match ? Number(match[1]) : 0 };
  }
  return null;
}

export function HardwareEditor({
  node,
  type,
  vmid,
  config,
  onSaved,
}: {
  node: string;
  type: GuestType;
  vmid: number;
  config: Record<string, unknown>;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [cores, setCores] = useState(0);
  const [memory, setMemory] = useState(0);
  const [addDiskGb, setAddDiskGb] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentCores = Number(config.cores ?? 1);
  const currentMemory = Number(config.memory ?? 0);
  const disk = findPrimaryDisk(config, type);

  function startEditing() {
    setCores(currentCores);
    setMemory(currentMemory);
    setAddDiskGb(0);
    setError(null);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const requests: Promise<Response>[] = [];

      if (cores !== currentCores || memory !== currentMemory) {
        requests.push(
          fetch(`/api/vms/${node}/${type}/${vmid}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cores: cores !== currentCores ? cores : undefined,
              memory: memory !== currentMemory ? memory : undefined,
            }),
          })
        );
      }

      if (addDiskGb > 0 && disk) {
        requests.push(
          fetch(`/api/vms/${node}/${type}/${vmid}/resize`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ disk: disk.key, addGb: addDiskGb }),
          })
        );
      }

      if (requests.length === 0) {
        setEditing(false);
        return;
      }

      const results = await Promise.all(requests);
      for (const res of results) {
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error ?? "Änderung fehlgeschlagen");
        }
      }

      setEditing(false);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="rounded-2xl border border-white/10 bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted">Hardware</h2>
          <button
            onClick={startEditing}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-muted transition hover:text-white"
          >
            <Pencil size={13} />
            Bearbeiten
          </button>
        </div>
        <div className="grid gap-4 text-sm sm:grid-cols-3">
          <HardwareStat icon={Cpu} label="CPU-Kerne" value={String(currentCores)} />
          <HardwareStat icon={MemoryStick} label="RAM" value={`${(currentMemory / 1024).toFixed(1)} GB`} />
          <HardwareStat
            icon={HardDrive}
            label={type === "lxc" ? "Rootfs" : "Disk"}
            value={disk ? `${disk.sizeGb} GB (${disk.key})` : "-"}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-accent/30 bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted">Hardware bearbeiten</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing(false)}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-muted transition hover:text-white disabled:opacity-50"
          >
            <X size={13} />
            Abbrechen
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            Speichern
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-offline/10 px-3 py-2 text-xs text-offline">{error}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">CPU-Kerne</span>
          <input
            type="number"
            min={1}
            max={64}
            value={cores}
            onChange={(e) => setCores(Number(e.target.value))}
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-accent/50"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">RAM (MB)</span>
          <input
            type="number"
            min={128}
            step={128}
            value={memory}
            onChange={(e) => setMemory(Number(e.target.value))}
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-accent/50"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">
            {disk ? `${type === "lxc" ? "Rootfs" : "Disk"} vergrößern um (GB)` : "Kein Datenträger gefunden"}
          </span>
          <input
            type="number"
            min={0}
            value={addDiskGb}
            disabled={!disk}
            onChange={(e) => setAddDiskGb(Number(e.target.value))}
            placeholder="0"
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-accent/50 disabled:opacity-40"
          />
        </label>
      </div>
      <p className="mt-3 text-[11px] text-muted">
        Festplatten können nur vergrößert werden (Proxmox unterstützt kein Verkleinern per API). CPU/RAM-Änderungen
        wirken bei laufenden Gästen ohne Hotplug erst nach einem Neustart.
      </p>
    </div>
  );
}

function HardwareStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
        <Icon size={15} />
      </div>
      <div>
        <p className="text-[11px] text-muted">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

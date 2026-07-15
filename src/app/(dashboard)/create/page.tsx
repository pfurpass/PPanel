"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Server, Box, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import clsx from "clsx";
import { Topbar } from "@/components/Topbar";
import { NotConfigured } from "@/components/NotConfigured";
import { useResources } from "@/lib/useResources";
import type { NodeStorage, StorageContentItem } from "@/lib/proxmox/types";

type GuestKind = "qemu" | "lxc";

function hasContent(s: NodeStorage, type: string) {
  return s.content.split(",").includes(type);
}

export default function CreatePage() {
  const router = useRouter();
  const { data, notConfigured, error: resError } = useResources(0);
  const nodes = useMemo(() => data?.nodes.filter((n) => n.status === "online") ?? [], [data]);

  const [kind, setKind] = useState<GuestKind>("qemu");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [cores, setCores] = useState(2);
  const [memory, setMemory] = useState(2048);
  const [diskGb, setDiskGb] = useState(20);
  const [nodeStorages, setNodeStorages] = useState<NodeStorage[]>([]);
  const [selectedDiskStorage, setSelectedDiskStorage] = useState<string | null>(null);
  const [selectedMediaStorage, setSelectedMediaStorage] = useState<string | null>(null);
  const [bridge, setBridge] = useState("vmbr0");
  const [vlanTag, setVlanTag] = useState("");
  const [firewall, setFirewall] = useState(true);
  const [ipMode, setIpMode] = useState<"dhcp" | "static">("dhcp");
  const [ipAddress, setIpAddress] = useState("");
  const [gateway, setGateway] = useState("");
  const [isoVolid, setIsoVolid] = useState("");
  const [templateVolid, setTemplateVolid] = useState("");
  const [password, setPassword] = useState("");

  const [isoOptions, setIsoOptions] = useState<StorageContentItem[]>([]);
  const [templateOptions, setTemplateOptions] = useState<StorageContentItem[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Derived selections (computed at render time instead of synced via effects):
  // fall back to the first available option whenever the explicit selection
  // is empty or no longer valid for the current node/kind.
  const node = nodes.some((n) => n.node === selectedNode) ? (selectedNode as string) : (nodes[0]?.node ?? "");

  useEffect(() => {
    if (!node) return;
    fetch(`/api/storage/${node}`)
      .then((r) => r.json())
      .then((json) => setNodeStorages(json.storages ?? []))
      .catch(() => setNodeStorages([]));
  }, [node]);

  // "local" (dir storage) commonly only allows iso/vztmpl/backup, while
  // "local-lvm" (or other block storage) only allows images/rootdir - VM
  // disks and CT root filesystems need a storage that supports the
  // former, ISOs/templates need one that supports the latter, and those
  // are frequently two different storages.
  const diskStorages = useMemo(
    () => nodeStorages.filter((s) => hasContent(s, "images") || hasContent(s, "rootdir")),
    [nodeStorages]
  );
  const mediaStorages = useMemo(
    () => nodeStorages.filter((s) => hasContent(s, kind === "qemu" ? "iso" : "vztmpl")),
    [nodeStorages, kind]
  );

  const diskStorage = diskStorages.some((s) => s.storage === selectedDiskStorage)
    ? (selectedDiskStorage as string)
    : (diskStorages[0]?.storage ?? "");
  const mediaStorage = mediaStorages.some((s) => s.storage === selectedMediaStorage)
    ? (selectedMediaStorage as string)
    : (mediaStorages[0]?.storage ?? "");

  useEffect(() => {
    if (!node || !mediaStorage) return;
    const contentType = kind === "qemu" ? "iso" : "vztmpl";
    fetch(`/api/storage/${node}/${mediaStorage}/content?content=${contentType}`)
      .then((r) => r.json())
      .then((json) => {
        if (kind === "qemu") setIsoOptions(json.items ?? []);
        else setTemplateOptions(json.items ?? []);
      })
      .catch(() => {});
  }, [node, mediaStorage, kind]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/vms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: kind,
          node,
          name,
          cores,
          memory,
          diskGb,
          storage: diskStorage,
          bridge,
          vlanTag: vlanTag ? Number(vlanTag) : undefined,
          firewall,
          isoVolid: kind === "qemu" ? isoVolid || undefined : undefined,
          templateVolid: kind === "lxc" ? templateVolid || undefined : undefined,
          password: kind === "lxc" ? password : undefined,
          ipMode: kind === "lxc" ? ipMode : undefined,
          ipAddress: kind === "lxc" && ipMode === "static" ? ipAddress : undefined,
          gateway: kind === "lxc" && ipMode === "static" ? gateway || undefined : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erstellung fehlgeschlagen");
      setResult({ ok: true, message: `Erfolgreich erstellt mit VMID ${json.vmid}.` });
      setTimeout(() => router.push(kind === "qemu" ? "/vms" : "/containers"), 1500);
    } catch (err) {
      setResult({ ok: false, message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Topbar title="VM / Container erstellen" breadcrumb={["Start", "Erstellen"]} />
      {notConfigured && <NotConfigured message={resError ?? undefined} />}

      <div className="flex-1 p-6">
        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <KindButton active={kind === "qemu"} icon={Server} label="Virtuelle Maschine" onClick={() => setKind("qemu")} />
            <KindButton active={kind === "lxc"} icon={Box} label="Container (LXC)" onClick={() => setKind("lxc")} />
          </div>

          <div className="rounded-2xl border border-white/10 bg-card p-5 space-y-4">
            <Field label="Node">
              <select value={node} onChange={(e) => setSelectedNode(e.target.value)} className={selectClass}>
                {nodes.map((n) => (
                  <option key={n.node} value={n.node}>
                    {n.node}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={kind === "qemu" ? "Name" : "Hostname"}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder={kind === "qemu" ? "web-02" : "app-container"}
                className={inputClass}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="CPU-Kerne">
                <input
                  type="number"
                  min={1}
                  max={64}
                  value={cores}
                  onChange={(e) => setCores(Number(e.target.value))}
                  className={inputClass}
                />
              </Field>
              <Field label="RAM (MB)">
                <input
                  type="number"
                  min={128}
                  step={128}
                  value={memory}
                  onChange={(e) => setMemory(Number(e.target.value))}
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Festplatte (GB)">
                <input
                  type="number"
                  min={1}
                  value={diskGb}
                  onChange={(e) => setDiskGb(Number(e.target.value))}
                  className={inputClass}
                />
              </Field>
              <Field label={kind === "qemu" ? "Disk-Storage" : "Rootfs-Storage"}>
                <select
                  value={diskStorage}
                  onChange={(e) => setSelectedDiskStorage(e.target.value)}
                  className={selectClass}
                >
                  {diskStorages.map((s) => (
                    <option key={s.storage} value={s.storage}>
                      {s.storage}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label={kind === "qemu" ? "ISO-Storage" : "Template-Storage"}>
              <select
                value={mediaStorage}
                onChange={(e) => setSelectedMediaStorage(e.target.value)}
                className={selectClass}
              >
                {mediaStorages.map((s) => (
                  <option key={s.storage} value={s.storage}>
                    {s.storage}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Netzwerk-Bridge">
                <input value={bridge} onChange={(e) => setBridge(e.target.value)} className={inputClass} />
              </Field>
              <Field label="VLAN-Tag (optional)">
                <input
                  type="number"
                  min={1}
                  max={4094}
                  value={vlanTag}
                  onChange={(e) => setVlanTag(e.target.value)}
                  placeholder="z.B. 10"
                  className={inputClass}
                />
              </Field>
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-muted">
              <input
                type="checkbox"
                checked={firewall}
                onChange={(e) => setFirewall(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/[0.03] accent-accent"
              />
              Proxmox-Firewall für diese Netzwerkschnittstelle aktivieren
            </label>

            {kind === "lxc" && (
              <>
                <Field label="IP-Konfiguration">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setIpMode("dhcp")}
                      className={clsx(
                        "rounded-lg border px-3 py-2 text-sm font-medium transition",
                        ipMode === "dhcp"
                          ? "border-accent/50 bg-accent/10 text-white"
                          : "border-white/10 text-muted hover:text-white"
                      )}
                    >
                      DHCP
                    </button>
                    <button
                      type="button"
                      onClick={() => setIpMode("static")}
                      className={clsx(
                        "rounded-lg border px-3 py-2 text-sm font-medium transition",
                        ipMode === "static"
                          ? "border-accent/50 bg-accent/10 text-white"
                          : "border-white/10 text-muted hover:text-white"
                      )}
                    >
                      Statisch
                    </button>
                  </div>
                </Field>

                {ipMode === "static" && (
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="IP-Adresse (CIDR)">
                      <input
                        value={ipAddress}
                        onChange={(e) => setIpAddress(e.target.value)}
                        required
                        placeholder="192.168.1.50/24"
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Gateway">
                      <input
                        value={gateway}
                        onChange={(e) => setGateway(e.target.value)}
                        placeholder="192.168.1.1"
                        className={inputClass}
                      />
                    </Field>
                  </div>
                )}
              </>
            )}

            {kind === "qemu" ? (
              <Field label="ISO-Image (optional)">
                <select value={isoVolid} onChange={(e) => setIsoVolid(e.target.value)} className={selectClass}>
                  <option value="">Kein ISO (Netzwerkboot / vorhandene Disk)</option>
                  {isoOptions.map((i) => (
                    <option key={i.volid} value={i.volid}>
                      {i.volid}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <>
                <Field label="LXC-Template">
                  <select
                    value={templateVolid}
                    onChange={(e) => setTemplateVolid(e.target.value)}
                    required
                    className={selectClass}
                  >
                    <option value="">Template wählen...</option>
                    {templateOptions.map((t) => (
                      <option key={t.volid} value={t.volid}>
                        {t.volid}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Root-Passwort">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={inputClass}
                  />
                </Field>
              </>
            )}
          </div>

          {result && (
            <div
              className={clsx(
                "flex items-center gap-2 rounded-lg px-4 py-3 text-sm",
                result.ok ? "bg-online/10 text-online" : "bg-offline/10 text-offline"
              )}
            >
              {result.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {result.message}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || notConfigured || !node}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {kind === "qemu" ? "VM erstellen" : "Container erstellen"}
          </button>
        </form>
      </div>
    </>
  );
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-accent/50";
const selectClass = inputClass;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

function KindButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition",
        active ? "border-accent/50 bg-accent/10 text-white" : "border-white/10 text-muted hover:text-white"
      )}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

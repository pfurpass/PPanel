import { AlertTriangle } from "lucide-react";

export function NotConfigured({ message }: { message?: string }) {
  return (
    <div className="mx-6 mt-6 flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-sm text-amber-200">
      <AlertTriangle size={18} className="mt-0.5 shrink-0" />
      <div>
        <p className="font-semibold">Proxmox ist noch nicht verbunden</p>
        <p className="mt-1 text-amber-200/80">
          {message ?? "Bitte PROXMOX_HOST, PROXMOX_TOKEN_ID und PROXMOX_TOKEN_SECRET in .env.local eintragen und den Server neu starten."}
        </p>
      </div>
    </div>
  );
}

import clsx from "clsx";
import type { ReactNode } from "react";

export function UsageBar({
  label,
  percent,
  detail,
}: {
  label: ReactNode;
  percent: number;
  detail?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px] text-muted">
        <span>{label}</span>
        <span>{detail ?? `${percent}%`}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={clsx(
            "h-full rounded-full transition-all",
            percent > 85 ? "bg-offline" : percent > 60 ? "bg-amber-400" : "bg-accent"
          )}
          style={{ width: `${Math.min(100, Math.max(2, percent))}%` }}
        />
      </div>
    </div>
  );
}

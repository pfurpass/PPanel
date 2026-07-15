import clsx from "clsx";

export function StatusBadge({ status }: { status: string }) {
  const isOnline = status === "running" || status === "online";
  const isPaused = status === "paused" || status === "suspended";

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        isOnline && "bg-online/10 text-online",
        isPaused && "bg-amber-400/10 text-amber-400",
        !isOnline && !isPaused && "bg-offline/10 text-offline"
      )}
    >
      <span
        className={clsx(
          "h-1.5 w-1.5 rounded-full",
          isOnline && "bg-online",
          isPaused && "bg-amber-400",
          !isOnline && !isPaused && "bg-offline"
        )}
      />
      {isOnline ? "Online" : isPaused ? "Pausiert" : "Offline"}
    </span>
  );
}

import type { ReactNode } from "react";

export function Topbar({
  title,
  breadcrumb,
  actions,
}: {
  title: string;
  breadcrumb?: string[];
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 border-b border-white/10 bg-bg/80 px-6 py-5 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div>
        {breadcrumb && breadcrumb.length > 0 && (
          <p className="mb-1 text-xs text-muted">
            {breadcrumb.map((crumb, i) => (
              <span key={crumb}>
                {i > 0 && <span className="mx-1.5">/</span>}
                <span className={i === breadcrumb.length - 1 ? "text-accent" : ""}>{crumb}</span>
              </span>
            ))}
          </p>
        )}
        <h1 className="text-xl font-bold">{title}</h1>
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </header>
  );
}

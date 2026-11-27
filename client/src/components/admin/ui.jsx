// Small shared pieces for the admin pages, so every page looks and behaves the same.
export function PageHeader({ eyebrow, title, subtitle, children }) {
  return (
    <div className="admin-dashboard-heading relative flex flex-wrap items-end justify-between gap-3 overflow-hidden rounded-3xl p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-8 -top-20 h-48 w-48 rounded-full bg-brand/15 blur-3xl" />
      <div className="relative min-w-0">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-1 text-2xl font-bold text-choco sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      <div className="relative flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function Field({ label, hint, children, className = "" }) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1 block font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
    </label>
  );
}

// Tables scroll sideways inside their own box, so the page itself never overflows on a phone.
export function TableWrap({ children }) {
  return <div className="card overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm">{children}</table></div>;
}
export const th = "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500";
export const td = "px-4 py-3 align-middle";
export const tr = "border-t";

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-full border p-1 [scrollbar-width:none]" style={{ borderColor: "var(--line-strong)" }} role="tablist">
      {tabs.map((tab) => (
        <button key={tab.value} type="button" role="tab" aria-selected={value === tab.value} onClick={() => onChange(tab.value)} className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${value === tab.value ? "bg-brand text-white" : "hover:bg-black/5"}`}>{tab.label}</button>
      ))}
    </div>
  );
}

export function Skeleton({ rows = 4 }) {
  return <div className="space-y-2" aria-busy="true">{Array.from({ length: rows }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl" style={{ background: "var(--surface-2)" }} />)}</div>;
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="card flex flex-wrap items-center justify-between gap-3 p-5 text-sm" role="alert">
      <span className="text-red-500">{message}</span>
      {onRetry && <button type="button" className="btn-dark btn-sm" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function Empty({ title, text }) {
  return (
    <div className="card px-4 py-12 text-center">
      <p className="font-semibold">{title}</p>
      {text && <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">{text}</p>}
    </div>
  );
}

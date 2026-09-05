import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900/50 p-5 ${className}`}>
      {children}
    </div>
  );
}

export function StatTile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card className="flex flex-col gap-1">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </Card>
  );
}

const BADGE_COLORS: Record<string, string> = {
  gray: "bg-slate-800 text-slate-300",
  green: "bg-emerald-900/60 text-emerald-300",
  yellow: "bg-amber-900/60 text-amber-300",
  red: "bg-rose-900/60 text-rose-300",
  blue: "bg-sky-900/60 text-sky-300",
};

export function Badge({ children, color = "gray" }: { children: ReactNode; color?: keyof typeof BADGE_COLORS }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${BADGE_COLORS[color]}`}>
      {children}
    </span>
  );
}

export function statusColor(status: string): keyof typeof BADGE_COLORS {
  const map: Record<string, keyof typeof BADGE_COLORS> = {
    PENDING: "gray",
    APPROVED: "blue",
    REJECTED: "red",
    PRODUCED: "green",
    DRAFT: "gray",
    EDITING: "yellow",
    REVIEW: "blue",
    QUALITY_CHECK: "yellow",
    SCHEDULED: "blue",
    UPLOADED: "green",
    FAILED: "red",
    RUNNING: "yellow",
    DONE: "green",
    UPLOADING: "yellow",
  };
  return map[status] ?? "gray";
}

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-bold">{title}</h1>
      {description && <p className="text-sm text-slate-400 mt-1">{description}</p>}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const styles = {
    primary: "bg-sky-600 hover:bg-sky-500 text-white",
    secondary: "bg-slate-800 hover:bg-slate-700 text-slate-100",
    danger: "bg-rose-700 hover:bg-rose-600 text-white",
  };
  return (
    <button
      {...props}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

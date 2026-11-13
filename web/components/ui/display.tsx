import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-line bg-surface p-5 ${className}`}>{children}</section>;
}

type Tone = 'neutral' | 'ok' | 'warn' | 'danger' | 'brand';
const TONES: Record<Tone, string> = {
  neutral: 'bg-paper text-muted border-line',
  ok: 'bg-ok-soft text-ok border-ok/30',
  warn: 'bg-warn-soft text-warn border-warn/30',
  danger: 'bg-danger-soft text-danger border-danger/30',
  brand: 'bg-brand-soft text-brand-dark border-brand/30',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>{children}</span>;
}

/** Status colours for appointment status and doctor availability. */
export function StatusBadge({ status }: { status: string }) {
  const tone: Tone = ({ scheduled: 'brand', completed: 'ok', cancelled: 'neutral', no_show: 'danger', available: 'ok', on_leave: 'warn', unavailable: 'danger' } as Record<string, Tone>)[status] ?? 'neutral';
  return <Badge tone={tone}>{status.replace('_', ' ')}</Badge>;
}

export function Alert({ tone = 'danger', children }: { tone?: 'danger' | 'warn' | 'ok' | 'brand'; children: ReactNode }) {
  return <div role={tone === 'danger' ? 'alert' : 'status'} className={`rounded-md border px-4 py-3 text-sm ${TONES[tone]}`}>{children}</div>;
}

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg role="status" aria-label="Loading" width={size} height={size} viewBox="0 0 24 24" className="animate-spin text-current">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return <div className="flex items-center gap-2 py-8 text-sm text-muted"><Spinner /> {label}</div>;
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-10 text-center">
      <p className="font-display text-lg">{title}</p>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
    </div>
  );
}

/** Scroll-safe table shell. Use <thead>/<tbody> with the exported th/td class names. */
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}
export const th = 'border-b border-line bg-paper px-3 py-2 font-medium text-muted whitespace-nowrap';
export const td = 'border-b border-line/60 px-3 py-2 align-top';

/** Plain CSS horizontal bars (no chart library). */
export function BarList({ items, empty }: { items: { label: string; value: number }[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.label} className="grid grid-cols-[8.5rem_1fr_2rem] items-center gap-2 text-sm">
          <span className="truncate">{i.label}</span>
          <span className="h-3 rounded-sm bg-brand-soft">
            <span className="block h-3 rounded-sm bg-brand" style={{ width: `${(i.value / max) * 100}%` }} />
          </span>
          <span className="text-right tabular-nums text-muted">{i.value}</span>
        </li>
      ))}
    </ul>
  );
}

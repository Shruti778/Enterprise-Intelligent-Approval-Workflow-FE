import { ReactNode } from 'react';

const ACCENTS = {
  slate: 'bg-slate-100 text-slate-600',
  blue: 'bg-brand-50 text-brand-600',
  amber: 'bg-amber-50 text-amber-600',
  green: 'bg-emerald-50 text-emerald-600',
  red: 'bg-rose-50 text-rose-600',
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = 'slate',
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  accent?: keyof typeof ACCENTS;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
          {hint ? <p className="mt-1 text-2xs text-slate-400">{hint}</p> : null}
        </div>
        {icon ? (
          <span className={`grid h-9 w-9 place-items-center rounded-lg ${ACCENTS[accent]}`}>
            {icon}
          </span>
        ) : null}
      </div>
    </div>
  );
}

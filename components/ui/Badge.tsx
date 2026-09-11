import { ReactNode } from 'react';
import type { RequestStatus, RiskLevel, StepStatus } from '@/types';

const TONES = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-rose-50 text-rose-700 ring-rose-200',
  blue: 'bg-brand-50 text-brand-700 ring-brand-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
} as const;

export type Tone = keyof typeof TONES;

export function Badge({
  children,
  tone = 'slate',
  className = '',
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide ring-1 ring-inset ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

const REQUEST_STATUS_TONE: Record<RequestStatus, Tone> = {
  DRAFT: 'slate',
  SUBMITTED: 'blue',
  IN_REVIEW: 'amber',
  APPROVED: 'green',
  REJECTED: 'red',
  COMPLETED: 'green',
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return <Badge tone={REQUEST_STATUS_TONE[status] ?? 'slate'}>{status.replace('_', ' ')}</Badge>;
}

const RISK_TONE: Record<RiskLevel, Tone> = { LOW: 'green', MEDIUM: 'amber', HIGH: 'red' };

export function RiskBadge({ level, score }: { level?: RiskLevel | null; score?: number | null }) {
  if (!level) return <span className="text-xs text-slate-400">Not assessed</span>;
  return (
    <Badge tone={RISK_TONE[level]}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {level}
      {typeof score === 'number' ? <span className="font-mono normal-case">{score}</span> : null}
    </Badge>
  );
}

const STEP_TONE: Record<StepStatus, Tone> = {
  WAITING: 'slate',
  PENDING: 'amber',
  APPROVED: 'green',
  REJECTED: 'red',
  SKIPPED: 'slate',
};

export function StepBadge({ status }: { status: StepStatus }) {
  return <Badge tone={STEP_TONE[status]}>{status}</Badge>;
}

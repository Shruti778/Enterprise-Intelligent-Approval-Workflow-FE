import type { StepStatus, WorkflowStep } from '@/types';
import { formatDateTime } from '@/lib/format';

interface TimelineStep {
  id?: number;
  name: string;
  approverRole: string;
  approvalMode: string;
  status: StepStatus;
  stepOrder: number;
  completedAt?: string | null;
  approver?: { name: string } | null;
  actions?: Array<{ id: number; action: string; comment: string | null; createdAt: string; actor: { name: string } | null }>;
}

const MARKER: Record<StepStatus, { ring: string; dot: string; glyph: string }> = {
  APPROVED: { ring: 'border-emerald-500 bg-emerald-500', dot: 'text-white', glyph: '✓' },
  REJECTED: { ring: 'border-rose-500 bg-rose-500', dot: 'text-white', glyph: '✕' },
  PENDING: { ring: 'border-amber-500 bg-amber-500', dot: 'text-white', glyph: '●' },
  WAITING: { ring: 'border-slate-300 bg-white', dot: 'text-slate-300', glyph: '○' },
  SKIPPED: { ring: 'border-slate-200 bg-slate-100', dot: 'text-slate-400', glyph: '–' },
};

const LABEL: Record<StepStatus, string> = {
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PENDING: 'Pending',
  WAITING: 'Waiting',
  SKIPPED: 'Skipped',
};

/** Groups steps by step_order so a parallel stage renders as one row. */
function groupByStage<T extends { stepOrder: number }>(steps: T[]): T[][] {
  const stages = new Map<number, T[]>();
  steps.forEach((step) => {
    const bucket = stages.get(step.stepOrder) ?? [];
    bucket.push(step);
    stages.set(step.stepOrder, bucket);
  });
  return Array.from(stages.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, value]) => value);
}

export function WorkflowTimeline({
  steps,
  submittedAt,
  showComments = true,
}: {
  steps: TimelineStep[];
  submittedAt?: string | null;
  showComments?: boolean;
}) {
  const stages = groupByStage(steps);

  return (
    <ol className="relative space-y-1">
      {submittedAt ? (
        <li className="relative flex gap-3 pb-5">
          <span className="absolute left-[11px] top-6 h-full w-px bg-slate-200" aria-hidden />
          <span className="z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-brand-500 bg-brand-500 text-2xs text-white">
            ✓
          </span>
          <div className="pt-0.5">
            <p className="text-sm font-medium text-slate-900">Submitted</p>
            <p className="text-xs text-slate-500">{formatDateTime(submittedAt)}</p>
          </div>
        </li>
      ) : null}

      {stages.map((stage, stageIndex) => {
        const isParallel = stage.length > 1;
        const isLast = stageIndex === stages.length - 1;

        return (
          <li key={stage[0].stepOrder} className="relative flex gap-3 pb-5 last:pb-0">
            {!isLast ? (
              <span className="absolute left-[11px] top-6 h-full w-px bg-slate-200" aria-hidden />
            ) : null}

            <span
              className={`z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 text-2xs ${
                MARKER[stage[0].status].ring
              } ${MARKER[stage[0].status].dot}`}
            >
              {isParallel ? stage[0].stepOrder : MARKER[stage[0].status].glyph}
            </span>

            <div className="min-w-0 flex-1 pt-0.5">
              {isParallel ? (
                <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wider text-violet-600">
                  Parallel stage &mdash; both approvals required
                </p>
              ) : null}

              <div className={isParallel ? 'grid gap-2 sm:grid-cols-2' : ''}>
                {stage.map((step) => (
                  <div
                    key={step.id ?? `${step.stepOrder}-${step.approverRole}`}
                    className={
                      isParallel
                        ? 'rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2'
                        : ''
                    }
                  >
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <p className="text-sm font-medium text-slate-900">{step.name}</p>
                      <span className="text-2xs font-medium uppercase tracking-wide text-slate-400">
                        {step.approverRole}
                      </span>
                    </div>
                    <p
                      className={`text-xs ${
                        step.status === 'APPROVED'
                          ? 'text-emerald-600'
                          : step.status === 'REJECTED'
                            ? 'text-rose-600'
                            : step.status === 'PENDING'
                              ? 'text-amber-600'
                              : 'text-slate-400'
                      }`}
                    >
                      {LABEL[step.status]}
                      {step.approver ? ` by ${step.approver.name}` : ''}
                      {step.completedAt ? ` · ${formatDateTime(step.completedAt)}` : ''}
                    </p>

                    {showComments && step.actions && step.actions.length > 0 ? (
                      <ul className="mt-2 space-y-1.5">
                        {step.actions.map((action) => (
                          <li
                            key={action.id}
                            className="rounded-md border-l-2 border-slate-200 bg-white px-2.5 py-1.5"
                          >
                            <p className="text-xs text-slate-600">
                              {action.comment || <em className="text-slate-400">No comment</em>}
                            </p>
                            <p className="mt-0.5 text-2xs text-slate-400">
                              {action.actor?.name} · {action.action.toLowerCase()} ·{' '}
                              {formatDateTime(action.createdAt)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Compact arrow view used in previews: MANAGER -> FINANCE -> DIRECTOR */
export function WorkflowPath({
  steps,
}: {
  steps: Array<{ stepOrder: number; approverRole: string; approvalMode: string }>;
}) {
  const stages = groupByStage(steps);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {stages.map((stage, index) => (
        <span key={stage[0].stepOrder} className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium ${
              stage.length > 1
                ? 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {stage.map((step) => step.approverRole).join(' + ')}
          </span>
          {index < stages.length - 1 ? <span className="text-slate-300">&rarr;</span> : null}
        </span>
      ))}
    </div>
  );
}

export type { TimelineStep };

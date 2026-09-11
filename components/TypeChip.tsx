import type { RequestType } from '@/types';

const STYLES: Record<RequestType, string> = {
  LAPTOP: 'bg-sky-50 text-sky-700 ring-sky-200',
  TRAVEL: 'bg-violet-50 text-violet-700 ring-violet-200',
  EXPENSE: 'bg-amber-50 text-amber-700 ring-amber-200',
  LEAVE: 'bg-teal-50 text-teal-700 ring-teal-200',
};

export function TypeChip({ type }: { type: RequestType }) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide ring-1 ring-inset ${STYLES[type]}`}
    >
      {type}
    </span>
  );
}

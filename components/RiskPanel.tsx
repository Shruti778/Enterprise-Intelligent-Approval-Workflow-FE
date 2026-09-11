import type { RiskFactor, RiskLevel } from '@/types';
import { Card, CardBody, CardHeader } from './ui/Card';
import { RiskBadge } from './ui/Badge';
import { humanise } from '@/lib/format';

const METER: Record<RiskLevel, string> = {
  LOW: 'bg-emerald-500',
  MEDIUM: 'bg-amber-500',
  HIGH: 'bg-rose-500',
};

export function RiskMeter({ level, score }: { level: RiskLevel; score: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">
          Risk score
        </span>
        <span className="font-mono text-sm font-semibold text-slate-900">{score}/100</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${METER[level]}`}
          style={{ width: `${Math.max(score, 2)}%` }}
        />
      </div>
      {/* Threshold ticks: 0-30 low, 31-60 medium, 61-100 high */}
      <div className="mt-1 flex justify-between text-2xs text-slate-400">
        <span>0</span>
        <span>30</span>
        <span>60</span>
        <span>100</span>
      </div>
    </div>
  );
}

export function RiskFactorList({ factors }: { factors: RiskFactor[] }) {
  if (factors.length === 0) {
    return (
      <p className="rounded-lg bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700">
        No risk factors triggered - this request matched none of the elevated-risk rules.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {factors.map((factor) => (
        <li
          key={factor.factor}
          className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2.5"
        >
          <div>
            <p className="text-xs font-semibold text-slate-800">{humanise(factor.factor)}</p>
            <p className="mt-0.5 text-xs text-slate-500">{factor.description}</p>
          </div>
          <span className="shrink-0 rounded-md bg-rose-50 px-2 py-1 font-mono text-xs font-semibold text-rose-600">
            +{factor.score}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function RiskPanel({
  level,
  score,
  factors,
  engineVersion,
}: {
  level: RiskLevel;
  score: number;
  factors: RiskFactor[];
  engineVersion?: string;
}) {
  return (
    <Card>
      <CardHeader
        title="Risk assessment"
        subtitle={engineVersion ? `Risk engine v${engineVersion}` : undefined}
        action={<RiskBadge level={level} score={score} />}
      />
      <CardBody className="space-y-4">
        <RiskMeter level={level} score={score} />
        <div>
          <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-slate-500">
            Contributing factors
          </p>
          <RiskFactorList factors={factors} />
        </div>
      </CardBody>
    </Card>
  );
}

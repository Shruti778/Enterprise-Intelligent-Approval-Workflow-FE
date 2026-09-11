'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RequestType, SimulationResult } from '@/types';
import { simulateWorkflow } from '@/services/workflowService';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Label, TextInput } from '@/components/ui/Field';
import { PageHeader } from '@/components/layout/PageHeader';
import { MetadataFields, TYPE_HAS_AMOUNT } from '@/components/RequestTypeFields';
import { RiskFactorList, RiskMeter } from '@/components/RiskPanel';
import { WorkflowPath, WorkflowTimeline } from '@/components/WorkflowTimeline';
import { RiskBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/format';

const TYPES: RequestType[] = ['LAPTOP', 'TRAVEL', 'EXPENSE', 'LEAVE'];

const PRESETS: Array<{
  label: string;
  type: RequestType;
  amount: number;
  metadata: Record<string, any>;
}> = [
  {
    label: 'Laptop · ₹30,000',
    type: 'LAPTOP',
    amount: 30000,
    metadata: { specification: 'Dell Latitude', purpose: 'Development', urgency: 'LOW', newVendor: false },
  },
  {
    label: 'Laptop · ₹1,50,000 · new vendor',
    type: 'LAPTOP',
    amount: 150000,
    metadata: { specification: 'MacBook Pro', purpose: 'Development', urgency: 'HIGH', newVendor: true },
  },
  {
    label: 'Travel · ₹20,000 domestic',
    type: 'TRAVEL',
    amount: 20000,
    metadata: { destination: 'Bengaluru', international: false, purpose: 'Client meeting' },
  },
  {
    label: 'Travel · ₹2,00,000 international',
    type: 'TRAVEL',
    amount: 200000,
    metadata: { destination: 'Berlin', international: true, purpose: 'Summit' },
  },
  {
    label: 'Expense · ₹1,20,000 · no receipt',
    type: 'EXPENSE',
    amount: 120000,
    metadata: { category: 'ENTERTAINMENT', receiptProvided: false, urgency: 'HIGH' },
  },
  {
    label: 'Leave · 30 days',
    type: 'LEAVE',
    amount: 0,
    metadata: { leaveType: 'UNPAID', durationDays: 30, reason: 'Sabbatical' },
  },
];

export default function SimulatorPage() {
  const [type, setType] = useState<RequestType>('LAPTOP');
  const [amount, setAmount] = useState<number | ''>(30000);
  const [metadata, setMetadata] = useState<Record<string, any>>({ urgency: 'LOW', newVendor: false });
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  const run = useCallback(() => {
    setBusy(true);
    simulateWorkflow({ type, amount: Number(amount || 0), metadata })
      .then(setResult)
      .catch(() => setResult(null))
      .finally(() => setBusy(false));
  }, [type, amount, metadata]);

  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(run, 300);
    return () => clearTimeout(debounce.current);
  }, [run]);

  function applyPreset(preset: (typeof PRESETS)[number]) {
    setType(preset.type);
    setAmount(preset.amount);
    setMetadata(preset.metadata);
  }

  return (
    <>
      <PageHeader
        title="Workflow Simulator"
        description="Score a hypothetical request and see the approval chain it would take - nothing is saved."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <Button key={preset.label} variant="secondary" className="text-xs" onClick={() => applyPreset(preset)}>
            {preset.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Hypothetical request" subtitle="Adjust the inputs to see routing change" />
          <CardBody className="space-y-4">
            <div>
              <Label>Request type</Label>
              <div className="grid grid-cols-4 gap-2">
                {TYPES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setType(value);
                      setMetadata({});
                      if (!TYPE_HAS_AMOUNT[value]) setAmount('');
                    }}
                    className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${
                      type === value
                        ? 'border-brand-600 bg-brand-50 text-brand-700 ring-1 ring-brand-600'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            {TYPE_HAS_AMOUNT[type] ? (
              <label className="block max-w-xs">
                <Label hint="INR">Amount</Label>
                <TextInput
                  type="number"
                  min={0}
                  value={amount}
                  onChange={(event) =>
                    setAmount(event.target.value === '' ? '' : Number(event.target.value))
                  }
                />
              </label>
            ) : null}

            <div className="border-t border-slate-200 pt-4">
              <MetadataFields
                type={type}
                values={metadata}
                onChange={(key, value) => setMetadata((current) => ({ ...current, [key]: value }))}
              />
            </div>
          </CardBody>
        </Card>

        <div className={`space-y-6 ${busy ? 'opacity-70 transition-opacity' : 'transition-opacity'}`}>
          <Card>
            <CardHeader
              title="Risk result"
              subtitle={result ? `Risk engine v${result.risk.engineVersion}` : undefined}
              action={result ? <RiskBadge level={result.risk.level} score={result.risk.score} /> : null}
            />
            <CardBody className="space-y-4">
              {result ? (
                <>
                  <RiskMeter level={result.risk.level} score={result.risk.score} />
                  <RiskFactorList factors={result.risk.factors} />
                </>
              ) : (
                <p className="text-xs text-slate-400">No result yet.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Resulting workflow"
              subtitle={result?.workflow.name}
              action={
                result && TYPE_HAS_AMOUNT[type] ? (
                  <span className="text-xs text-slate-500">{formatCurrency(Number(amount || 0))}</span>
                ) : null
              }
            />
            <CardBody className="space-y-4">
              {result ? (
                <>
                  <WorkflowPath steps={result.workflow.steps} />
                  <div className="border-t border-slate-200 pt-4">
                    <WorkflowTimeline
                      steps={result.workflow.steps.map((step) => ({
                        name: step.name,
                        approverRole: step.approverRole,
                        approvalMode: step.approvalMode,
                        stepOrder: step.stepOrder,
                        status: 'WAITING' as const,
                      }))}
                      showComments={false}
                    />
                  </div>
                  {result.workflow.description ? (
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      {result.workflow.description}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-xs text-slate-400">No workflow resolved.</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

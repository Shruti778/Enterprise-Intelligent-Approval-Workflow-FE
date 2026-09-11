'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { RequestType, SimulationResult } from '@/types';
import { createRequest, submitRequest } from '@/services/requestService';
import { simulateWorkflow } from '@/services/workflowService';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Label, TextArea, TextInput } from '@/components/ui/Field';
import { PageHeader } from '@/components/layout/PageHeader';
import { MetadataFields, TYPE_FIELDS, TYPE_HAS_AMOUNT } from '@/components/RequestTypeFields';
import { RiskMeter, RiskFactorList } from '@/components/RiskPanel';
import { WorkflowTimeline } from '@/components/WorkflowTimeline';
import { RiskBadge } from '@/components/ui/Badge';
import { ErrorNote } from '@/components/ui/Spinner';
import { formatCurrency } from '@/lib/format';

const TYPES: Array<{ value: RequestType; label: string; blurb: string }> = [
  { value: 'LAPTOP', label: 'Laptop / Equipment', blurb: 'Hardware and devices' },
  { value: 'TRAVEL', label: 'Travel', blurb: 'Trips and itineraries' },
  { value: 'EXPENSE', label: 'Expense', blurb: 'Reimbursement claims' },
  { value: 'LEAVE', label: 'Leave', blurb: 'Time away from work' },
];

export default function NewRequestPage() {
  const router = useRouter();

  const [type, setType] = useState<RequestType>('LAPTOP');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [metadata, setMetadata] = useState<Record<string, any>>({ urgency: 'LOW', newVendor: false });

  const [preview, setPreview] = useState<SimulationResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const debounce = useRef<ReturnType<typeof setTimeout>>();

  /** The preview calls the same engines the real submission uses. */
  const runPreview = useCallback(() => {
    setPreviewing(true);
    simulateWorkflow({ type, amount: Number(amount || 0), metadata })
      .then(setPreview)
      .catch(() => setPreview(null))
      .finally(() => setPreviewing(false));
  }, [type, amount, metadata]);

  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(runPreview, 350);
    return () => clearTimeout(debounce.current);
  }, [runPreview]);

  function changeType(next: RequestType) {
    setType(next);
    // Metadata keys are type-specific, so start clean with that type's defaults.
    setMetadata(next === 'LAPTOP' ? { urgency: 'LOW', newVendor: false } : {});
    if (!TYPE_HAS_AMOUNT[next]) setAmount('');
  }

  function updateMetadata(key: string, value: any) {
    setMetadata((current) => ({ ...current, [key]: value }));
  }

  function missingFields(): string[] {
    const missing: string[] = [];
    if (title.trim().length < 3) missing.push('Title (at least 3 characters)');
    TYPE_FIELDS[type]
      .filter((field) => field.required)
      .forEach((field) => {
        const value = metadata[field.key];
        if (value === undefined || value === '' || value === null) missing.push(field.label);
      });
    return missing;
  }

  async function handleSave(submitAfter: boolean) {
    const missing = missingFields();
    if (missing.length > 0) {
      setError(`Please complete: ${missing.join(', ')}`);
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const created = await createRequest({
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        amount: Number(amount || 0),
        metadata,
      });
      if (submitAfter) await submitRequest(created.id);
      router.push(`/requests/${created.id}`);
    } catch (err: any) {
      setError(err?.message ?? 'Unable to save the request');
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="New Request"
        description="Fields adapt to the request type. Risk and the resulting approval chain update as you type."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* ------------------------------- form ------------------------------ */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Request type" subtitle="Determines which details are captured" />
            <CardBody>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {TYPES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => changeType(option.value)}
                    className={`rounded-lg border p-3 text-left transition ${
                      type === option.value
                        ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block text-sm font-medium text-slate-900">{option.label}</span>
                    <span className="mt-0.5 block text-2xs text-slate-500">{option.blurb}</span>
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Request details" />
            <CardBody className="space-y-4">
              <label className="block">
                <Label>
                  Title<span className="text-rose-500"> *</span>
                </Label>
                <TextInput
                  value={title}
                  placeholder="Short summary of what you are requesting"
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>

              <label className="block">
                <Label hint="Optional">Description</Label>
                <TextArea
                  rows={3}
                  value={description}
                  placeholder="Context that helps approvers decide"
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>

              {TYPE_HAS_AMOUNT[type] ? (
                <label className="block max-w-xs">
                  <Label hint="INR">Amount</Label>
                  <TextInput
                    type="number"
                    min={0}
                    value={amount}
                    placeholder="0"
                    onChange={(event) =>
                      setAmount(event.target.value === '' ? '' : Number(event.target.value))
                    }
                  />
                </label>
              ) : (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  Leave requests carry no monetary amount &mdash; routing is driven by duration.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={`${TYPES.find((t) => t.value === type)?.label} details`}
              subtitle="Stored in the request's metadata and fed to the risk engine"
            />
            <CardBody>
              <MetadataFields type={type} values={metadata} onChange={updateMetadata} />
            </CardBody>
          </Card>

          {error ? <ErrorNote message={error} /> : null}

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => handleSave(true)} loading={submitting}>
              Submit for approval
            </Button>
            <Button variant="secondary" onClick={() => handleSave(false)} disabled={submitting}>
              Save as draft
            </Button>
          </div>
        </div>

        {/* ----------------------------- preview ----------------------------- */}
        <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Card className={previewing ? 'opacity-70 transition-opacity' : 'transition-opacity'}>
            <CardHeader
              title="Risk preview"
              subtitle="Live output of the risk engine"
              action={preview ? <RiskBadge level={preview.risk.level} score={preview.risk.score} /> : null}
            />
            <CardBody className="space-y-4">
              {preview ? (
                <>
                  <RiskMeter level={preview.risk.level} score={preview.risk.score} />
                  <div>
                    <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-slate-500">
                      Risk reasons
                    </p>
                    <RiskFactorList factors={preview.risk.factors} />
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-400">Fill in the form to see the risk assessment.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Expected approval flow"
              subtitle={preview?.workflow.name ?? 'Selected by the workflow engine'}
            />
            <CardBody>
              {preview ? (
                <WorkflowTimeline
                  steps={preview.workflow.steps.map((step) => ({
                    name: step.name,
                    approverRole: step.approverRole,
                    approvalMode: step.approvalMode,
                    stepOrder: step.stepOrder,
                    status: 'WAITING' as const,
                  }))}
                  showComments={false}
                />
              ) : (
                <p className="text-xs text-slate-400">No workflow resolved yet.</p>
              )}
            </CardBody>
          </Card>

          {TYPE_HAS_AMOUNT[type] && Number(amount || 0) > 0 ? (
            <p className="text-center text-2xs text-slate-400">
              Requesting {formatCurrency(Number(amount))}
            </p>
          ) : null}
        </div>
      </div>
    </>
  );
}

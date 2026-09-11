'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getAuditTrail, getRequest, resubmitRequest, submitRequest } from '@/services/requestService';
import type { AuditEntry, RequestDetail } from '@/types';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RiskBadge, StatusBadge } from '@/components/ui/Badge';
import { TypeChip } from '@/components/TypeChip';
import { Spinner, ErrorNote } from '@/components/ui/Spinner';
import { PageHeader } from '@/components/layout/PageHeader';
import { RiskPanel } from '@/components/RiskPanel';
import { WorkflowTimeline } from '@/components/WorkflowTimeline';
import { MetadataList } from '@/components/RequestTypeFields';
import { formatCurrency, formatDateTime, humanise } from '@/lib/format';
import { useAuth } from '@/lib/auth';

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    return getRequest(params.id)
      .then((data) => {
        setRequest(data);
        return getAuditTrail(params.id).then(setAudit).catch(() => setAudit([]));
      })
      .catch((err) => setError(err.message ?? 'Unable to load the request'))
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(resubmit: boolean) {
    setActing(true);
    setError('');
    try {
      const updated = resubmit ? await resubmitRequest(params.id) : await submitRequest(params.id);
      setRequest(updated);
      await load();
    } catch (err: any) {
      setError(err?.message ?? 'Unable to submit the request');
    } finally {
      setActing(false);
    }
  }

  if (loading) return <Spinner label="Loading request" />;
  if (error && !request) return <ErrorNote message={error} />;
  if (!request) return null;

  const isOwner = request.requester?.id === user?.id;
  const risk = request.risk;

  return (
    <>
      <PageHeader
        title={request.title}
        description={`${request.requestNumber} · raised by ${request.requester?.name ?? 'Unknown'}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => router.push('/requests')}>
              Back
            </Button>
            {isOwner && request.status === 'DRAFT' ? (
              <Button onClick={() => handleSubmit(false)} loading={acting}>
                Submit for approval
              </Button>
            ) : null}
            {isOwner && request.status === 'REJECTED' ? (
              <Button onClick={() => handleSubmit(true)} loading={acting}>
                Resubmit
              </Button>
            ) : null}
          </>
        }
      />

      {error ? <div className="mb-4"><ErrorNote message={error} /></div> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Request information"
              action={
                <div className="flex items-center gap-2">
                  <TypeChip type={request.type} />
                  <StatusBadge status={request.status} />
                </div>
              }
            />
            <CardBody className="space-y-5">
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
                <div>
                  <dt className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Request ID</dt>
                  <dd className="mt-0.5 font-mono text-sm font-semibold text-slate-900">{request.requestNumber}</dd>
                </div>
                <div>
                  <dt className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Amount</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-slate-900">{formatCurrency(request.amount)}</dd>
                </div>
                <div>
                  <dt className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Current stage</dt>
                  <dd className="mt-0.5 text-sm text-slate-800">{request.currentStage}</dd>
                </div>
                <div>
                  <dt className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Requester</dt>
                  <dd className="mt-0.5 text-sm text-slate-800">
                    {request.requester?.name}
                    <span className="block text-2xs text-slate-500">
                      {request.requester?.role} · {request.requester?.department}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Created</dt>
                  <dd className="mt-0.5 text-sm text-slate-800">{formatDateTime(request.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Workflow</dt>
                  <dd className="mt-0.5 text-sm text-slate-800">
                    {request.workflow?.definition?.name ?? 'Not started'}
                  </dd>
                </div>
              </dl>

              {request.description ? (
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Description</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700">{request.description}</p>
                </div>
              ) : null}

              <div className="border-t border-slate-200 pt-4">
                <p className="mb-3 text-2xs font-semibold uppercase tracking-wider text-slate-500">
                  {request.type.toLowerCase()} details
                </p>
                <MetadataList metadata={request.metadata} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Approval timeline"
              subtitle={
                request.workflow
                  ? `${request.workflow.definition?.name} · workflow ${request.workflow.status.toLowerCase()}`
                  : 'This request has not been submitted yet'
              }
            />
            <CardBody>
              {request.workflow ? (
                <WorkflowTimeline steps={request.workflow.steps} submittedAt={request.workflow.startedAt} />
              ) : (
                <p className="text-sm text-slate-400">
                  Submit the request to generate its approval workflow.
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          {risk ? (
            <RiskPanel
              level={risk.level}
              score={risk.score}
              factors={risk.factors}
              engineVersion={risk.engineVersion}
            />
          ) : (
            <Card>
              <CardHeader title="Risk assessment" action={<RiskBadge level={null} />} />
              <CardBody>
                <p className="text-xs text-slate-400">
                  Risk is calculated when the request is submitted.
                </p>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Audit trail" subtitle={`${audit.length} events`} />
            <CardBody>
              {audit.length === 0 ? (
                <p className="text-xs text-slate-400">No audit events recorded.</p>
              ) : (
                <ol className="space-y-3">
                  {audit.map((entry) => (
                    <li key={entry.id} className="border-l-2 border-slate-200 pl-3">
                      <p className="text-xs font-medium text-slate-800">{humanise(entry.action)}</p>
                      <p className="text-2xs text-slate-500">
                        {entry.user?.name ?? 'System'} · {formatDateTime(entry.createdAt)}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

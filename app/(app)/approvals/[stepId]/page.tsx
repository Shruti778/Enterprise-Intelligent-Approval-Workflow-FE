'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { approveStep, listPendingApprovals, rejectStep } from '@/services/approvalService';
import { getRequest } from '@/services/requestService';
import type { PendingApproval, RequestDetail } from '@/types';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { TypeChip } from '@/components/TypeChip';
import { Label, TextArea } from '@/components/ui/Field';
import { Spinner, ErrorNote } from '@/components/ui/Spinner';
import { PageHeader } from '@/components/layout/PageHeader';
import { RiskPanel } from '@/components/RiskPanel';
import { WorkflowTimeline } from '@/components/WorkflowTimeline';
import { MetadataList } from '@/components/RequestTypeFields';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { IconCheck, IconClose } from '@/components/ui/Icons';

export default function ApprovalReviewPage() {
  const params = useParams<{ stepId: string }>();
  const router = useRouter();
  const stepId = Number(params.stepId);

  const [approval, setApproval] = useState<PendingApproval | null>(null);
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState<'APPROVED' | 'REJECTED' | null>(null);

  useEffect(() => {
    listPendingApprovals()
      .then(async (items) => {
        const match = items.find((item) => item.stepId === stepId);
        if (!match) {
          setError('This step is no longer waiting on you. It may have been actioned already.');
          return;
        }
        setApproval(match);
        if (match.request) setRequest(await getRequest(match.request.id));
      })
      .catch((err) => setError(err.message ?? 'Unable to load this approval'))
      .finally(() => setLoading(false));
  }, [stepId]);

  async function handleApprove() {
    setError('');
    setActing('APPROVE');
    try {
      const updated = await approveStep(stepId, comment.trim() || undefined);
      setRequest(updated);
      setDone('APPROVED');
    } catch (err: any) {
      setError(err?.message ?? 'Unable to approve this step');
    } finally {
      setActing(null);
    }
  }

  async function handleReject() {
    if (comment.trim().length < 3) {
      setError('A comment is required when rejecting a request.');
      return;
    }
    setError('');
    setActing('REJECT');
    try {
      const updated = await rejectStep(stepId, comment.trim());
      setRequest(updated);
      setDone('REJECTED');
    } catch (err: any) {
      setError(err?.message ?? 'Unable to reject this request');
    } finally {
      setActing(null);
    }
  }

  if (loading) return <Spinner label="Loading approval" />;

  if (error && !request) {
    return (
      <>
        <PageHeader title="Approval review" />
        <ErrorNote message={error} />
        <div className="mt-4">
          <Button variant="secondary" onClick={() => router.push('/approvals')}>
            Back to queue
          </Button>
        </div>
      </>
    );
  }

  if (!request) return null;

  const previousActions = (request.workflow?.steps ?? [])
    .flatMap((step) => step.actions.map((action) => ({ ...action, stepName: step.name })))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <>
      <PageHeader
        title={request.title}
        description={`${request.requestNumber} · ${approval?.stepName ?? 'Approval step'}`}
        actions={
          <Button variant="secondary" onClick={() => router.push('/approvals')}>
            Back to queue
          </Button>
        }
      />

      {done ? (
        <div
          className={`mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-5 py-4 ${
            done === 'APPROVED'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          <div>
            <p className="text-sm font-semibold">
              Step {done.toLowerCase()} &mdash; request is now {request.status.replace('_', ' ')}
            </p>
            <p className="mt-0.5 text-xs opacity-80">
              {request.status === 'IN_REVIEW'
                ? `Now with: ${request.currentStage}`
                : 'The workflow has completed.'}
            </p>
          </div>
          <Button variant="secondary" onClick={() => router.push('/approvals')}>
            Back to queue
          </Button>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Request under review"
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
                  <dt className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Requester</dt>
                  <dd className="mt-0.5 text-sm text-slate-800">
                    {request.requester?.name}
                    <span className="block text-2xs text-slate-500">{request.requester?.department}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Amount</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-slate-900">
                    {formatCurrency(request.amount)}
                  </dd>
                </div>
                <div>
                  <dt className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Submitted</dt>
                  <dd className="mt-0.5 text-sm text-slate-800">
                    {formatDateTime(request.workflow?.startedAt)}
                  </dd>
                </div>
              </dl>

              {request.description ? (
                <p className="text-sm leading-relaxed text-slate-700">{request.description}</p>
              ) : null}

              <div className="border-t border-slate-200 pt-4">
                <p className="mb-3 text-2xs font-semibold uppercase tracking-wider text-slate-500">
                  Request details
                </p>
                <MetadataList metadata={request.metadata} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Approval workflow"
              subtitle={request.workflow?.definition?.name ?? undefined}
              action={
                approval?.approvalMode === 'PARALLEL' ? (
                  <Badge tone="violet">Parallel stage</Badge>
                ) : null
              }
            />
            <CardBody>
              {request.workflow ? (
                <WorkflowTimeline steps={request.workflow.steps} submittedAt={request.workflow.startedAt} />
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Previous approval actions" subtitle={`${previousActions.length} recorded`} />
            <CardBody>
              {previousActions.length === 0 ? (
                <p className="text-xs text-slate-400">No decisions recorded yet - you are the first approver.</p>
              ) : (
                <ul className="space-y-3">
                  {previousActions.map((action) => (
                    <li key={action.id} className="rounded-lg border border-slate-200 px-3 py-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900">
                          {action.stepName}
                          <span className="ml-2 text-2xs font-normal text-slate-400">
                            {action.actor?.name} · {action.actor?.role}
                          </span>
                        </p>
                        <Badge tone={action.action === 'APPROVED' ? 'green' : 'red'}>{action.action}</Badge>
                      </div>
                      {action.comment ? (
                        <p className="mt-1.5 text-xs text-slate-600">&ldquo;{action.comment}&rdquo;</p>
                      ) : null}
                      <p className="mt-1 text-2xs text-slate-400">{formatDateTime(action.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {request.risk ? (
            <RiskPanel
              level={request.risk.level}
              score={request.risk.score}
              factors={request.risk.factors}
              engineVersion={request.risk.engineVersion}
            />
          ) : null}

          {!done ? (
            <Card>
              <CardHeader title="Your decision" subtitle={approval?.stepName} />
              <CardBody className="space-y-4">
                <label className="block">
                  <Label hint="Required to reject">Comment</Label>
                  <TextArea
                    rows={4}
                    value={comment}
                    placeholder="Add context for the requester and later approvers"
                    onChange={(event) => setComment(event.target.value)}
                  />
                </label>

                {error ? <ErrorNote message={error} /> : null}

                <div className="grid grid-cols-2 gap-3">
                  <Button variant="success" onClick={handleApprove} loading={acting === 'APPROVE'}>
                    <IconCheck className="h-4 w-4" />
                    Approve
                  </Button>
                  <Button variant="danger" onClick={handleReject} loading={acting === 'REJECT'}>
                    <IconClose className="h-4 w-4" />
                    Reject
                  </Button>
                </div>

                <p className="text-2xs leading-relaxed text-slate-400">
                  Approving advances the workflow to the next stage. Rejecting ends the workflow and
                  returns the request to the requester.
                </p>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}

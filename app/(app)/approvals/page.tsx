'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listPendingApprovals } from '@/services/approvalService';
import type { PendingApproval } from '@/types';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table';
import { Badge, RiskBadge } from '@/components/ui/Badge';
import { TypeChip } from '@/components/TypeChip';
import { Button } from '@/components/ui/Button';
import { Spinner, ErrorNote } from '@/components/ui/Spinner';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { formatCurrency, formatDate } from '@/lib/format';
import { useAuth } from '@/lib/auth';
import { IconInbox, IconAlert, IconClock } from '@/components/ui/Icons';

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listPendingApprovals()
      .then(setApprovals)
      .catch((err) => setError(err.message ?? 'Unable to load your approval queue'))
      .finally(() => setLoading(false));
  }, []);

  const highRisk = approvals.filter((item) => item.request?.risk?.level === 'HIGH').length;
  const parallel = approvals.filter((item) => item.approvalMode === 'PARALLEL').length;

  if (loading) return <Spinner label="Loading approval queue" />;

  return (
    <>
      <PageHeader
        title="Approval Queue"
        description={`Requests where you hold an actionable ${user?.role} step.`}
      />

      {error ? <div className="mb-4"><ErrorNote message={error} /></div> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Awaiting your decision" value={approvals.length} icon={<IconInbox />} accent="amber" />
        <StatCard label="High risk" value={highRisk} icon={<IconAlert />} accent="red"
          hint="Escalated by the risk engine" />
        <StatCard label="Parallel stages" value={parallel} icon={<IconClock />} accent="blue"
          hint="Another approver is reviewing in parallel" />
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Pending approvals"
          subtitle="Only steps addressed to your role appear here - the backend enforces this."
        />
        <Table>
          <thead className="bg-slate-50">
            <tr>
              <Th>Request</Th>
              <Th>Requester</Th>
              <Th>Type</Th>
              <Th className="text-right">Amount</Th>
              <Th>Risk</Th>
              <Th>Current Stage</Th>
              <Th>Created At</Th>
              <Th>Action</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {approvals.length === 0 ? (
              <EmptyRow colSpan={8} message="Nothing is waiting on you right now." />
            ) : (
              approvals.map((item) => (
                <tr key={item.stepId} className="transition hover:bg-slate-50">
                  <Td>
                    <span className="block font-mono text-xs font-semibold text-slate-700">
                      {item.request?.requestNumber}
                    </span>
                    <span className="block max-w-[14rem] truncate text-xs text-slate-500">
                      {item.request?.title}
                    </span>
                  </Td>
                  <Td className="text-xs">
                    <span className="block font-medium text-slate-800">{item.request?.requester?.name}</span>
                    <span className="block text-slate-400">{item.request?.requester?.department}</span>
                  </Td>
                  <Td>{item.request ? <TypeChip type={item.request.type} /> : null}</Td>
                  <Td className="text-right font-mono text-xs">
                    {formatCurrency(item.request?.amount ?? 0)}
                  </Td>
                  <Td>
                    <RiskBadge level={item.request?.risk?.level} score={item.request?.risk?.score} />
                  </Td>
                  <Td>
                    <span className="block text-xs font-medium text-slate-700">{item.stepName}</span>
                    {item.approvalMode === 'PARALLEL' ? (
                      <Badge tone="violet" className="mt-1">Parallel</Badge>
                    ) : null}
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-slate-500">
                    {formatDate(item.request?.createdAt)}
                  </Td>
                  <Td>
                    <Link href={`/approvals/${item.stepId}`}>
                      <Button className="px-3 py-1.5 text-xs">Review</Button>
                    </Link>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </>
  );
}

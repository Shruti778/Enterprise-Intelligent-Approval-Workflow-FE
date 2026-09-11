'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { getStats, listRequests } from '@/services/requestService';
import { listPendingApprovals } from '@/services/approvalService';
import type { PendingApproval, RequestStats, RequestSummary } from '@/types';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table';
import { RiskBadge, StatusBadge } from '@/components/ui/Badge';
import { TypeChip } from '@/components/TypeChip';
import { Button } from '@/components/ui/Button';
import { Spinner, ErrorNote } from '@/components/ui/Spinner';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatCurrency, formatDate } from '@/lib/format';
import { IconDocument, IconClock, IconCheck, IconClose, IconInbox, IconPlus } from '@/components/ui/Icons';

export default function DashboardPage() {
  const { user, isApprover } = useAuth();
  const [stats, setStats] = useState<RequestStats | null>(null);
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      getStats(),
      listRequests({ mine: true }),
      isApprover ? listPendingApprovals() : Promise.resolve([] as PendingApproval[]),
    ])
      .then(([statsData, requestData, approvalData]) => {
        setStats(statsData);
        setRequests(requestData);
        setApprovals(approvalData);
      })
      .catch((err) => setError(err.message ?? 'Unable to load the dashboard'))
      .finally(() => setLoading(false));
  }, [isApprover]);

  if (loading) return <Spinner label="Loading dashboard" />;
  if (error) return <ErrorNote message={error} />;

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0]}`}
        description="Your requests, their risk profile and where each one sits in its approval chain."
        actions={
          <Link href="/requests/new">
            <Button>
              <IconPlus className="h-4 w-4" />
              New request
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Requests" value={stats?.total ?? 0} icon={<IconDocument />} accent="blue"
          hint={stats?.draft ? `${stats.draft} still in draft` : undefined} />
        <StatCard label="Pending Requests" value={stats?.pending ?? 0} icon={<IconClock />} accent="amber"
          hint="Awaiting an approval decision" />
        <StatCard label="Approved Requests" value={stats?.approved ?? 0} icon={<IconCheck />} accent="green" />
        <StatCard label="Rejected Requests" value={stats?.rejected ?? 0} icon={<IconClose />} accent="red" />
      </div>

      {isApprover && approvals.length > 0 ? (
        <Card className="mt-6 border-amber-200 bg-amber-50/40">
          <CardHeader
            title={`${approvals.length} request${approvals.length === 1 ? '' : 's'} waiting on you`}
            subtitle="You hold an actionable approval step on these requests."
            action={
              <Link href="/approvals">
                <Button variant="secondary">
                  <IconInbox className="h-4 w-4" />
                  Review queue
                </Button>
              </Link>
            }
          />
        </Card>
      ) : null}

      <Card className="mt-6">
        <CardHeader
          title="Recent requests"
          subtitle="Your most recent submissions"
          action={
            <Link href="/requests" className="text-xs font-medium text-brand-600 hover:text-brand-700">
              View all &rarr;
            </Link>
          }
        />
        <Table>
          <thead className="bg-slate-50">
            <tr>
              <Th>Request ID</Th>
              <Th>Type</Th>
              <Th>Title</Th>
              <Th className="text-right">Amount</Th>
              <Th>Risk</Th>
              <Th>Status</Th>
              <Th>Current Stage</Th>
              <Th>Created</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.length === 0 ? (
              <EmptyRow colSpan={8} message="No requests yet. Create your first request to get started." />
            ) : (
              requests.slice(0, 8).map((request) => (
                <tr key={request.id} className="transition hover:bg-slate-50">
                  <Td>
                    <Link
                      href={`/requests/${request.id}`}
                      className="font-mono text-xs font-semibold text-brand-600 hover:text-brand-700"
                    >
                      {request.requestNumber}
                    </Link>
                  </Td>
                  <Td><TypeChip type={request.type} /></Td>
                  <Td className="max-w-[18rem] truncate font-medium text-slate-900">{request.title}</Td>
                  <Td className="text-right font-mono text-xs">{formatCurrency(request.amount)}</Td>
                  <Td><RiskBadge level={request.risk?.level} score={request.risk?.score} /></Td>
                  <Td><StatusBadge status={request.status} /></Td>
                  <Td className="text-xs text-slate-500">{request.currentStage}</Td>
                  <Td className="whitespace-nowrap text-xs text-slate-500">{formatDate(request.createdAt)}</Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
